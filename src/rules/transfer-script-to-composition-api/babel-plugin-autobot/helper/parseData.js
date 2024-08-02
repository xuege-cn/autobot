/**
 * parseData 转换 data 得到 const data = reactive({ name: 'Alex' });
 * @param {*} t @babel/types
 * @param {*} prop Property https://astexplorer.net/
 * @returns Statement
 */
function parseData(t, prop) {
  let dataReactiveStatements = [];
  let dataIdentifiers = [];

  /**
   * 🎬 场景：
   *  export default {
        data () {
          return {
            loading: false,
            boardData: [],
            type: 'vehiclePresence',
          }
        },
      };
   */
  if (t.isObjectMethod(prop)) {
    if (t.isIdentifier(prop.key, { name: "data" })) {
      const dataFuncStatements = prop.body.body;
      dataFuncStatements.forEach((statement) => {
        if (t.isReturnStatement(statement)) {
          const argument = statement.argument;
          dataReactiveStatements.push(
            t.variableDeclaration("const", [
              t.variableDeclarator(
                t.identifier("data"),
                t.callExpression(t.identifier("reactive"), [argument])
              ),
            ])
          );

          const properties = argument?.properties || [];
          properties.forEach((property) => {
            dataIdentifiers.push(property.key.name);
          });
        } else {
          // 不是 ReturnStatement 语句，会被放到最外面，比如 const vm = this;
          dataReactiveStatements.push(statement);
        }
      });

      return {
        dataReactiveStatements,
        dataIdentifiers,
      };
    }
  }

  /**
   * 转换以下格式：
   *  export default {
        data {
          loading: false,
          boardData: [],
          type: 'vehiclePresence',
        },
      };
   */
  if (t.isObjectProperty(prop)) {
    if (
      t.isIdentifier(prop.key, { name: "data" }) &&
      t.isObjectExpression(prop.value)
    ) {
      const dataReactiveStatement = t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier("data"),
          t.callExpression(t.identifier("reactive"), [prop.value])
        ),
      ]);

      const properties = prop?.value?.properties || [];
      properties.forEach((property) => {
        dataIdentifiers.push(property.key.name);
      });

      return {
        dataReactiveStatement,
        dataIdentifiers,
      };
    }
  }

  return {};
}

module.exports = parseData;
