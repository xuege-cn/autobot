/**
 * 迁移指南: https://cn.element-plus.org/en-US/component/date-picker.html#date-formats
 * 转换效果：value-format="timestamp" 转换为 value-format="x"
 */
const $ = require("gogocode");

async function elDatePickerAttrUpdate(ast) {
  if (ast.find("<template></template>").length < 1) {
    return ast;
  }

  ast
    .find("<template></template>")
    .find("<$_$>")
    .each((node) => {
      const nodeName = node.attr("content.name");
      if (nodeName === "el-date-picker") {
        let attrList = Array.isArray(node.attr("content.attributes"))
          ? node.attr("content.attributes")
          : [];
        attrList.forEach((attr, index) => {
          if (
            attr.key.content === "value-format" &&
            attr.value.content === "timestamp"
          ) {
            attr.value.content = "x";
          }
        });
      }
    });

  return ast;
}

module.exports = elDatePickerAttrUpdate;
