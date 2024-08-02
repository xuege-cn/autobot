const { before } = require("lodash");

const vue2Hooks = [
  "beforeCreate",
  "created",
  "beforeMount",
  "mounted",
  "beforeUpdated",
  "updated",
  "beforeDestroy",
  "destroyed",
];

const vue2HookNameToVue3HookName = {
  beforeMount: "onBeforeMount",
  mounted: "onMounted",
  beforeUpdated: "onBeforeUpdate",
  updated: "onUpdated",
  beforeDestroy: "onBeforeUnmount",
  destroyed: "onUnmounted",
};

const vue2HooksDeprecated = ["beforeCreate", "created"];

function toVue3HookName(name) {
  return "on" + name[0].toUpperCase() + name.substr(1);
}

function parseHooks(t, prop) {
  let hooksIdentifiers = [];
  let hooksStatements = [];
  if (t.isObjectMethod(prop)) {
    const key = prop.key;
    if (vue2HooksDeprecated.includes(key.name)) {
      // 处理 beforeCreate、created 两个生命周期，将其函数名转为驼峰 onCreated，并自动执行
      // hooksIdentifiers.push(key.name);

      const newName = toVue3HookName(key.name);

      // 将 export default {} 中类似 created () {} 的生命周期提取出来作为 onCreated 函数声明
      const ArrowFunctionExpression = t.arrowFunctionExpression(
        prop.params,
        prop.body,
        prop.async
      );
      const HookVariableDeclaration = t.variableDeclaration("const", [
        t.variableDeclarator(t.identifier(newName), ArrowFunctionExpression),
      ]);
      hooksStatements.push(HookVariableDeclaration);

      // 自动执行 onCreated -> prop.params: 参数列表 name, age
      const CallExpression = t.callExpression(
        t.identifier(newName),
        prop.params
      );
      hooksStatements.push(t.expressionStatement(CallExpression));
    } else if (vue2Hooks.includes(key.name)) {
      // 执行其他生命周期函数，将函数名转为驼峰 onMounted，并自动执行 mounted () {} -> onMounted(() => {});
      const newName = vue2HookNameToVue3HookName[key.name];
      hooksIdentifiers.push(newName);
      const ArrowFunctionExpression = t.arrowFunctionExpression(
        prop.params,
        prop.body,
        prop.async
      );
      hooksStatements.push(
        t.expressionStatement(
          t.callExpression(t.identifier(newName), [ArrowFunctionExpression])
        )
      );
    }
  }

  return {
    hooksIdentifiers,
    hooksStatements,
  };
}

module.exports = {
  vue2Hooks,
  parseHooks,
};
