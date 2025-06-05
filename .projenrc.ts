import { InfrastructureTsProject } from "@aws/pdk/infrastructure";
import { MonorepoTsProject } from "@aws/pdk/monorepo";
import { javascript } from "projen";

const monorepo = new MonorepoTsProject({
  authorEmail: "jussi.lem@gmail.com",
  authorName: "Jussi Lemmetyinen",
  defaultReleaseBranch: "master",
  description: "Demo for iot",
  devDeps: ["@aws/pdk", "madr"],
  name: "iot-demo",
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,
  prettier: true,
  eslint: true,
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
  deps: ["@aws-cdk/aws-kinesisanalytics-flink-alpha"],
});

monorepo.synth();
