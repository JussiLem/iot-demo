import { javascript } from "projen";
import { monorepo } from "@aws/pdk";
const project = new monorepo.MonorepoTsProject({
  authorEmail: "jussi.lem@gmail.com",
  authorName: "Jussi Lemmetyinen",
  defaultReleaseBranch: "master",
  description: "Demo for iot",
  devDeps: ["@aws/pdk"],
  name: "iot-demo",
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,
});
project.synth();