/**
 * 迁移指南: https://v3.cn.vuejs.org/guide/migration/slots-unification.html
 */

const $ = require("gogocode");
const _ = require("lodash");

async function slotsUnification(ast) {
  if (ast.find("<template></template>").length < 1) {
    return ast;
  }

  ast
    .find("<template></template>")
    .find(['<$_$ slot="$_$">', '<$_$ slot-scope="$_$">'])
    .each((cast) => {
      let attrList = cast.attr("content.attributes") || [];
      let newAttrList = attrList.filter(
        (e) => e.key.content !== "slot" && e.key.content !== "slot-scope"
      );
      const slotAttr = attrList.find(
        (attr) => attr.key && attr.key.content == "slot"
      );
      const slotValue = _.get(slotAttr, "value.content");
      const slotScopeAttr = attrList.find(
        (attr) => attr.key && attr.key.content == "slot-scope"
      );
      const slotScopeValue = _.get(slotScopeAttr, "value.content");

      let newAstTag = undefined;
      if (slotValue && slotScopeValue) {
        newAstTag = $(
          `<template v-slot:${slotValue}="${slotScopeValue}">\n<holder/>\n</template>`,
          { parseOptions: { language: "html" } }
        );
      } else if (slotValue) {
        newAstTag = $(
          `<template v-slot:${slotValue}>\n<holder/>\n</template>`,
          { parseOptions: { language: "html" } }
        );
      } else if (slotScopeValue) {
        newAstTag = $(
          `<template v-slot="${slotScopeValue}">\n<holder/>\n</template>`,
          { parseOptions: { language: "html" } }
        );
      } else {
        return;
      }

      newAstTag = newAstTag.find("<template></template>");

      if (cast.attr("content.name") === "template") {
        // 如果直接就是 template 标签那么修改其属性即可
        newAttrList = [
          ...newAttrList,
          ...(newAstTag.attr("content.attributes") || []),
        ];
        cast.attr("content.attributes", newAttrList);
      } else {
        // 如果是其它标签那么需要其插入 template 标签，把原来标签中 slot 相关的属性滤掉
        cast.attr("content.attributes", newAttrList);
        newAstTag.replace("<holder/>", cast);
        cast.replaceBy(newAstTag);
      }
    });

  return ast;
}

module.exports = slotsUnification;
