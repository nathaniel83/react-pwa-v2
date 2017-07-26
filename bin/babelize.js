/**
 * @description This file is for registering babel register
 * thus including server file
 */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const babelrc = fs.readFileSync(__dirname + "/../.babelrc");
let config;

try {
  config = JSON.parse(babelrc);
} catch (err) {
  console.error("==> ERROR: Error parsing your .babelrc.");
  console.error(err);
}

config.plugins.push([
  "css-modules-transform", {
    "generateScopedName": "[name]__[local]",
    "extensions": [".css", ".scss", ".sass"]
  }]);

config.cache = false;

require("babel-register")(config);
require("babel-polyfill");


const directories = require("../directories");

/**
 * try to include src to path, but with last priority
 */
try {
  const extraIncludePaths = [ directories.srcDir ];
  process.env.NODE_PATH = `${process.env.NODE_PATH}:${extraIncludePaths.join(":")}`;
  require("module").Module._initPaths();
} catch (ex) {
  // Do nothing
}

const _  = require("lodash");
const appConfig = require(`${directories.srcDir}/config`);

const allowedImageExtensions = _.get(appConfig, "config.images.allowedExtensions", [
  ".jpeg",
  ".jpg",
  ".png",
  ".gif",
  ".svg",
  ".bmp",
]);

_.each(allowedImageExtensions, ext => {
  require.extensions[ext] = function (module, filename) {
    let name = filename.split("/").pop();
    name = name.replace(ext, "");
    const customExt = ext !== ".svg" ? ".webp" : ext;
    module.exports = `${directories.buildPublicPath}images/${name}${customExt}`;
  };
});

if (process.argv.indexOf("--ignore-babelize-require") === -1) {
  if (process.argv.length > 2) {
    const relativePathToFile = process.argv[2];
    const resolvedFile = path.resolve(`${__dirname}/${relativePathToFile}`);
    if (fs.existsSync(resolvedFile)) {
      require(resolvedFile);
    } else {
      console.log(`Cannot resolve "${relativePathToFile}"`);
      console.log(`Make sure the path os relative to ${path.resolve(__dirname)}`);
    }
  }
}
/* eslint-enable */
