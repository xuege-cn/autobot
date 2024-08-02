/**
 * 迁移指南:
 * 转换效果：
 */
const $ = require("gogocode");

async function vRef(ast) {
  if (ast.find("<template></template>").length < 1) {
    return ast;
  }

  ast
    .find("<template></template>")
    .find("<$_$>")
    .each((node) => {
      let attrList = Array.isArray(node.attr("content.attributes"))
        ? node.attr("content.attributes")
        : [];
      attrList.forEach((attr, index) => {
        if (attr.key.content === "ref") {
          const refName = attr.value.content;
          attr.key.content = ":ref";
          attr.value.content = `(...args) => linkRef('${refName}', ...args)`;
        } else if (attr.key.content === ":ref") {
          const refName = attr.value.content;
          attr.value.content = `(...args) => linkRef(${refName}, ...args)`;
        }
      });
    });

  return ast;
}

module.exports = vRef;
