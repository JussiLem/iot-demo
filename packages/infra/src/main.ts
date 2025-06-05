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

  // Use this to deploy your own sandbox environment (assumes your CLI credentials)
  new CICDPipelineStack(app, "infra-dev-sandbox", {
    env: {
      account: "123456789012",
      region: "eu-west-1",
    },
  });

  const graph = new CdkGraph(app, {
    plugins: [
      new CdkGraphDiagramPlugin({
        diagrams: [
          {
            name: "diagram-1",
            title: "Diagram 1 (dark + compact)",
            theme: "dark",
            // the default `filterPlan: { preset: FilterPreset.COMPACT }` will still apply
          },
          {
            name: "diagram-2",
            title: "Diagram 2 (dark + verbose)",
            theme: "dark",
            filterPlan: {
              preset: FilterPreset.NONE,
            },
          },
          {
            name: "diagram-3",
            title: "Diagram 3 (no defaults)",
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
