import { pipelines, SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IotPlatformStage } from "./iot-platform-stage";

export class CICDPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.gitHub(
          "JussiLem/iot-demo",
          "main",
          {
            authentication: SecretValue.secretsManager("GITHUB_TOKEN"),
          },
        ),
        commands: ["npm install", "npx projen synth"],
      }),
    });

    pipeline.addStage(new IotPlatformStage(this, "dev", props));
  }
}
