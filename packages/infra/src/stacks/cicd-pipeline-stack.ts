import {
  aws_codepipeline as cp,
  pipelines,
  SecretValue,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { CrossCuttingStage } from "./cross-cutting-stage";
import { DataIdentityStage } from "./data-identity-stage";
import { InsightsStage } from "./insights-stage";
import { IotPlatformStage } from "./iot-platform-stage";
import { StoreStage } from "./store-stage";

/**
 * Properties for the CICDPipelineStack
 */
export interface CICDPipelineStackProps extends StackProps {
  /**
   * The GitHub repository owner and name
   * @default "JussiLem/iot-demo"
   */
  readonly repository?: string;

  /**
   * The GitHub branch to use
   * @default "main"
   */
  readonly branch?: string;

  /**
   * The name of the secret in AWS Secrets Manager that contains the GitHub token
   * @default "GITHUB_TOKEN"
   */
  readonly githubTokenSecretName?: string;

  /**
   * The regions to deploy to
   * @default ["eu-west-1"]
   */
  readonly deploymentRegions?: string[];

  /**
   * The environments to deploy to
   * @default ["dev"]
   */
  readonly deploymentEnvironments?: string[];

  /**
   * The account IDs for workload deployments, keyed by environment name
   * This allows deploying workloads to different accounts than the pipeline account,
   * following the AWS Landing Zone Accelerator OU structure:
   * - Pipeline in Deployments OU
   * - Workloads in Workloads OU
   */
  readonly workloadAccountIds?: Record<string, string>;

  /**
   * Whether this is a DR pipeline
   * If true, a manual approval step will be added before deploying to each region
   * @default false
   */
  readonly isDrPipeline?: boolean;
}

/**
 * A stack that creates a CI/CD pipeline for deploying the IoT platform
 *
 * This stack implements a multi-region, multi-environment deployment pipeline
 * using AWS CDK Pipelines. It organizes deployments into waves to control the
 * order and timing of deployments across regions and environments.
 *
 * Following Domain-Driven Design principles, this stack is responsible for the
 * deployment domain, while the actual IoT platform is encapsulated in the
 * IotPlatformStage.
 *
 * This stack follows the AWS Landing Zone Accelerator OU structure:
 * - The pipeline itself is deployed to the Deployments OU (pipeline account)
 * - The workloads are deployed to the Workloads OU (workload accounts)
 *
 * This separation of concerns improves security and governance by isolating
 * CI/CD tooling from the actual workloads.
 */
export class CICDPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: CICDPipelineStackProps) {
    super(scope, id, props);

    // Set default values
    const repository = props.repository || "JussiLem/iot-demo";
    const branch = props.branch || "main";
    const githubTokenSecretName = props.githubTokenSecretName || "GITHUB_TOKEN";
    const deploymentRegions = props.deploymentRegions || ["eu-west-1"];
    const deploymentEnvironments = props.deploymentEnvironments || ["dev"];

