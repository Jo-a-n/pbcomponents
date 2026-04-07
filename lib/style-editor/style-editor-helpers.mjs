import tailwindColors from 'tailwindcss/colors'

import {
  decodeTailwindArbitraryValue,
  normalizeBackgroundColorValue,
  normalizeBackgroundOpacityValue,
  splitTopLevelOpacitySuffix,
  unwrapArbitraryValue,
} from './background-color.mjs'
import { tokenizeClassString } from './class-tokens.mjs'

export const PADDING_TOKEN_PATTERN = /^(p|px|py|pl|pr|pt|pb)-.+$/
export const MARGIN_TOKEN_PATTERN = /^(m|mx|my|ml|mr|mt|mb|ms|me)-.+$/
export const RADIUS_TOKEN_PATTERN = /^rounded(?:-(?:tl|tr|br|bl|t|r|b|l))?(?:-.+)?$/
export const LIMITS_TOKEN_PATTERN =
  /^(rounded(?:-(?:tl|tr|br|bl|t|r|b|l))?(?:-.+)?|w-.+|h-.+|min-w-.+|max-w-.+|min-h-.+|max-h-.+|size-.+|basis-.+)$/
export const FLEX_TOKEN_PATTERN =
  /^(flex|inline-flex|grid|inline-grid|flex-(?:row|col|wrap|nowrap|1|auto|initial|none)|grid-cols-.+|grid-rows-.+|col-.+|row-.+|auto-cols-.+|auto-rows-.+|items-.+|justify-.+|content-.+|self-.+|place-(?:items|content|self)-.+|gap(?:-[xy])?-.+|grow(?:-.+)?|shrink(?:-.+)?|order-.+)$/
export const TEXT_TOKEN_PATTERN =
  /^(text-.+|font-.+|leading-.+|tracking-.+|whitespace-.+|break-.+|truncate|line-clamp-.+|uppercase|lowercase|capitalize|normal-case|italic|not-italic|antialiased|subpixel-antialiased|underline|overline|line-through|no-underline|decoration-.+|underline-offset-.+)$/
export const BACKGROUND_TOKEN_PATTERN = /^(bg-(?!clip-padding$).+|from-.+|via-.+|to-.+)$/
export const BORDER_TOKEN_PATTERN =
  /^(border(?:-[trblxy])?(?:-.+)?|divide(?:-[xy])?(?:-.+)?|outline(?:-.+)?)$/
export const EFFECTS_TOKEN_PATTERN =
  /^(ring(?:-[trblxy])?(?:-.+)?|shadow(?:-.+)?|opacity-.+|mix-blend-.+|bg-blend-.+|blur(?:-.+)?|backdrop-.+)$/

export const RAW_EDITOR_GROUPS = [
  {
    key: 'padding',
    label: 'Padding',
    placeholder: 'px-4 py-2',
    pattern: PADDING_TOKEN_PATTERN,
  },
  {
    key: 'margin',
    label: 'Margin',
    placeholder: 'mt-4 mx-auto',
    pattern: MARGIN_TOKEN_PATTERN,
  },
  {
    key: 'limits',
    label: 'Limits & Corners',
    placeholder: 'rounded-xl max-w-sm h-fit',
    pattern: LIMITS_TOKEN_PATTERN,
  },
  {
    key: 'flex',
    label: 'Flex',
    placeholder: 'flex items-center justify-between gap-4',
    pattern: FLEX_TOKEN_PATTERN,
  },
  {
    key: 'text',
    label: 'Text',
    placeholder: 'text-sm font-medium leading-5 text-zinc-700',
    pattern: TEXT_TOKEN_PATTERN,
  },
  {
    key: 'background',
    label: 'Background',
    placeholder: 'bg-white from-zinc-50 to-zinc-100',
    pattern: BACKGROUND_TOKEN_PATTERN,
  },
  {
    key: 'border',
    label: 'Border',
    placeholder: 'border border-zinc-200 outline-none',
    pattern: BORDER_TOKEN_PATTERN,
  },
  {
    key: 'effects',
    label: 'Effects',
    placeholder: 'shadow-sm ring-1 ring-zinc-200',
    pattern: EFFECTS_TOKEN_PATTERN,
  },
  {
    key: 'other',
    label: 'Other classes',
    placeholder: 'relative overflow-hidden transition',
    pattern: null,
  },
]

const colorTokenCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

export const PINNED_BACKGROUND_COLOR_TOKENS = ['black', 'white']

