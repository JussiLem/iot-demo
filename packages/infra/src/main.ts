import { CdkGraph, FilterPreset, Filters } from "@aws/pdk/cdk-graph";
import { CdkGraphDiagramPlugin } from "@aws/pdk/cdk-graph-plugin-diagram";
import { CdkGraphThreatComposerPlugin } from "@aws/pdk/cdk-graph-plugin-threat-composer";
import { AwsPrototypingChecks, PDKNag } from "@aws/pdk/pdk-nag";
import { CICDPipelineStack } from "./stacks/cicd-pipeline-stack";
import { HostedZoneStack } from "./stacks/hosted-zone-stack";

/**
 * Ensures that a value is defined (not undefined).
 * If the value is undefined, returns the fallback value.
 * This helper function is used to satisfy TypeScript's type checking.
 *
 * @param value The value to check
 * @param fallback The fallback value to use if the value is undefined
 * @returns The value if it's defined, otherwise the fallback
 */
const ensureDefined = <T>(value: T | undefined, fallback: T): T =>
  value !== undefined ? value : fallback;

/* eslint-disable @typescript-eslint/no-floating-promises */
(async () => {
  const app = PDKNag.app({
    nagPacks: [new AwsPrototypingChecks()],
  });

  // Define the AWS account IDs for deployment
  // In AWS Landing Zone Accelerator, these would be in different OUs:
  // - pipelineAccountId: Deployments OU (for CI/CD tooling)
  // - workloadAccountIds: Workloads OU (for both prod and non-prod workloads)

  // Get the default account ID to use as a fallback
  const defaultAccount = ensureDefined(
    process.env.CDK_DEFAULT_ACCOUNT,
    "123456789012",
  );

  // Define the pipeline account ID with fallback to a default account
  const pipelineAccountId = ensureDefined(
    process.env.CDK_PIPELINE_ACCOUNT,
    defaultAccount,
  );

  // Define workload account IDs with fallbacks to the default account
  const workloadAccountIds: Record<string, string> = {
    dev: ensureDefined(process.env.CDK_DEV_ACCOUNT, defaultAccount),
    test: ensureDefined(process.env.CDK_TEST_ACCOUNT, defaultAccount),
    prod: ensureDefined(process.env.CDK_PROD_ACCOUNT, defaultAccount),
  };

  // Define the primary and DR regions for multi-region deployment
  const primaryRegion = "eu-west-1";
  const drRegions = ["eu-central-1", "eu-west-2"];

  // Define the environments for deployment (dev, test, prod)
  const environments = ["dev", "prod"];

  // Create the hosted zone stack first
  // This stack creates the Route53 hosted zone that will be used by the NetworkStack
  // It only needs to be deployed once, before the CICDPipelineStack
  // Deploy to the workload accounts, not the pipeline account
  environments.forEach((env) => {
    // Ensure we have a defined account ID for this environment
    const accountId = ensureDefined(workloadAccountIds[env], defaultAccount);

    new HostedZoneStack(app, `${env}-hosted-zone-stack`, {
      env: {
        account: accountId,
        region: primaryRegion, // Hosted zone is created in the primary region
      },
      stackName: `${env}-hosted-zone-stack`,
      domainName: `iot-${env}.example.com`,
    });
  });

  // Create the CI/CD pipeline stack in the primary region
  // This pipeline only deploys to the primary region for active-active cost savings
  new CICDPipelineStack(app, "iot-platform-cicd", {
    env: {
      account: pipelineAccountId,
      region: primaryRegion, // Pipeline is deployed in the primary region
    },
    // Configure to deploy only to the primary region
    deploymentRegions: [primaryRegion],
    // Configure multi-environment deployment
    deploymentEnvironments: environments,
    // Pass the workload account IDs to the pipeline stack
    workloadAccountIds: workloadAccountIds,
    // GitHub repository configuration
    repository: "JussiLem/iot-demo",
    branch: "main",
    githubTokenSecretName: "GITHUB_TOKEN",
  });

  // Create DR pipeline stacks in each DR region
  // These pipelines don't deploy resources until manually triggered
  drRegions.forEach((drRegion) => {
    new CICDPipelineStack(app, `iot-platform-dr-${drRegion}`, {
      env: {
        account: pipelineAccountId,
        region: drRegion, // Pipeline is deployed in the DR region
      },
      // Configure to deploy only to this DR region
      deploymentRegions: [drRegion],
      // Configure multi-environment deployment
      deploymentEnvironments: environments,
      // Pass the workload account IDs to the pipeline stack
      workloadAccountIds: workloadAccountIds,
      // Set this as a DR pipeline to add manual approval steps
      isDrPipeline: true,
      // GitHub repository configuration
      repository: "JussiLem/iot-demo",
      branch: "main",
      githubTokenSecretName: "GITHUB_TOKEN",
    });
  });

  // Generate architecture diagrams using CDK Graph
  const graph = new CdkGraph(app, {
    plugins: [
      new CdkGraphDiagramPlugin({
        diagrams: [
          {
            name: "iot-platform-overview",
            title: "IoT Platform Architecture Overview",
            theme: "dark",
            // the default `filterPlan: { preset: FilterPreset.COMPACT }` will still apply
          },
          {
            name: "iot-platform-detailed",
            title: "IoT Platform Detailed Architecture",
            theme: "dark",
            filterPlan: {
              preset: FilterPreset.NONE,
            },
          },
          {
            name: "iot-platform-dr",
            title: "IoT Platform Disaster Recovery Architecture",
            ignoreDefaults: true, // default options will not be applied (theme, filterPlan, etc)
          },
        ],
        defaults: {
          filterPlan: {
            preset: FilterPreset.NONE,
            filters: [{ store: Filters.pruneCustomResources() }],
          },
        },
      }),
      new CdkGraphThreatComposerPlugin(),
    ],
  });

  app.synth();
  await graph.report();
})();
