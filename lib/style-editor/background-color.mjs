export function unwrapArbitraryValue(value) {
  const arbitraryValueMatch = value.match(/^\[(.+)\]$/)
  return arbitraryValueMatch ? arbitraryValueMatch[1] : value
}

export function decodeTailwindArbitraryValue(value) {
  return value.replace(/_/g, ' ')
}

export function encodeTailwindArbitraryValue(value) {
  return value.trim().replace(/\s+/g, '_')
}

export function splitTopLevelOpacitySuffix(value) {
  let bracketDepth = 0
  let parenDepth = 0

  for (let index = value.length - 1; index >= 0; index -= 1) {
    const character = value[index]

    if (character === ']') {
      bracketDepth += 1
      continue
    }

    if (character === '[') {
      bracketDepth = Math.max(0, bracketDepth - 1)
      continue
    }

    if (character === ')') {
      parenDepth += 1
      continue
    }

    if (character === '(') {
      parenDepth = Math.max(0, parenDepth - 1)
      continue
    }

    if (character === '/' && bracketDepth === 0 && parenDepth === 0) {
      return {
        colorValue: value.slice(0, index),
        opacityValue: value.slice(index + 1),
      }
    }
  }

  return {
    colorValue: value,
    opacityValue: '',
  }
}

export function parseBackgroundToken(token) {
  if (!token.startsWith('bg-')) {
    return {
      colorValue: '',
      opacityValue: '100',
    }
  }

  const { colorValue, opacityValue } = splitTopLevelOpacitySuffix(token.slice(3))
  return {
    colorValue: decodeTailwindArbitraryValue(unwrapArbitraryValue(colorValue)),
    opacityValue: opacityValue || '100',
  }
}

export function normalizeBackgroundColorValue(value) {
  const trimmedValue = value.trim().replace(/^bg-/, '')
  if (!trimmedValue) return ''
  if (/^\[.*\]$/.test(trimmedValue)) return trimmedValue
  if (
    trimmedValue.startsWith('#') ||
    trimmedValue.startsWith('rgb(') ||
    trimmedValue.startsWith('rgba(') ||
    trimmedValue.startsWith('hsl(') ||
    trimmedValue.startsWith('hsla(') ||
    trimmedValue.startsWith('oklch(') ||
    trimmedValue.startsWith('var(') ||
    trimmedValue.includes(' ')
  ) {
    return `[${encodeTailwindArbitraryValue(trimmedValue)}]`
  }

  return trimmedValue
}

export function normalizeBackgroundOpacityValue(value) {
  const numericValue = Number.parseInt(value.replace(/%/g, '').trim(), 10)
  if (Number.isNaN(numericValue)) return '100'
  return `${Math.min(100, Math.max(0, numericValue))}`
}

export function buildBackgroundToken(colorValue, opacityValue) {
  const normalizedColorValue = normalizeBackgroundColorValue(colorValue)
  if (!normalizedColorValue) return ''

  const normalizedOpacityValue = normalizeBackgroundOpacityValue(opacityValue)
  return normalizedOpacityValue === '100'
    ? `bg-${normalizedColorValue}`
    : `bg-${normalizedColorValue}/${normalizedOpacityValue}`
}

