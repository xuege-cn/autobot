const fs = require("fs");
const path = require("path");
const $ = require("gogocode");
const prettier = require("prettier");
const rules = require("./rules/index");
const { listFiles } = require("./utils/file");
const fse = require("fs-extra");
const chalk = require("chalk");

async function transformFile(filePath) {
  const sourceCode = fs.readFileSync(filePath, "utf-8");
  let outAst = $(sourceCode, { parseOptions: { language: "vue" } });

  for (let rule of rules) {
    try {
      outAst = await rule(outAst, filePath);
    } catch (error) {
      console.log(
        chalk.red(`文件转换异常，规则：${rule.name}，文件：${filePath}`)
      );
      console.log(error);
      return ast;
    }
  }

  let generatedCode = outAst.generate();

  generatedCode = generatedCode.replace("<script>", "<script setup>");

  const formattedCode = await prettier.format(generatedCode, {
    trailingComma: "es5",
    tabWidth: 2,
    semi: false,
    singleQuote: true,
    printWidth: 80,
    parser: "vue",
  });

  return formattedCode;
}

const INCLUDE_FILES = [".vue"];

async function transform(sourcePath, outputPath) {
  let fileList = [];
  if (fse.lstatSync(sourcePath).isDirectory()) {
    fileList = listFiles(sourcePath);
  } else {
    const ext = path.extname(outputPath);
    if (!ext) {
      throw new Error("单文件转换，-o 参数必须是文件路径，不能是目录");
    }
    fileList = [sourcePath];
  }

  for (let srcFilePath of fileList) {
    let filePath = srcFilePath.substring(sourcePath.length, srcFilePath.length);
    let outFilePath = filePath ? path.join(outputPath, filePath) : outputPath;

    const ext = path.extname(srcFilePath);
    const outputDir = path.dirname(outFilePath);
    if (!fse.existsSync(outputDir)) {
      fse.mkdirsSync(outputDir);
    }
    if (INCLUDE_FILES.includes(ext)) {
      const formattedCode = await transformFile(srcFilePath);
      fse.writeFileSync(outFilePath, formattedCode);
    } else {
      fse.copyFileSync(srcFilePath, outFilePath);
    }
  }
}

module.exports = transform;