export const TAILWIND_COLOR_OPTIONS = Object.entries(tailwindColors)
  .flatMap(([family, palette]) => {
    if (typeof palette === 'string') {
      return [{ token: family, value: palette }]
    }

    if (!palette || typeof palette !== 'object') {
      return []
    }

    return Object.entries(palette)
      .filter(([, value]) => typeof value === 'string')
      .map(([shade, value]) => ({
        token: `${family}-${shade}`,
        value,
      }))
  })
  .sort((left, right) => {
    const leftPinnedIndex = PINNED_BACKGROUND_COLOR_TOKENS.indexOf(left.token)
    const rightPinnedIndex = PINNED_BACKGROUND_COLOR_TOKENS.indexOf(right.token)

    if (leftPinnedIndex !== -1 || rightPinnedIndex !== -1) {
      if (leftPinnedIndex === -1) return 1
      if (rightPinnedIndex === -1) return -1
      return leftPinnedIndex - rightPinnedIndex
    }

    return colorTokenCollator.compare(left.token, right.token)
  })

export function shouldSuggestTailwindColors(value) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return true
  return !/^(#|var\(|rgb\(|rgba\(|hsl\(|hsla\(|oklch\()/i.test(trimmedValue)
}

export function getSelectedGroup(selectedComponent, components) {
  if (!selectedComponent) return null

  return (
    components.find(
      (group) => group.name === selectedComponent || group.children.includes(selectedComponent)
    ) ?? null
  )
}

export function getBreadcrumb(selectedComponent, components) {
  if (!selectedComponent) return null

  const group = getSelectedGroup(selectedComponent, components)
  if (!group) return [selectedComponent]
  if (group.name === selectedComponent) return [group.name]
  return [group.name, selectedComponent]
}

export function toClassTokens(value) {
  if (!value) return []
  const raw = Array.isArray(value) ? value.join(' ') : value
  return tokenizeClassString(raw)
}

export function tokenizeClassInput(value) {
  return tokenizeClassString(value)
}

export function fromClassTokens(tokens, originalValue) {
  const normalized = Array.from(new Set(tokens.filter(Boolean)))
  if (Array.isArray(originalValue)) {
    return [normalized.join(' ')]
  }

  return normalized.join(' ')
}

export function findToken(tokens, pattern) {
  return tokens.find((token) => pattern.test(token)) ?? ''
}

export function replaceTokens(tokens, pattern, nextTokens) {
  return [...tokens.filter((token) => !pattern.test(token)), ...nextTokens.filter(Boolean)]
}

export function categoryPattern(category) {
  return RAW_EDITOR_GROUPS.find((group) => group.key === category)?.pattern ?? null
}

export function tokenMatchesCategory(token, category) {
  const pattern = categoryPattern(category)
  if (category === 'other') {
    return RAW_EDITOR_GROUPS
      .filter((group) => group.key !== 'other')
      .every((group) => !group.pattern?.test(token))
  }

  return pattern?.test(token) ?? false
}

export function getCategoryText(tokens, category) {
  return tokens.filter((token) => tokenMatchesCategory(token, category)).join(' ')
}

export function getTokenValue(token, prefix) {
  return token.startsWith(`${prefix}-`) ? token.slice(prefix.length + 1) : ''
}

export function formatPaddingValueForInput(value) {
  return unwrapArbitraryValue(value)
}

export function normalizePaddingValue(value) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return ''
  if (/^\[.*\]$/.test(trimmedValue)) return trimmedValue
  if (/^-?\d*\.?\d+px$/.test(trimmedValue)) return `[${trimmedValue}]`
  return trimmedValue
}

export function getLimitTokenValue(token, prefix) {
  if (!token.startsWith(`${prefix}-`)) return ''

  const value = token.slice(prefix.length + 1)
  const arbitraryValueMatch = value.match(/^\[(.+)\]$/)
  return arbitraryValueMatch ? arbitraryValueMatch[1] : value
}

export function normalizeLimitValue(value) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return ''
  if (/^\[.*\]$/.test(trimmedValue)) return trimmedValue
  if (/^-?\d*\.?\d+px$/.test(trimmedValue)) return `[${trimmedValue}]`
  return trimmedValue
}

export function parseComparableLengthValue(value) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  const unwrappedValue = trimmedValue.match(/^\[(.+)\]$/)?.[1] ?? trimmedValue
  const spacingScaleMatch = unwrappedValue.match(/^-?\d*\.?\d+$/)
  if (spacingScaleMatch) {
    return {
      amount: Number(unwrappedValue),
      unit: 'tailwind-spacing',
    }
  }

  const match = unwrappedValue.match(/^(-?\d*\.?\d+)(px|rem|em|%|vw|vh)$/)
  if (!match) return null

  return {
    amount: Number(match[1]),
    unit: match[2],
  }
}