export function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function parseHexColor(value) {
  const normalizedValue = value.trim().replace(/^#/, '')
  if (!/^[\da-f]{3}$|^[\da-f]{6}$/i.test(normalizedValue)) return null

  const fullHexValue =
    normalizedValue.length === 3
      ? normalizedValue
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalizedValue

  return {
    red: Number.parseInt(fullHexValue.slice(0, 2), 16),
    green: Number.parseInt(fullHexValue.slice(2, 4), 16),
    blue: Number.parseInt(fullHexValue.slice(4, 6), 16),
  }
}

export function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((value) => clampNumber(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`
}

export function rgbToHsl(red, green, blue) {
  const normalizedRed = red / 255
  const normalizedGreen = green / 255
  const normalizedBlue = blue / 255
  const max = Math.max(normalizedRed, normalizedGreen, normalizedBlue)
  const min = Math.min(normalizedRed, normalizedGreen, normalizedBlue)
  const lightness = (max + min) / 2
  const delta = max - min

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness: Math.round(lightness * 100) }
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)

  let hue = 0
  if (max === normalizedRed) {
    hue = (normalizedGreen - normalizedBlue) / delta + (normalizedGreen < normalizedBlue ? 6 : 0)
  } else if (max === normalizedGreen) {
    hue = (normalizedBlue - normalizedRed) / delta + 2
  } else {
    hue = (normalizedRed - normalizedGreen) / delta + 4
  }

  return {
    hue: Math.round(hue * 60),
    saturation: Math.round(saturation * 100),
    lightness: Math.round(lightness * 100),
  }
}

function hueToRgbChannel(p, q, t) {
  let nextT = t
  if (nextT < 0) nextT += 1
  if (nextT > 1) nextT -= 1
  if (nextT < 1 / 6) return p + (q - p) * 6 * nextT
  if (nextT < 1 / 2) return q
  if (nextT < 2 / 3) return p + (q - p) * (2 / 3 - nextT) * 6
  return p
}

export function hslToRgb(hue, saturation, lightness) {
  const normalizedHue = ((hue % 360) + 360) % 360 / 360
  const normalizedSaturation = clampNumber(saturation, 0, 100) / 100
  const normalizedLightness = clampNumber(lightness, 0, 100) / 100

  if (normalizedSaturation === 0) {
    const channel = Math.round(normalizedLightness * 255)
    return { red: channel, green: channel, blue: channel }
  }

  const q =
    normalizedLightness < 0.5
      ? normalizedLightness * (1 + normalizedSaturation)
      : normalizedLightness + normalizedSaturation - normalizedLightness * normalizedSaturation
  const p = 2 * normalizedLightness - q

  return {
    red: Math.round(hueToRgbChannel(p, q, normalizedHue + 1 / 3) * 255),
    green: Math.round(hueToRgbChannel(p, q, normalizedHue) * 255),
    blue: Math.round(hueToRgbChannel(p, q, normalizedHue - 1 / 3) * 255),
  }
}

export function parseCssColorToRgb(value) {
  const trimmedValue = decodeTailwindArbitraryValue(value.trim())
  if (!trimmedValue) return null

  const hexColor = parseHexColor(trimmedValue)
  if (hexColor) return hexColor

  const rgbMatch = trimmedValue.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+[\d.]+%?)?\s*\)$/i
  )
  if (rgbMatch) {
    return {
      red: clampNumber(Number(rgbMatch[1]), 0, 255),
      green: clampNumber(Number(rgbMatch[2]), 0, 255),
      blue: clampNumber(Number(rgbMatch[3]), 0, 255),
    }
  }

  const hslMatch = trimmedValue.match(
    /^hsla?\(\s*([-\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:[,\s/]+[\d.]+%?)?\s*\)$/i
  )
  if (hslMatch) {
    return hslToRgb(Number(hslMatch[1]), Number(hslMatch[2]), Number(hslMatch[3]))
  }

  if (typeof document === 'undefined') return null

  const context = document.createElement('canvas').getContext('2d')
  if (!context) return null
  context.fillStyle = '#000000'
  context.fillStyle = trimmedValue
  return parseCssColorToRgb(context.fillStyle)
}

export function buildBackgroundPickerDraft(colorValue) {
  const parsedColor = parseCssColorToRgb(colorValue) ?? { red: 255, green: 255, blue: 255 }
  return buildBackgroundPickerDraftFromRgb(parsedColor.red, parsedColor.green, parsedColor.blue)
}

export function buildBackgroundPickerDraftFromRgb(red, green, blue) {
  const normalizedRed = clampNumber(Math.round(red), 0, 255)
  const normalizedGreen = clampNumber(Math.round(green), 0, 255)
  const normalizedBlue = clampNumber(Math.round(blue), 0, 255)
  const hslColor = rgbToHsl(normalizedRed, normalizedGreen, normalizedBlue)

  return {
    hex: rgbToHex(normalizedRed, normalizedGreen, normalizedBlue),
    red: `${normalizedRed}`,
    green: `${normalizedGreen}`,
    blue: `${normalizedBlue}`,
    hue: `${hslColor.hue}`,
    saturation: `${hslColor.saturation}`,
    lightness: `${hslColor.lightness}`,
  }
}

export function buildBackgroundPickerDraftFromHsl(hue, saturation, lightness) {
  const normalizedHue = Math.round(hue)
  const normalizedSaturation = clampNumber(Math.round(saturation), 0, 100)
  const normalizedLightness = clampNumber(Math.round(lightness), 0, 100)
  const rgbColor = hslToRgb(normalizedHue, normalizedSaturation, normalizedLightness)

  return {
    hex: rgbToHex(rgbColor.red, rgbColor.green, rgbColor.blue),
    red: `${rgbColor.red}`,
    green: `${rgbColor.green}`,
    blue: `${rgbColor.blue}`,
    hue: `${normalizedHue}`,
    saturation: `${normalizedSaturation}`,
    lightness: `${normalizedLightness}`,
  }
}
