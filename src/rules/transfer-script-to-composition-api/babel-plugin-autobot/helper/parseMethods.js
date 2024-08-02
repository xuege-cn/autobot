function parseMethods(t, prop) {
  const methodsIdentifiers = [];
  const methodsStatements = [];

  if (t.isObjectProperty(prop)) {
    if (t.isIdentifier(prop.key, { name: "methods" })) {
      const properties = prop?.value?.properties || [];

      for (let i = 0; i < properties.length; i += 1) {
        const property = properties[i];

        /**
         * 🎬 场景：onSearch () {}
         */
        if (t.isObjectMethod(property)) {
          const key = property.key;

          const MethodsStatement = t.functionDeclaration(
            t.identifier(key.name),
            property.params,
            property.body,
            undefined,
            property.async
          );

          methodsIdentifiers.push(key.name);
          methodsStatements.push(MethodsStatement);

          continue;
        }

        /**
         * 🎬 场景：onSearch: ...
         */
        if (t.isObjectProperty(property)) {
          const key = property.key;
          const value = property.value;

          /**
           * 🎬 场景：onSearch: () => {}
           */
          if (t.isArrowFunctionExpression(value)) {
            const body = value.body;

            const MethodsStatement = t.functionDeclaration(
              t.identifier(key.name),
              value.params,
              body,
              undefined,
              value.async
            );

            methodsIdentifiers.push(key.name);
            methodsStatements.push(MethodsStatement);
          }

          /**
           * 🎬 场景：onSearch: () => {} | onSearch: function onSearch () {}
           */
          if (t.isFunctionExpression(value)) {
            const MethodsStatement = t.functionDeclaration(
              t.identifier(key.name),
              value.params,
              value.body,
              undefined,
              value.async
            );

            methodsIdentifiers.push(key.name);
            methodsStatements.push(MethodsStatement);
          }

          /**
           * 🎬 场景：onSearch: debounce(...)
           */
          if (t.isCallExpression(value)) {
            const MethodsStatement = t.variableDeclaration("const", [
              t.variableDeclarator(t.identifier(key.name), value),
            ]);
            methodsIdentifiers.push(key.name);
            methodsStatements.push(MethodsStatement);
          }
        }

        /**
         * 🎬 场景：{ ...methods }
         */
        if (t.isSpreadElement(property)) {
          const argument = property.argument;
          const values = argument.elements;

          values.forEach((value) => {
            const key = value.id;

            const MethodsStatement = t.functionDeclaration(
              t.identifier(key.name),
              value.params,
              value.body,
              undefined,
              value.async
            );

            methodsIdentifiers.push(key.name);
            methodsStatements.push(MethodsStatement);
          });
        }
      }
    }
  }

  return {
    methodsIdentifiers,
    methodsStatements,
  };
}

module.exports = parseMethods;
