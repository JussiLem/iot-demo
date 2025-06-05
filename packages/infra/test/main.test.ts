import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { CICDPipelineStack } from "../src/stacks/cicd-pipeline-stack";

test("Snapshot", () => {
  const app = new App();
  const stack = new CICDPipelineStack(app, "test", {
    env: {
      account: "123456789012",
      region: "eu-west-1",
    },
  });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
