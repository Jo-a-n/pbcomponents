import { RAW_EDITOR_GROUPS } from './style-editor-helpers.mjs'
import { tokenizeClassString } from './class-tokens.mjs'

const CATEGORY_GROUPS = RAW_EDITOR_GROUPS.filter((group) => group.pattern != null)

export function tokenMatchesKnownCategory(token) {
  return CATEGORY_GROUPS.some((group) => group.pattern.test(token))
}

export function normalizeStyleValueForSave(value, originalValue) {
  const raw = Array.isArray(value) ? value.join(' ') : value
  const tokens = Array.from(new Set(tokenizeClassString(raw).filter(Boolean)))

  if (!Array.isArray(originalValue) && !Array.isArray(value)) {
    return tokens.join(' ')
  }

  const groupedLines = CATEGORY_GROUPS.map((group) =>
    tokens.filter((token) => group.pattern.test(token)).join(' ')
  ).filter(Boolean)

  const otherTokens = tokens.filter((token) => !tokenMatchesKnownCategory(token)).join(' ')
  if (otherTokens) {
    groupedLines.push(otherTokens)
  }

  return groupedLines.length > 0 ? groupedLines : ['']
}

export function normalizeIncomingStylesForSave(newStyles, currentStyles = {}) {
  return Object.fromEntries(
    Object.entries(newStyles).map(([key, value]) => [
      key,
      normalizeStyleValueForSave(value, currentStyles[key]),
    ])
  )
}
