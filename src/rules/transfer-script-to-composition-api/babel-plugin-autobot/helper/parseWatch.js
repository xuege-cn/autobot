function generateWatchExpression(identifiers, name, t) {
  // case: searchParams.dealerCodes、searchParams.cityCodes
  let nameCopy = name;
  if (nameCopy && nameCopy.includes(".")) {
    nameCopy = nameCopy.split(".")[0];
  }

  let prefix = "";
  const {
    dataIdentifiers = [],
    propsIdentifiers = [],
    computedIdentifiers = [],
  } = identifiers;

  if (dataIdentifiers.includes(nameCopy)) {
    prefix = "data";
  }
  if (propsIdentifiers.includes(nameCopy)) {
    prefix = "props";
  }
  if (computedIdentifiers.includes(nameCopy)) {
    name = name + ".value";
  }

  return t.arrowFunctionExpression(
    [],
    prefix
      ? t.memberExpression(t.identifier(prefix), t.identifier(name))
      : t.identifier(name)
  );
}

const getIdentifierName = (t, key) => {
  if (t.isIdentifier(key)) {
    return key.name;
  }
  if (t.isStringLiteral(key)) {
    return key.value;
  }
  throw new Error("INVALID_KEY:", key);
};

function processProperties(properties, t, identifiers, path) {
  const watchesIdentifiers = [];
  const watchesStatements = [];
  for (let i = 0; i < properties.length; i += 1) {
    const property = properties[i];

    /**
     * 处理对象方法
     * export default {
     *   watch: {
     *       async isRefresh (val) {}
     *   }
     * }
     */
    if (t.isObjectMethod(property)) {
      const key = property.key;
      const WatcherExpression = generateWatchExpression(
        identifiers,
        getIdentifierName(t, key),
        t
      );
      const WatcherStatement = t.expressionStatement(
        t.callExpression(t.identifier("watch"), [
          WatcherExpression,
          t.arrowFunctionExpression(
            property.params,
            property.body,
            property.async
          ),
        ])
      );

      watchesIdentifiers.push(key.name);
      watchesStatements.push(WatcherStatement);

      continue;
    }

    /**
     * 处理对象属性
     * export default {
     *   watch: {
     *       isRefresh: async (val) => {}
     *   }
     * }
     */
    if (t.isObjectProperty(property)) {
      const key = property.key;
      const value = property.value;

      const WatcherExpression = generateWatchExpression(
        identifiers,
        getIdentifierName(t, key),
        t
      );
      if (t.isArrowFunctionExpression(value)) {
        const WatchesStatement = t.expressionStatement(
          t.callExpression(t.identifier("watch"), [WatcherExpression, value])
        );

        watchesIdentifiers.push(key.name);
        watchesStatements.push(WatchesStatement);
      }

      if (t.isFunctionExpression(value)) {
        const WatchesStatement = t.expressionStatement(
          t.callExpression(t.identifier("watch"), [
            WatcherExpression,
            t.arrowFunctionExpression(value.params, value.body, value.async),
          ])
        );

        watchesIdentifiers.push(key.name);
        watchesStatements.push(WatchesStatement);
      }

      /**
       * 处理对象表达式
       * export default {
       *   watch: {
       *       isRefresh: {
       *          handler(val) {},
       *          deep: true,
       *          immediate: true
       *        },
       *   }
       * }
       */
      if (t.isObjectExpression(value)) {
        let handlerProperty = null;
        const configProperties = value?.properties?.filter((property) => {
          let isHandler = property.key.name === "handler";
          if (isHandler) {
            handlerProperty = property;
          }
          return !isHandler;
        });

        // debugger;
        if (t.isObjectMethod(handlerProperty)) {
          const WatcherExpression = generateWatchExpression(
            identifiers,
            getIdentifierName(t, key),
            t
          );
          const arguments = [
            WatcherExpression,
            t.arrowFunctionExpression(
              handlerProperty.params,
              handlerProperty.body,
              handlerProperty.async
            ),
          ];
          if (configProperties.length) {
            arguments.push(t.objectExpression(configProperties));
          }
          const WatcherStatement = t.expressionStatement(
            t.callExpression(t.identifier("watch"), arguments)
          );
          watchesIdentifiers.push(key.name);
          watchesStatements.push(WatcherStatement);
        }

        // TODO handler 也可能是箭头函数
      }
    }

    /**
     * 处理 `...` 操作符
     * const watchers = { ... };
     * export default {
     *   watch: {
     *       ...watchers,
     *   }
     * }
     */
    if (t.isSpreadElement(property)) {
      const argument = property.argument;

      // 查找 `watchers` 对象的定义
      const binding = path.scope.getBinding(argument.name);
      if (binding) {
        const properties = binding?.path?.node?.init?.properties;
        const transfer = processProperties(properties, t, identifiers, path);
        watchesIdentifiers.push(...transfer.watchesIdentifiers);
        watchesStatements.push(...transfer.watchesStatements);
      }
    }
  }

  return { watchesIdentifiers, watchesStatements };
}

function parseWatch(t, prop, identifiers, path) {
  const watchesIdentifiers = [];
  const watchesStatements = [];

  if (t.isObjectProperty(prop)) {
    if (t.isIdentifier(prop.key, { name: "watch" })) {
      const properties = prop?.value?.properties;
      const transfer = processProperties(properties, t, identifiers, path);
      watchesIdentifiers.push(...transfer.watchesIdentifiers);
      watchesStatements.push(...transfer.watchesStatements);
    }
  }

  return { watchesIdentifiers, watchesStatements };
}

module.exports = parseWatch;
