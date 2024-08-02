const babel = require("@babel/core");

/**
 * 🚀 功能：替换 this
 */
function parseThis(newProgram, t, identifiers, exportPath) {
  const refNames = new Set();
  let isRefUsed = false;
  let isUseStoreImported = false;
  let isGetCurrentInstanceImported = false;

  babel.traverse(newProgram, {
    VariableDeclaration(path) {
      const declarators = path.get("declarations");
      declarators.forEach((declarator) => {
        const ThisExpression = declarator.get("init");
        if (ThisExpression.isThisExpression()) {
          const Identifier = declarator.get("id");
          const binding = path.scope.getBinding(Identifier.node.name);
          binding?.referencePaths &&
            binding.referencePaths.forEach((refPath) => {
              if (
                refPath.parentPath.isMemberExpression() &&
                refPath.parentPath.get("object") === refPath
              ) {
                console.log(
                  "Found vm:this property access:",
                  refPath.parentPath.toString()
                );
                refPath.parentPath
                  .get("object")
                  .replaceWith(t.thisExpression());
              }
            });
        }

        if (ThisExpression.isThisExpression()) {
          isGetCurrentInstanceImported = replaceVmAs$Vm(
            t,
            ThisExpression,
            exportPath,
            isGetCurrentInstanceImported
          );
        }
      });
    },
  });

  babel.traverse(newProgram, {
    MemberExpression(path) {
      let propertyName = path.node?.property?.name;
      const body = path.hub.file.ast.program.body;

      const ThisExpression = path.get("object");

      /**
       * 🚀 功能：处理大部分 this. 除 this.$refs 外
       */
      if (ThisExpression.isThisExpression()) {
        let thisName = "";
        const {
          dataIdentifiers = [],
          propsIdentifiers = [],
          computedIdentifiers = [],
          methodsIdentifiers = [],
        } = identifiers;
        if (dataIdentifiers?.includes(propertyName)) {
          thisName = "data";
        } else if (propsIdentifiers?.includes(propertyName)) {
          thisName = "props";
        }

        // 替换 data 和 props：this.name => data.name | props.name
        if (thisName) {
          ThisExpression.replaceWith(t.identifier(thisName));
          return;
        }

        // 替换 computed：this.dealerCodeList => dealerCodeList.value
        if (computedIdentifiers?.includes(propertyName)) {
          path.replaceWith(t.identifier(propertyName + ".value"));
          return;
        }

        // 替换 methods：this.handleConfirm => handleConfirm
        if (methodsIdentifiers?.includes(propertyName)) {
          path.replaceWith(t.identifier(propertyName));
          return;
        }

        switch (propertyName) {
          case "$store":
            propertyName = propertyName.slice(1);

            if (!isUseStoreImported) {
              isUseStoreImported = true;
              // 插入 import { useStore } from 'vuex'
              const importDeclaration = t.importDeclaration(
                [
                  t.importSpecifier(
                    t.identifier("useStore"),
                    t.identifier("useStore")
                  ),
                ],
                t.stringLiteral("vuex")
              );

              body.unshift(importDeclaration);

              const StoreViarableDeclaration = createStoreDeclaration(t);
              exportPath.insertBefore(StoreViarableDeclaration);
            }

            path.replaceWith(t.identifier(propertyName));
            break;
          // 暂时不处理 this.$refs
          case "$refs":
            if (!isRefUsed) {
              const declarations = createRefsVariableDeclarations(t);
              exportPath.insertBefore(declarations);
            }
            isRefUsed = true;
            if (t.isStringLiteral(path.parent.property)) {
              const refName = path.parent.property.value;

              // this.$refs['VehicleStatus'] -> refs['VehicleStatus'].value
              // const newExpression = t.memberExpression(
              //   t.memberExpression(t.identifier("refs"), t.identifier(refName)),
              //   t.identifier("value")
              // );
              // path.parentPath.replaceWith(newExpression);
              createRefsMemberExpression(t, path, refName);
            }

            if (t.isIdentifier(path.parent.property)) {
              const refName = path.parent.property.name;

              // this.$refs.VehicleStatus -> refs.VehicleStatus.value
              // const newExpression = t.memberExpression(
              //   t.memberExpression(t.identifier("refs"), t.identifier(refName)),
              //   t.identifier("value")
              // );
              // path.parentPath.replaceWith(newExpression);
              createRefsMemberExpression(t, path, refName);
            }

            if (t.isMemberExpression(path.parent.property)) {
              // const newExpression = t.memberExpression(
              //   t.memberExpression(
              //     t.identifier("refs"),
              //     path.parent.property,
              //     true
              //   ),
              //   t.identifier("value")
              // );
              // path.parentPath.replaceWith(newExpression);
              createRefsMemberExpression(t, path, path.parent.property);
            }

            // if (!refNames.has(refName)) {
            //   refNames.add(refName);
            //   const RefVariableDeclaration = createRefVariableDeclaration(
            //     t,
            //     refName
            //   );
            //   exportPath.insertBefore(RefVariableDeclaration);
            // }

            break;
          default:
            isGetCurrentInstanceImported = replaceVmAs$Vm(
              t,
              ThisExpression,
              exportPath,
              isGetCurrentInstanceImported
            );
            break;
        }
      }
    },
  });

  return [isRefUsed, isGetCurrentInstanceImported];
}

