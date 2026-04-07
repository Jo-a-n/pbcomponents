import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildBackgroundPickerDraft,
  buildBackgroundPickerDraftFromHsl,
  buildBackgroundPickerDraftFromRgb,
  buildBackgroundToken,
  hslToRgb,
  normalizeBackgroundOpacityValue,
  parseBackgroundToken,
  parseCssColorToRgb,
  rgbToHsl,
} from '../../lib/style-editor/background-color.mjs'

describe('background token parsing', () => {
  test('round-trips arbitrary colors with opacity', () => {
    const parsedToken = parseBackgroundToken('bg-[#ff0000]/75')

    assert.deepEqual(parsedToken, {
      colorValue: '#ff0000',
      opacityValue: '75',
    })

    assert.equal(
      buildBackgroundToken(parsedToken.colorValue, parsedToken.opacityValue),
      'bg-[#ff0000]/75'
    )
    assert.equal(buildBackgroundToken('hsl(120 60% 50%)', '100'), 'bg-[hsl(120_60%_50%)]')
    assert.deepEqual(parseBackgroundToken('bg-[rgb(220_252_20)]/40'), {
      colorValue: 'rgb(220 252 20)',
      opacityValue: '40',
    })
  })

  test('falls back safely for invalid input and missing opacity', () => {
    assert.deepEqual(parseBackgroundToken('text-white'), {
      colorValue: '',
      opacityValue: '100',
    })

    assert.deepEqual(parseBackgroundToken('bg-white'), {
      colorValue: 'white',
      opacityValue: '100',
    })

    assert.equal(normalizeBackgroundOpacityValue('120%'), '100')
    assert.equal(normalizeBackgroundOpacityValue('-10'), '0')
    assert.equal(normalizeBackgroundOpacityValue('abc'), '100')
    assert.equal(buildBackgroundToken('  ', '75'), '')
  })
})

describe('color conversions', () => {
  test('rgb and hsl conversions preserve a non-trivial color closely', () => {
    const sourceColor = { red: 12, green: 200, blue: 155 }
    const asHsl = rgbToHsl(sourceColor.red, sourceColor.green, sourceColor.blue)
    const roundTrip = hslToRgb(asHsl.hue, asHsl.saturation, asHsl.lightness)

    assert.ok(Math.abs(roundTrip.red - sourceColor.red) <= 3)
    assert.ok(Math.abs(roundTrip.green - sourceColor.green) <= 3)
    assert.ok(Math.abs(roundTrip.blue - sourceColor.blue) <= 3)
  })

  test('css color parsing understands raw and encoded picker values', () => {
    assert.deepEqual(parseCssColorToRgb('hsl(0 0% 100%)'), {
      red: 255,
      green: 255,
      blue: 255,
    })

    assert.deepEqual(parseCssColorToRgb('hsl(0 0% 0%)'), {
      red: 0,
      green: 0,
      blue: 0,
    })

    assert.deepEqual(parseCssColorToRgb('rgb(220_252_20)'), {
      red: 220,
      green: 252,
      blue: 20,
    })

    assert.equal(parseCssColorToRgb('not-a-color'), null)
  })
})

describe('picker draft builders', () => {
  test('keeps hue and saturation when only lightness changes', () => {
    const original = buildBackgroundPickerDraft('hsl(150 70% 40%)')
    const updated = buildBackgroundPickerDraft('hsl(150 70% 55%)')

    assert.equal(original.hue, '150')
    assert.equal(original.saturation, '70')
    assert.equal(updated.hue, '150')
    assert.equal(updated.saturation, '70')
    assert.equal(updated.lightness, '55')
  })

  test('preserves rgb channels while updating derived values', () => {
    const updated = buildBackgroundPickerDraftFromRgb(12, 200, 155)

    assert.equal(updated.red, '12')
    assert.equal(updated.green, '200')
    assert.equal(updated.blue, '155')
    assert.equal(updated.hex, '#0cc89b')
  })

  test('preserves hsl channels while updating derived values', () => {
    const updated = buildBackgroundPickerDraftFromHsl(150, 70, 55)

    assert.equal(updated.hue, '150')
    assert.equal(updated.saturation, '70')
    assert.equal(updated.lightness, '55')
    assert.deepEqual(
      { red: updated.red, green: updated.green, blue: updated.blue },
      { red: '60', green: '221', blue: '140' }
    )
  })

  test('defaults to white when the source color cannot be parsed', () => {
    assert.deepEqual(buildBackgroundPickerDraft('not-a-color'), {
      hex: '#ffffff',
      red: '255',
      green: '255',
      blue: '255',
      hue: '0',
      saturation: '0',
      lightness: '100',
    })
  })
})
