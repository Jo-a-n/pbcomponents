export function componentNameToFileName(componentName: string) {
  const generatedMatch = componentName.match(/^Div(\d{3})$/)
  if (generatedMatch) {
    return `div-${generatedMatch[1]}`
  }

  return componentName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}
