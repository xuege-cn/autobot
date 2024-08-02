const $ = require("gogocode");
const chalk = require("chalk");
const path = require("path");
const babel = require("@babel/core");
const fs = require("fs");

const DATA_FIELD_REGS = [
  // case v-model="orderInfo"
  (field) => `"${field}"`,
  // case v-model="orderInfo.num"
  (field) => `"${field}.`,
  // case v-if="selectedRegionList[2]"
  (field) => `"${field}[`,
  // v-show="activeTab == statusTab.key"
  (field) => `"${field} `,
  // case v-for="item in orderInfo.list"
  // (field) => ` ${field}.`,
  // case v-for="item in orderList"
  (field) => ` ${field}"`,
  // case v-if="data.boardData && boardData.total"
  (field) => ` ${field}.`,
  // case :ref="`custom-view-popover-${statusTab}`"
  (field) => "${" + field + "}",
  // case :ref="`custom-view-popover-${statusTab.key}`"
  (field) => "${" + field + ".",
  // case {{name}}
  (field) => `{{${field}}}`,
  (field) => `{{ ${field} }}`,
  // case {{user.name}}
  (field) => `{{${field}.`,
  (field) => `{{ ${field}.`,
  // case v-if="!isHasSearch" v-if="!info.isHasSearch"
  (field) => `!${field}"`,
  (field) => `!${field}.`,
];

function transform(scriptCode) {
  return new Promise((resolve, reject) => {
    babel.transform(
      scriptCode,
      {
        plugins: [path.resolve(__dirname, "./babel-plugin-autobot")],
      },
      (err, result) => {
        if (err) {
          console.error(err);
          return reject(error);
        }

        resolve(result.code);
      }
    );
  });
}

async function transferScriptToCompositionApi(ast, sourceFilePath) {
  if (ast.find("<script></script>").length < 1) {
    return ast;
  }

  function composition() {
    return new Promise((resolve) => {
      ast.find("<script></script>").each((cast) => {
        const exportAst = cast.find("export default {}");

        const scriptCode = exportAst.generate();

        console.log(
          chalk.white("开始编译文件 Script，文件地址:"),
          sourceFilePath
        );
        transform(scriptCode).then((newCode) => {
          exportAst.replaceBy(newCode);
          resolve();
        });
      });
    });
  }

  await composition();

  // 解析模版中的 data、props 字段
  ast
    .find("<template></template>")
    .find("<$_$>")
    .each((node) => {
      const filePath = path.resolve(
        __dirname,
        "./babel-plugin-autobot/$$autobot__identifiers.json"
      );
      let identifiers = fs.readFileSync(filePath);
      // fs.unlinkSync(filePath);
      try {
        identifiers = JSON.parse(identifiers);
        const { dataIdentifiers = [], propsIdentifiers = [] } =
          identifiers || {};

        // 替换 template 中对于 reactive data 的引用
        let generatedNode = node.generate();
        for (let field of propsIdentifiers) {
          // const field = key.value;
          DATA_FIELD_REGS.forEach((reg) => {
            generatedNode = generatedNode.replaceAll(
              reg(field),
              reg("props." + field)
            );
          });
        }
        for (let field of dataIdentifiers) {
          // const field = key.value;
          DATA_FIELD_REGS.forEach((reg) => {
            generatedNode = generatedNode.replaceAll(
              reg(field),
              reg("data." + field)
            );
          });
        }

        node.replaceBy(generatedNode);
      } catch (e) {
        console.error("parse identifiers error:", e);
      }
    });

  return ast;
}

module.exports = transferScriptToCompositionApi;
