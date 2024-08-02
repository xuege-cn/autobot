/**
 * 迁移指南: https://v3-migration.vuejs.org/zh/breaking-changes/listeners-removed.html
 * 转换效果：v-on="$listeners" 转换为 v-bind="$attrs"
 */
const $ = require("gogocode");

async function listenersRemoved(ast) {
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
        if (
          attr.value &&
          attr.key &&
          attr.value.content.indexOf("$listeners") > -1 &&
          attr.key.content == "v-on"
        ) {
          if (
            !attrList.some((attr) => {
              return attr.key && attr.key.content == "v-bind";
            })
          ) {
            attr.key.content = "v-bind";
            attr.value.content = attr.value.content.replace(
              "$listeners",
              "$attrs"
            );
          } else {
            const astCont = $(attr.value.content)
              .replace("...$listeners", "")
              .replace("$listeners", "")
              .generate();
            if (!astCont) {
              attrList.splice(index, 1);
            } else {
              attr.value.content = astCont;
            }
          }
        }
      });
    });

  return ast;
}

module.exports = listenersRemoved;