    // Create the pipeline
    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      pipelineType: cp.PipelineType.V2,
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.gitHub(repository, branch, {
          authentication: SecretValue.secretsManager(githubTokenSecretName),
        }),
        commands: ["npm install", "npx projen synth"],
      }),
      // Enable cross-region deployment
      crossAccountKeys: true,
    });

    // Organize deployments by environment and phase
    deploymentEnvironments.forEach((env) => {
      // For each environment (e.g., dev, prod), create multiple waves for different phases
      // This allows for better organization and control of the deployment process

      // Process each region within this environment
      deploymentRegions.forEach((region) => {
        const stageId = `${env}-${region.replace(/-/g, "")}`;

        // Determine the account ID to use for this environment
        // If workloadAccountIds is provided and has an entry for this environment, use it
        // Otherwise, fall back to the pipeline account (this.account)
        const accountId = props.workloadAccountIds?.[env] || this.account;

        // Common stage configuration for all stages in this environment and region
        const stageEnv = {
          account: accountId,
          region: region,
        };

        const stageTags = {
          Environment: env,
          Region: region,
        };

        // Create all the stages that will be used in the waves
        // ===================================================

        // Create the IotPlatformStage for core IoT platform components (Ingest phase)
        const iotStage = new IotPlatformStage(this, stageId, {
          env: stageEnv,
          tags: stageTags,
          primaryRegion: process.env.PRIMARY_REGION ?? "eu-west-1",
        });

        // Create the StoreStage for data lake architecture (Store phase)
        const storeStage = new StoreStage(this, `${stageId}-store`, {
          env: stageEnv,
          tags: stageTags,
          inputStreamName: iotStage.streamingStack.iotDataStream.streamName,
        });

        // Create the InsightsStage for analytics and visualization (Insights phase)
        const insightsStage = new InsightsStage(this, `${stageId}-insights`, {
          env: stageEnv,
          tags: stageTags,
          databaseName: storeStage.dataLakeStack.iotDataDatabase.ref,
        });

        // Create the CrossCuttingStage for monitoring, security, and logging (Cross-cutting concerns)
        const crossCuttingStage = new CrossCuttingStage(
          this,
          `${stageId}-cross-cutting`,
          {
            env: stageEnv,
            tags: stageTags,
          },
        );

        // Create the DataIdentityStage for data analytics and identity components
        const dataIdentityStage = new DataIdentityStage(
          this,
          `${stageId}-data-identity`,
          {
            env: stageEnv,
            tags: stageTags,
          },
        );

        // For DR pipelines, add a single manual approval step before deploying anything
        let drApprovalStep: pipelines.ManualApprovalStep | undefined;
        if (props.isDrPipeline) {
          drApprovalStep = new pipelines.ManualApprovalStep(
            `ApproveDeployment-${env}-${region}`,
            {
              comment: `Approve deployment to DR region ${region} for environment ${env}`,
            },
          );
        }

        // Create waves for different phases of the deployment
        // ==================================================

        // WAVE 1: Core Infrastructure (Ingest & Transform)
        // This wave deploys the core IoT platform components that are essential for data ingestion and transformation
        const coreWave = pipeline.addWave(`${env}-${region}-core-wave`);

        if (drApprovalStep) {
          // For DR pipelines, add the approval step before deploying
          coreWave.addStage(iotStage, { pre: [drApprovalStep] });
        } else {
          // For normal pipelines, deploy without approval
          coreWave.addStage(iotStage);
        }

        // WAVE 2: Data Storage
        // This wave deploys the data lake architecture for storing IoT data
        const storageWave = pipeline.addWave(`${env}-${region}-storage-wave`);

        if (drApprovalStep) {
          storageWave.addStage(storeStage, { pre: [drApprovalStep] });
        } else {
          storageWave.addStage(storeStage);
        }

        // WAVE 3: Analytics & Insights
        // This wave deploys the analytics and visualization components
        const insightsWave = pipeline.addWave(`${env}-${region}-insights-wave`);

        if (drApprovalStep) {
          insightsWave.addStage(insightsStage, { pre: [drApprovalStep] });
        } else {
          insightsWave.addStage(insightsStage);
        }

        // WAVE 4: Cross-Cutting Concerns
        // This wave deploys monitoring, security, and logging components
        const crossCuttingWave = pipeline.addWave(
          `${env}-${region}-cross-cutting-wave`,
        );

        if (drApprovalStep) {
          crossCuttingWave.addStage(crossCuttingStage, {
            pre: [drApprovalStep],
          });
        } else {
          crossCuttingWave.addStage(crossCuttingStage);
        }

        // WAVE 5: Data & Identity (always requires approval)
        // This wave deploys data analytics and identity components, which always require manual approval
        const dataIdentityWave = pipeline.addWave(
          `${env}-${region}-data-identity-wave`,
        );

        // Create a manual approval step for data identity components
        // This is required even for non-DR pipelines as these components are more sensitive
        const dataIdentityApprovalStep = new pipelines.ManualApprovalStep(
          `ApproveDataIdentityDeployment-${env}-${region}`,
          {
            comment: `Approve deployment of Data Analytics and Identity components to ${region} for environment ${env}`,
          },
        );

        // For DR pipelines, we need both the DR approval and the data identity approval
        if (drApprovalStep) {
          dataIdentityWave.addStage(dataIdentityStage, {
            pre: [drApprovalStep, dataIdentityApprovalStep],
          });
        } else {
          dataIdentityWave.addStage(dataIdentityStage, {
            pre: [dataIdentityApprovalStep],
          });
        }
      });
    });
  }
}
