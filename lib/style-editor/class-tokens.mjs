export function tokenizeClassString(value) {
  const tokens = []
  let currentToken = ''
  let bracketDepth = 0
  let parenDepth = 0

  for (const character of value.trim()) {
    if (/\s/.test(character) && bracketDepth === 0 && parenDepth === 0) {
      if (currentToken) {
        tokens.push(currentToken)
        currentToken = ''
      }
      continue
    }

    currentToken += character

    if (character === '[') {
      bracketDepth += 1
    } else if (character === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1)
    } else if (character === '(') {
      parenDepth += 1
    } else if (character === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
    }
  }

  if (currentToken) {
    tokens.push(currentToken)
  }

  return tokens
}
