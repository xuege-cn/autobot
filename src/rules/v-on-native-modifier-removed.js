/**
 * 迁移指南：https://v3-migration.vuejs.org/zh/breaking-changes/v-on-native-modifier-removed.html
 * 转换效果：@click.native => @click  v-on:click.native => v-on:click
 */

const N = ".native";

async function vOnNativeModifierRemoved(ast) {
  if (ast.find("<template></template>").length < 1) {
    return ast;
  }

  return ast
    .find("<template></template>")
    .find("<$_$>")
    .each(function (ast) {
      const attrs = ast.attr("content.attributes") || [];
      attrs.forEach((attr) => {
        const key = attr.key.content;
        const index = key.indexOf(N);
        if (
          index > -1 &&
          (key.indexOf("@") === 0 || key.indexOf("v-on:") === 0)
        ) {
          attr.key.content = key.replace(N, "");
        }
      });
    })
    .root();
}

module.exports = vOnNativeModifierRemoved;
