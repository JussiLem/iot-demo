import { CdkGraph, FilterPreset, Filters } from "@aws/pdk/cdk-graph";
import { CdkGraphDiagramPlugin } from "@aws/pdk/cdk-graph-plugin-diagram";
import { CdkGraphThreatComposerPlugin } from "@aws/pdk/cdk-graph-plugin-threat-composer";
import { AwsPrototypingChecks, PDKNag } from "@aws/pdk/pdk-nag";
import { CICDPipelineStack } from "./stacks/cicd-pipeline-stack";

/* eslint-disable @typescript-eslint/no-floating-promises */
(async () => {
  const app = PDKNag.app({
    nagPacks: [new AwsPrototypingChecks()],
  });

  // Define the AWS account ID for deployment
  const accountId = process.env.CDK_DEFAULT_ACCOUNT;

  // Define the primary and DR regions for multi-region deployment
  const primaryRegion = "eu-west-1";
  const drRegions = ["eu-central-1", "eu-west-2"];

  // Define the environments for deployment (dev, test, prod)
  const environments = ["dev", "prod"];

  // Create the CI/CD pipeline stack
  new CICDPipelineStack(app, "iot-platform-cicd", {
    env: {
      account: accountId,
      region: primaryRegion, // Pipeline is deployed in the primary region
    },
    // Configure multi-region deployment
    deploymentRegions: [primaryRegion, ...drRegions],
    // Configure multi-environment deployment
    deploymentEnvironments: environments,
    // GitHub repository configuration
    repository: "JussiLem/iot-demo",
    branch: "main",
    githubTokenSecretName: "GITHUB_TOKEN",
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
