const parseData = require("./helper/parseData");
const parseComputed = require("./helper/parseComputed");
const parseMethods = require("./helper/parseMethods");
const parseProps = require("./helper/parseProps");
const parseWatch = require("./helper/parseWatch");
const { vue2Hooks, parseHooks } = require("./helper/parseHooks");
const parseComponents = require("./helper/parseComponents");
const parseThis = require("./helper/parseThis");
const parseObjectPattern = require("./helper/parseObjectPattern");
const { methodMap } = require("./helper/contants");
const fsExtra = require("fs-extra");
const nodePath = require("path");

module.exports = function ({ types: t }) {
  const isNamedProperty = (prop, name) => t.isIdentifier(prop.key, { name });

  return {
    visitor: {
      ExportDefaultDeclaration(path) {
        const node = path.node.declaration;

        if (!t.isObjectExpression(node)) return;

        const identifiers = {};
        const statements = [];

        /**
         * 🚀 功能：解释 export default {} 生成 composition API 对应的 Statements
         */
        // 🔧 处理 data
        node.properties.forEach((prop) => {
          if (isNamedProperty(prop, "data")) {
            const { dataReactiveStatements, dataIdentifiers } = parseData(
              t,
              prop
            );
            dataReactiveStatements &&
              statements.push(...dataReactiveStatements);
            if (dataIdentifiers?.length) {
              identifiers.dataIdentifiers = dataIdentifiers;
            }
          }
        });

        // 🔧 处理 props
        node.properties.forEach((prop) => {
          if (isNamedProperty(prop, "props")) {
            const { propsIdentifiers, propsStatement } = parseProps(t, prop);
            propsStatement && statements.push(propsStatement);
            if (propsIdentifiers?.length) {
              identifiers.propsIdentifiers = propsIdentifiers;
            }
          }
        });
        // 🔧 处理 computed
        node.properties.forEach((prop) => {
          if (isNamedProperty(prop, "computed")) {
            const { computedIdentifiers, computedStatements } = parseComputed(
              t,
              prop
            );

            computedStatements && statements.push(...computedStatements);
            if (computedIdentifiers?.length) {
              identifiers.computedIdentifiers = computedIdentifiers;
            }
          }
        });

        // 🔧 处理 methods
        node.properties.forEach((prop) => {
          if (isNamedProperty(prop, "methods")) {
            const { methodsIdentifiers, methodsStatements } = parseMethods(
              t,
              prop
            );

            methodsStatements && statements.push(...methodsStatements);
            if (methodsIdentifiers?.length) {
              identifiers.methodsIdentifiers = methodsIdentifiers;
            }
          }
        });

        // 将函数自动使用 defineExpose 暴露出去：跨模块查询是否暴露太麻烦，直接暴力点，全部方法暴露出去
        // TODO: 如果有变量需要暴露的，需要开发者手动处理
        const methodProperties = [];
        (identifiers.methodsIdentifiers || []).forEach((methodName) => {
          methodProperties.push(
            t.objectProperty(t.identifier(methodName), t.identifier(methodName))
          );
        });
        const defineExposeCall = t.callExpression(
          t.identifier("defineExpose"),
          [t.objectExpression(methodProperties)]
        );
        statements.push(t.expressionStatement(defineExposeCall));

        // 🔧 处理 watchers
        node.properties.forEach((prop) => {
          if (isNamedProperty(prop, "watch")) {
            const { watchesIdentifiers, watchesStatements } = parseWatch(
              t,
              prop,
              identifiers,
              path
            );
            watchesStatements && statements.push(...watchesStatements);
            if (watchesIdentifiers?.length) {
              identifiers.watchesIdentifiers = watchesIdentifiers;
            }
          }
        });

        // 🔧 处理 hooks
        node.properties.forEach((prop) => {
          if (t.isObjectMethod(prop) && vue2Hooks.includes(prop.key.name)) {
            const { hooksIdentifiers, hooksStatements } = parseHooks(t, prop);

            hooksStatements && statements.push(...hooksStatements);
            if (hooksIdentifiers?.length) {
              if (!identifiers.hooksIdentifiers) {
                identifiers.hooksIdentifiers = [];
              }
              identifiers.hooksIdentifiers.push(...hooksIdentifiers);
            }
          }
        });

        // 🔧 处理 components
        node.properties.forEach((prop) => {
          if (isNamedProperty(prop, "components")) {
            // 暂时不做处理，components 在 <script setup> 中 import 即可，不需要额外声明
            const componentNames = parseComponents(t, prop);
          }
        });

        /**
         * 🚀 功能：使用新生成的 Composition API 写法替换原有的 export default {} 语句
         */
        const newProgram = t.program([...statements]);
        path.replaceWith(newProgram);

        /**
         * 🚀 功能：解构 -> Vue3 会丢失响应性
         * 作用：const {displayScene, status} = this -> const displayScene = this.displayScene; const status = this.status;
         */
        parseObjectPattern(newProgram, t, identifiers, path);

        /**
         * 🚀 功能：替换 this
         */
        const [isRefUsed, isGetCurrentInstanceImported] = parseThis(
          newProgram,
          t,
          identifiers,
          path
        );

        /**
         * 🚀 功能：生成 import 语句
         * 解释：根据是否用到 reactive、defineProps 等方法，按需导入
         * 🌰 举个例子：import { reactive, defineProps, computed, watch, onMounted } from 'vue'
         */
        const importSpecifiers = Object.keys(identifiers).reduce(
          (imports, identifierKey) => {
            const methodName = methodMap[identifierKey];

            if (identifiers[identifierKey].length) {
              if (methodName) {
                const importSpecifier = t.importSpecifier(
                  t.identifier(methodName),
                  t.identifier(methodName)
                );
                imports.push(importSpecifier);
              } else {
                if (identifierKey === "hooksIdentifiers") {
                  const importSpecifiers = identifiers.hooksIdentifiers.map(
                    (hooksIdentifier) => {
                      return t.importSpecifier(
                        t.identifier(hooksIdentifier),
                        t.identifier(hooksIdentifier)
                      );
                    }
                  );
                  imports.push(...importSpecifiers);
                }
              }
            }

            return imports;
          },
          []
        );
        // 自动插入 defineExpose 不管是否用到：跨模块查询暴露数据太麻烦了
        importSpecifiers.push(
          t.importSpecifier(
            t.identifier("defineExpose"),
            t.identifier("defineExpose")
          )
        );
        // 插入 import { ref } from 'vue'
        if (isRefUsed) {
          importSpecifiers.push(
            t.importSpecifier(t.identifier("ref"), t.identifier("ref"))
          );
        }
        // 插入 import { getCurrentInstance } from 'vue'
        if (isGetCurrentInstanceImported) {
          importSpecifiers.push(
            t.importSpecifier(
              t.identifier("getCurrentInstance"),
              t.identifier("getCurrentInstance")
            )
          );
        }
        const importDeclaration = t.importDeclaration(
          importSpecifiers,
          t.stringLiteral("vue")
        );
        const body = path.hub.file.ast.program.body;
        body.unshift(importDeclaration);

        fsExtra.writeFileSync(
          nodePath.resolve(__dirname, "./$$autobot__identifiers.json"),
          JSON.stringify(identifiers, null, 2)
        );
      },
    },
  };
};
