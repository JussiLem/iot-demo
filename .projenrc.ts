import { InfrastructureTsProject } from "@aws/pdk/infrastructure";
import { MonorepoTsProject } from "@aws/pdk/monorepo";
import { javascript } from "projen";

const monorepo = new MonorepoTsProject({
  authorEmail: "jussi.lem@gmail.com",
  authorName: "Jussi Lemmetyinen",
  defaultReleaseBranch: "master",
  description: "Demo for iot",
  devDeps: ["@aws/pdk", "madr", "eslint-plugin-functional"],
  name: "iot-demo",
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,
  prettier: true,
  eslint: true,
});

monorepo.eslint?.addOverride({
  files: ["packages/**/*.ts"],
  rules: {
    "functional/no-expression-statement": "off",
    "functional/no-conditional-statement": "off",
    "functional/no-try-statement": "off",
    "functional/no-return-void": "off",
    "functional/no-this-expression": "off",
    "functional/no-class": "off",
    "functional/no-let": "error",
  },
});

monorepo.addTask("create-adr", {
  description: "Create a new ADR with the next number in sequence",
  exec: "ts-node ./projenrc/create-adr.ts",
  receiveArgs: true,
});

new InfrastructureTsProject({
  parent: monorepo,
  outdir: "packages/infra",
  name: "infra",
  deps: [
    "@aws-cdk/aws-kinesisanalytics-flink-alpha",
    "@aws-sdk/client-cost-explorer",
    "@aws-sdk/client-cloudwatch",
    "@aws-sdk/client-iot",
    "@aws-sdk/client-eventbridge",
    "@aws-lambda-powertools/logger",
    "@types/aws-lambda",
  ],
});

monorepo.synth();
