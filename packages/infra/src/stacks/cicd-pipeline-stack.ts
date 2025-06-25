import { aws_codepipeline as cp, pipelines, SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IotPlatformStage } from "./iot-platform-stage";

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

    // Create waves for each environment
    deploymentEnvironments.forEach((env) => {
      const wave = pipeline.addWave(`${env}-wave`);

      // Add stages for each region within the environment wave
      deploymentRegions.forEach((region) => {
        const stageId = `${env}-${region.replace(/-/g, "")}`;

        wave.addStage(
          new IotPlatformStage(this, stageId, {
            env: {
              account: this.account,
              region: region,
            },
            // Pass environment name as a context value
            // This can be used in the stage to configure environment-specific settings
            tags: {
              Environment: env,
              Region: region,
            },
          }),
        );
      });
    });
  }
}
