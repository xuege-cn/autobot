#!/usr/bin/env node

"use strict";
const chalk = require("chalk");
const program = require("commander");
const pkg = require("./package.json");
// const check = require("./src/utils/check");
const path = require("path");
const transform = require("./src");

(async () => {
  // await check.checkUpdate();
  program
    .option("-s, --src <path>", "source file path")
    .option("-o, --out <path>", "output file path")
    .action((options) => {
      const { src, out } = options;
      if (!src || !out) {
        console.log(chalk.yellow(`warn: -s[--src] or -o[--out] not input `));
        return;
      }

      const PWTH_PWD = process.cwd();
      const sourcePath = path.resolve(PWTH_PWD, src);
      const outputPath = path.resolve(PWTH_PWD, out);

      transform(sourcePath, outputPath)
        .then(() => {
          console.log();
        })
        .catch((e) => {
          console.log(chalk.red("error: " + e.message));
          process.exit(1);
        });
      // transform(
      //   "./service.order.board/index.vue",
      //   "./service.order.board/index_convert.vue"
      // );
    });

  program
    .version(pkg.version)
    .description(
      chalk.green("AutoBot is a tool for automatically upgrade vue2 sfc.")
    );

  //默认展示帮助信息
  if (process.argv && process.argv.length < 3) {
    program.help();
  }

  program.parse(process.argv);
})();
