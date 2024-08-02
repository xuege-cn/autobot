/**
 * 迁移指南: https://v3-migration.vuejs.org/zh/breaking-changes/v-model.html#%E8%BF%81%E7%A7%BB%E7%AD%96%E7%95%A5
 * 转换效果：
 *    - 删除 .sync 属性
 *    - :visible.sync 替换成 v-model:visible
 *    - v-model="" 替换成 v-model:value=""
 *      - 以前 v-model 默认绑定的是 value，现在默认绑定的是 modelValue
 *      - 避免修改 js 中的 this.value 为 this.modelValue，改模版更方便；还可以省略 $emit(this, 'update:value', val) 的改动
 */

const nativeInput = ["input", "textarea", "select"];

async function vModel(ast) {
  if (ast.find("<template></template>").length < 1) {
    return ast;
  }

  ast
    .find("<template></template>")
    .find("<$_$>")
    .each(function (ast) {
      const attrs = ast.attr("content.attributes") || [];

      attrs.forEach((attr) => {
        // 找到 .sync 属性，比如 :visible.sync
        let key = attr.key.content;
        const syncIndex = key.indexOf(".sync");

        // 说明存在 .sync，比如 :visible.sync
        if (syncIndex > -1) {
          const mIndex = key.indexOf(":");
          if (mIndex > -1) {
            // :visible.sync 替换成 v-model:visible
            attr.key.content = `v-model${key.replace(".sync", "")}`;
          }
        } else {
          // 如果是非原生组件，需要将 v-model 替换成 v-model:value
          const compName = (ast.attr("content.name") || "").toLowerCase();
          const isNotNativeInput = nativeInput.indexOf(compName) < 0;

          if (key === "v-model" && isNotNativeInput) {
            attr.key.content = "v-model:value";
          }
        }

        key = attr.key.content;
        if (!attr.value || !attr.value.content) {
          return;
        }
      });
    });

  return ast;
}

module.exports = vModel;