export function guessPaddingMode(tokens) {
  return tokens.some((token) => /^(pl|pr|pt|pb)-.+$/.test(token)) ? 'sides' : 'axes'
}

export function parseRoundedToken(token) {
  if (token === 'rounded') {
    return {
      corner: 'all',
      value: '',
    }
  }

  const cornerMatch = token.match(/^rounded-(tl|tr|br|bl|t|r|b|l)-(.+)$/)
  if (cornerMatch) {
    return {
      corner: cornerMatch[1],
      value: cornerMatch[2],
    }
  }

  const allMatch = token.match(/^rounded-(.+)$/)
  if (!allMatch) return null

  return {
    corner: 'all',
    value: allMatch[1],
  }
}

export function formatRadiusValueForInput(value) {
  return unwrapArbitraryValue(value)
}

export function resolveTailwindColorValue(colorValue) {
  const trimmedValue = decodeTailwindArbitraryValue(colorValue.trim())
  if (!trimmedValue) return null

  if (
    trimmedValue.startsWith('#') ||
    trimmedValue.startsWith('rgb(') ||
    trimmedValue.startsWith('rgba(') ||
    trimmedValue.startsWith('hsl(') ||
    trimmedValue.startsWith('hsla(') ||
    trimmedValue.startsWith('oklch(') ||
    trimmedValue.startsWith('var(')
  ) {
    return trimmedValue
  }

  const directMatch = tailwindColors[trimmedValue]
  if (typeof directMatch === 'string') return directMatch

  const colorMatch = trimmedValue.match(/^([a-z-]+)-(\d{2,3})$/)
  if (!colorMatch) return null

  const [, family, shade] = colorMatch
  const palette = tailwindColors[family]
  if (!palette || typeof palette !== 'object') return null

  const shadeValue = palette[shade]
  return typeof shadeValue === 'string' ? shadeValue : null
}

export function parseBorderColorToken(token) {
  if (!token.startsWith('border-')) {
    return {
      colorValue: '',
      opacityValue: '100',
    }
  }

  const { colorValue, opacityValue } = splitTopLevelOpacitySuffix(token.slice(7))
  return {
    colorValue: decodeTailwindArbitraryValue(unwrapArbitraryValue(colorValue)),
    opacityValue: opacityValue || '100',
  }
}

export function parseTextColorToken(token) {
  if (!token.startsWith('text-')) return null

  const value = token.slice(5)
  if (!value) return null

  if (
    /^(left|center|right|justify|start|end)$/.test(value) ||
    /^(xs|sm|base|lg|xl|\d+xl)$/.test(value) ||
    /^\[(length|size):.+\]$/.test(value)
  ) {
    return null
  }

  return decodeTailwindArbitraryValue(unwrapArbitraryValue(value))
}

export function getInheritedCurrentColor(tokens) {
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const colorValue = parseTextColorToken(tokens[index])
    if (!colorValue) continue

    const resolvedValue = resolveTailwindColorValue(colorValue)
    return {
      label: colorValue,
      previewColor: resolvedValue ?? 'currentColor',
      source: 'Text color',
    }
  }

  return {
    label: 'var(--foreground)',
    previewColor: 'var(--foreground)',
    source: 'Body text color',
  }
}

export function buildBorderColorToken(colorValue, opacityValue) {
  const normalizedColorValue = normalizeBackgroundColorValue(colorValue)
  if (!normalizedColorValue) return ''

  const normalizedOpacityValue = normalizeBackgroundOpacityValue(opacityValue)
  return normalizedOpacityValue === '100'
    ? `border-${normalizedColorValue}`
    : `border-${normalizedColorValue}/${normalizedOpacityValue}`
}

export function formatBorderWidthValueForInput(value) {
  const normalizedValue = unwrapArbitraryValue(value)
  if (normalizedValue === '0') return '0px'
  if (normalizedValue === '2') return '2px'
  if (normalizedValue === '4') return '4px'
  if (normalizedValue === '8') return '8px'
  return normalizedValue
}

export function formatBorderWidthValueForDisplay(value) {
  if (value === 'none') return value

  const normalizedValue = unwrapArbitraryValue(value).trim()
  const pxMatch = normalizedValue.match(/^(-?\d*\.?\d+)px$/)
  if (pxMatch) return pxMatch[1]
  return normalizedValue
}

