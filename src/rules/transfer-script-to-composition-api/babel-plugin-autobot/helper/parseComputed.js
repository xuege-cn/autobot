function parseComputed(t, prop) {
  const computedIdentifiers = [];
  const computedStatements = [];

  if (t.isObjectProperty(prop)) {
    if (t.isIdentifier(prop.key, { name: "computed" })) {
      const properties = prop?.value?.properties || [];

      for (let i = 0; i < properties.length; i += 1) {
        const property = properties[i];

        /**
         * 🎬 场景：areaOptions 就是 ObjectMethod
         *  computed: {
         *  areaOptions() {
         *    if (this.salesArea.length) return _.cloneDeep(this.salesArea) || [];
         *      else return _.cloneDeep(this.$store.state.cityCodeList.list) || [];
         *    },
         * },
         */
        if (t.isObjectMethod(property)) {
          const key = property.key;

          const computedStatement = t.variableDeclaration("const", [
            t.variableDeclarator(
              t.identifier(key.name),
              t.callExpression(t.identifier("computed"), [
                t.arrowFunctionExpression([], property.body),
              ])
            ),
          ]);

          computedIdentifiers.push(key.name);
          computedStatements.push(computedStatement);

          continue;
        }

        const key = property.key;
        const value = property.value;
        if (t.isObjectProperty(property)) {
          if (t.isObjectExpression(value)) {
            /**
             * 🎬 场景：areaOptions 就是 ObjectMethod
             *  computed: {
             *  cities: {
             *     get() {
             *       return this.value;
             *     },
             *     set(val) {
             *       this.$emit("input", [...val]);
             *     },
             *   },
             * },
             */
            const computedStatement = t.variableDeclaration("const", [
              t.variableDeclarator(
                t.identifier(key.name),
                t.callExpression(t.identifier("computed"), [value])
              ),
            ]);
            computedIdentifiers.push(key.name);
            computedStatements.push(computedStatement);
          } else {
            /**
             * 🎬 场景：areaOptions 就是 ObjectMethod
             *  computed: {
             *  areaOptions: () => {
             *    if (this.salesArea.length) return _.cloneDeep(this.salesArea) || [];
             *      else return _.cloneDeep(this.$store.state.cityCodeList.list) || [];
             *    },
             * },
             */
            if (t.isArrowFunctionExpression(value)) {
              const computedStatement = t.variableDeclaration("const", [
                t.variableDeclarator(
                  t.identifier(key.name),
                  t.callExpression(t.identifier("computed"), [value])
                ),
              ]);

              computedIdentifiers.push(key.name);
              computedStatements.push(computedStatement);
            }

            if (t.isFunctionExpression(value)) {
              const computedStatement = t.variableDeclaration("const", [
                t.variableDeclarator(
                  t.identifier(key.name),
                  t.callExpression(t.identifier("computed"), [
                    t.arrowFunctionExpression([], value.body),
                  ])
                ),
              ]);

              computedIdentifiers.push(key.name);
              computedStatements.push(computedStatement);
            }
          }
        }
      }

      return {
        computedIdentifiers,
        computedStatements,
      };
    }
  }

  return {};
}

module.exports = parseComputed;
