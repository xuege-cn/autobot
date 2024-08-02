const babel = require("@babel/core");

/**
 * 🚀 功能：解构 -> Vue3 会丢失响应性
 * 作用：const {displayScene, status} = this -> const displayScene = this.displayScene; const status = this.status;
 */
function parseObjectPattern(newProgram, t, identifiers, exportPath) {
  babel.traverse(newProgram, {
    VariableDeclarator(path) {
      const node = path.node;

      // 检查是否是对象解构模式
      if (t.isObjectPattern(node.id)) {
        const declarations = path?.parentPath?.node?.declarations || [];
        declarations.forEach((declarator, index) => {
          if (
            t.isVariableDeclarator(declarator) &&
            t.isObjectPattern(declarator.id) &&
            t.isThisExpression(declarator.init)
          ) {
            const properties = declarator.id.properties;
            const newDeclarations = properties.map((prop) =>
              t.variableDeclaration("const", [
                t.variableDeclarator(
                  t.identifier(prop.key.name),
                  t.memberExpression(
                    t.thisExpression(),
                    t.identifier(prop.key.name)
                  )
                ),
              ])
            );

            // 替换原来的解构赋值
            path.parentPath.replaceWithMultiple(newDeclarations);
            // path.get(`declarations.${index}`).remove();
          }
        });
      }
    },
  });
}

module.exports = parseObjectPattern;
