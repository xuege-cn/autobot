function parseProps(t, prop) {
  const propsIdentifiers = [];
  let propsStatement = null;

  if (t.isObjectProperty(prop)) {
    if (t.isIdentifier(prop.key, { name: 'props' })) {
      if (t.isObjectExpression(prop.value)) {
        const properties = prop?.value?.properties || [];
        propsIdentifiers.push(...properties.map((p) => p.key.name));
      }

      if (t.isArrayExpression(prop.value)) {
        const properties = prop.value.elements;
        propsIdentifiers.push(...properties.map((p) => p.value));
      }

      propsStatement = t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier('props'), t.callExpression(t.identifier('defineProps'), [prop.value])),
      ]);
    }
  }

  return {
    propsIdentifiers,
    propsStatement,
  };
}

module.exports = parseProps;