export function isArbitraryBorderWidthValue(value) {
  const normalizedValue = unwrapArbitraryValue(value).trim()
  return /^-?\d*\.?\d+(px|rem|em)?$/.test(normalizedValue)
}

export function borderWidthShorthandToTarget(value) {
  switch (value) {
    case 't':
      return 'top'
    case 'r':
      return 'right'
    case 'b':
      return 'bottom'
    case 'l':
      return 'left'
    case 'x':
      return 'x'
    case 'y':
      return 'y'
    default:
      return 'all'
  }
}

export function parseBorderWidthToken(token) {
  if (token === 'border-none') {
    return { target: 'all', value: 'none' }
  }

  if (token === 'border') {
    return { target: 'all', value: '1px' }
  }

  const allMatch = token.match(/^border-(0|2|4|8|\[.+\])$/)
  if (allMatch && (allMatch[1][0] !== '[' || isArbitraryBorderWidthValue(allMatch[1]))) {
    return { target: 'all', value: formatBorderWidthValueForInput(allMatch[1]) }
  }

  const sideMatch = token.match(/^border-([trblxy])$/)
  if (sideMatch) {
    return {
      target: borderWidthShorthandToTarget(sideMatch[1]),
      value: '1px',
    }
  }

  const sideValueMatch = token.match(/^border-([trblxy])-(0|2|4|8|\[.+\])$/)
  if (
    sideValueMatch &&
    (sideValueMatch[2][0] !== '[' || isArbitraryBorderWidthValue(sideValueMatch[2]))
  ) {
    return {
      target: borderWidthShorthandToTarget(sideValueMatch[1]),
      value: formatBorderWidthValueForInput(sideValueMatch[2]),
    }
  }

  return null
}

export function borderWidthTargetToTokenPrefix(target) {
  switch (target) {
    case 'all':
      return 'border'
    case 'top':
      return 'border-t'
    case 'right':
      return 'border-r'
    case 'bottom':
      return 'border-b'
    case 'left':
      return 'border-l'
    case 'x':
      return 'border-x'
    case 'y':
      return 'border-y'
    default:
      return 'border'
  }
}

export function normalizeBorderWidthValue(value) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return ''
  if (trimmedValue === 'none') return 'none'
  if (/^\[.*\]$/.test(trimmedValue)) return trimmedValue
  if (/^-?\d*\.?\d+$/.test(trimmedValue)) return `[${trimmedValue}px]`
  if (/^-?\d*\.?\d+px$/.test(trimmedValue)) return `[${trimmedValue}]`
  return trimmedValue
}

export function buildBorderWidthToken(target, value) {
  const normalizedValue = normalizeBorderWidthValue(value)
  if (!normalizedValue) return ''

  if (normalizedValue === 'none') {
    return target === 'all' ? 'border-none' : `${borderWidthTargetToTokenPrefix(target)}-0`
  }

  const rawValue = unwrapArbitraryValue(normalizedValue)
  const prefix = borderWidthTargetToTokenPrefix(target)

  if (rawValue === '1px') return prefix
  if (rawValue === '0px') return `${prefix}-0`
  if (rawValue === '2px') return `${prefix}-2`
  if (rawValue === '4px') return `${prefix}-4`
  if (rawValue === '8px') return `${prefix}-8`
  return `${prefix}-[${rawValue}]`
}

export function removeBorderWidthTokens(tokens) {
  return tokens.filter((token) => parseBorderWidthToken(token) == null)
}

export function removeSharedBorderWidthTokens(tokens) {
  return tokens.filter((token) => parseBorderWidthToken(token)?.target !== 'all')
}

export function borderWidthTokenPattern(target) {
  const prefix = borderWidthTargetToTokenPrefix(target)
  return new RegExp(`^${prefix}(?:-(?:0|2|4|8|\\[.+\\]))?$`)
}