const createRefsMemberExpression = (t, path, refName) => {
  const isOptional = path.parentPath.parentPath.isIfStatement();
  const computed = t.isMemberExpression(refName);
  const memberExpression = isOptional
    ? t.optionalMemberExpression
    : t.memberExpression;
  const newExpression = memberExpression(
    memberExpression(
      t.identifier("refs"),
      // computed ? t.stringLiteral("value") : t.identifier("value"),
      t.identifier("value"),
      false,
      isOptional
    ),
    computed ? refName : t.identifier(refName),
    computed,
    isOptional
  );

  // const newExpression = memberExpression(
  //   t.identifier("refs"),
  //   computed ? refName : t.identifier(refName),
  //   computed,
  //   isOptional
  // );
  path.parentPath.replaceWith(newExpression);
};

const createRefsVariableDeclarations = (t) => {
  const declarations = [];
  // 创建 const refs = ref();
  const refsDeclaration = t.variableDeclaration("const", [
    t.variableDeclarator(
      t.identifier("refs"),
      t.callExpression(t.identifier("ref"), [t.identifier("{}")])
    ),
  ]);

  // 创建 const linkRef = (name, el) => { refs[name] = el; };
  const getRefDeclaration = t.variableDeclaration("const", [
    t.variableDeclarator(
      t.identifier("linkRef"),
      t.arrowFunctionExpression(
        [t.identifier("name"), t.identifier("el")],
        t.blockStatement([
          t.expressionStatement(
            t.assignmentExpression(
              "=",
              t.memberExpression(
                t.memberExpression(t.identifier("refs"), t.identifier("value")),
                t.identifier("name"),
                true // computed property
              ),
              t.identifier("el")
            )
          ),
        ])
      )
    ),
  ]);

  declarations.push(refsDeclaration, getRefDeclaration);
  return declarations;
};

const replaceVmAs$Vm = (
  t,
  ThisExpression,
  exportPath,
  isGetCurrentInstanceImported
) => {
  ThisExpression.replaceWith(t.identifier("$vm"));
  if (!isGetCurrentInstanceImported) {
    isGetCurrentInstanceImported = true;
    const GetCurrentInstanceDeclaration =
      createGetCurrentInstanceVariableDeclarator(t);
    exportPath.insertBefore(GetCurrentInstanceDeclaration);
  }

  return isGetCurrentInstanceImported;
};

// 创建 `const { proxy: $vm } = getCurrentInstance()` 语句
const createGetCurrentInstanceVariableDeclarator = (t) => {
  // 创建一个标识符节点
  const proxyIdentifier = t.identifier("proxy");
  const vmIdentifier = t.identifier("$vm");

  // 创建一个解构赋值模式节点
  const objectPattern = t.objectPattern([
    t.objectProperty(proxyIdentifier, vmIdentifier, false, true),
  ]);

  // 创建一个调用表达式节点
  const getCurrentInstanceIdentifier = t.identifier("getCurrentInstance");
  const callExpression = t.callExpression(getCurrentInstanceIdentifier, []);

  // 创建一个变量声明节点
  const variableDeclarator = t.variableDeclarator(
    objectPattern,
    callExpression
  );
  const variableDeclaration = t.variableDeclaration("const", [
    variableDeclarator,
  ]);

  return variableDeclaration;
};

// 创建 `const store = useStore();` 语句
const createStoreDeclaration = (t) => {
  // 创建 `useStore()` 调用表达式
  const useStoreCall = t.callExpression(t.identifier("useStore"), []);

  // 创建 `store` 变量声明
  const variableDeclarator = t.variableDeclarator(
    t.identifier("store"),
    useStoreCall
  );

  // 创建 `const` 声明语句
  const variableDeclaration = t.variableDeclaration("const", [
    variableDeclarator,
  ]);

  return variableDeclaration;
};

const createRefVariableDeclaration = (t, name) => {
  // 创建 `ref(null)` 调用表达式
  const refCall = t.callExpression(
    t.identifier("ref"),
    [t.nullLiteral()] // `ref` 函数的参数
  );

  // 创建 `VehicleStatus` 变量声明
  const variableDeclarator = t.variableDeclarator(t.identifier(name), refCall);

  // 创建 `const` 声明语句
  const variableDeclaration = t.variableDeclaration("const", [
    variableDeclarator,
  ]);

  return variableDeclaration;
};

module.exports = parseThis;
