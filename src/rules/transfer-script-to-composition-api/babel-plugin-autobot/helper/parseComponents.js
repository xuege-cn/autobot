function parseComponents(t, prop) {
  if (t.isObjectProperty(prop)) {
    if (t.isIdentifier(prop.key, { name: 'components' })) {
      const properties = prop?.value?.properties || [];
      return properties.map((property) => {
        return property.value.name;
      });
    }
  }

  return [];
}

module.exports = parseComponents;