export function getBorderWidthState(tokens) {
  let allValue = ''
  let xValue = ''
  let yValue = ''
  let topExplicit = ''
  let rightExplicit = ''
  let bottomExplicit = ''
  let leftExplicit = ''
  let hasNone = false

  tokens.forEach((token) => {
    const parsedToken = parseBorderWidthToken(token)
    if (!parsedToken) return

    if (parsedToken.value === 'none') {
      hasNone = true
    }

    switch (parsedToken.target) {
      case 'all':
        allValue = parsedToken.value
        break
      case 'x':
        xValue = parsedToken.value
        break
      case 'y':
        yValue = parsedToken.value
        break
      case 'top':
        topExplicit = parsedToken.value
        break
      case 'right':
        rightExplicit = parsedToken.value
        break
      case 'bottom':
        bottomExplicit = parsedToken.value
        break
      case 'left':
        leftExplicit = parsedToken.value
        break
    }
  })

  const effectiveTop = topExplicit || yValue || allValue
  const effectiveRight = rightExplicit || xValue || allValue
  const effectiveBottom = bottomExplicit || yValue || allValue
  const effectiveLeft = leftExplicit || xValue || allValue
  const hasSideOverrides = Boolean(
    topExplicit || rightExplicit || bottomExplicit || leftExplicit || xValue || yValue
  )
  const isUniform =
    Boolean(effectiveTop) &&
    effectiveTop === effectiveRight &&
    effectiveTop === effectiveBottom &&
    effectiveTop === effectiveLeft

  return {
    allValue,
    xValue,
    yValue,
    topExplicit,
    rightExplicit,
    bottomExplicit,
    leftExplicit,
    effectiveTop,
    effectiveRight,
    effectiveBottom,
    effectiveLeft,
    hasNone,
    hasSideOverrides,
    uniformValue: isUniform ? effectiveTop : '',
  }
}

export function nextBorderWidthCycleValue(value) {
  const normalizedValue = unwrapArbitraryValue(value).trim()
  const numericMatch = normalizedValue.match(/^(-?\d*\.?\d+)px$/)
  if (numericMatch) {
    const currentNumber = Number(numericMatch[1])
    const nextNumber = currentNumber + 1
    if (Number.isFinite(nextNumber)) {
      if (nextNumber < 1) return '1px'
      return `${nextNumber}px`
    }
  }

  return '1px'
}

export function borderWidthValueToPreviewCss(value) {
  if (!value || value === 'none') return '0px'

  const normalizedValue = unwrapArbitraryValue(value).trim()
  const numericMatch = normalizedValue.match(/^(-?\d*\.?\d+)px$/)
  if (!numericMatch) return normalizedValue

  return Number(numericMatch[1]) > 0 ? '3px' : '0px'
}

export function normalizeRadiusValue(value) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return ''
  if (/^\[.*\]$/.test(trimmedValue)) return trimmedValue
  if (/^-?\d*\.?\d+px$/.test(trimmedValue)) return `[${trimmedValue}]`
  return trimmedValue
}

export function getRoundedValue(tokens, target) {
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const parsedToken = parseRoundedToken(tokens[index])
    if (parsedToken?.corner === target) {
      return formatRadiusValueForInput(parsedToken.value)
    }
  }

  return undefined
}

export function guessCornerRadiusMode(tokens) {
  return tokens.some((token) => {
    const parsedToken = parseRoundedToken(token)
    return parsedToken != null && ['tl', 'tr', 'bl', 'br'].includes(parsedToken.corner)
  })
    ? 'independent'
    : 'linked'
}

export function parsePairedValue(value) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
}

export function formatAxisValue(firstValue, secondValue) {
  if (!firstValue && !secondValue) return ''
  if (firstValue === secondValue) return firstValue
  return `${firstValue || '0'}, ${secondValue || '0'}`
}

export function componentTitle(selectedComponent) {
  return selectedComponent ?? 'Division'
}

export function guessSizeMode(tokens, axis) {
  const fullToken = axis === 'w' ? /^(w-full|flex-1|basis-full)$/ : /^h-full$/
  const hugToken = axis === 'w' ? /^w-fit$/ : /^h-fit$/

  if (tokens.some((token) => fullToken.test(token))) return 'Fill'
  if (tokens.some((token) => hugToken.test(token))) return 'Hug'
  return 'Fixed'
}

export function sizeModeLabel(mode, axis) {
  if (mode === 'Fill') return axis === 'w' ? 'Fill (w-full)' : 'Fill (h-full)'
  if (mode === 'Hug') return axis === 'w' ? 'Hug (w-fit)' : 'Hug (h-fit)'
  return 'Fixed (manual)'
}

export function guessDirection(tokens) {
  if (tokens.includes('grid')) return 'grid'
  if (tokens.includes('flex-col')) return 'col'
  return 'row'
}

export function guessToggle(tokens, token) {
  return tokens.includes(token)
}

export function getPaddingTokensForAxis(axis, nextValue) {
  const values = parsePairedValue(nextValue).map(normalizePaddingValue).filter(Boolean)

  if (values.length === 0) return []
  if (values.length === 1 || values[0] === values[1]) {
    return [`p${axis}-${values[0]}`]
  }

  return axis === 'x'
    ? [`pl-${values[0]}`, `pr-${values[1]}`]
    : [`pt-${values[0]}`, `pb-${values[1]}`]
}
