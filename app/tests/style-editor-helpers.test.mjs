import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  componentTitle,
  formatAxisValue,
  fromClassTokens,
  getBreadcrumb,
  getCategoryText,
  getLimitTokenValue,
  getPaddingTokensForAxis,
  getRoundedValue,
  getSelectedGroup,
  getTokenValue,
  guessCornerRadiusMode,
  guessDirection,
  guessPaddingMode,
  guessSizeMode,
  normalizeLimitValue,
  normalizePaddingValue,
  parseComparableLengthValue,
  parseRoundedToken,
  shouldSuggestTailwindColors,
  sizeModeLabel,
  toClassTokens,
  tokenMatchesCategory,
} from '../../lib/style-editor/style-editor-helpers.mjs'

const COMPONENTS = [
  { name: 'Frame', children: ['Card', 'Badge'] },
  { name: 'Card', children: ['CardTitle'] },
]

describe('style editor grouping helpers', () => {
  test('finds selected groups and breadcrumbs for parents and children', () => {
    assert.deepEqual(getSelectedGroup('Card', COMPONENTS), COMPONENTS[0])
    assert.deepEqual(getSelectedGroup('Frame', COMPONENTS), COMPONENTS[0])
    assert.equal(getSelectedGroup(null, COMPONENTS), null)

    assert.deepEqual(getBreadcrumb('Card', COMPONENTS), ['Frame', 'Card'])
    assert.deepEqual(getBreadcrumb('Frame', COMPONENTS), ['Frame'])
    assert.deepEqual(getBreadcrumb('Orphan', COMPONENTS), ['Orphan'])
    assert.equal(getBreadcrumb(null, COMPONENTS), null)
  })

  test('tokenizes and rebuilds class values while preserving string-vs-array shape', () => {
    assert.deepEqual(toClassTokens(['px-4 py-2', 'text-sm text-sm']), [
      'px-4',
      'py-2',
      'text-sm',
      'text-sm',
    ])

    assert.equal(fromClassTokens(['px-4', 'py-2', 'px-4'], 'px-4'), 'px-4 py-2')
    assert.deepEqual(fromClassTokens(['px-4', 'py-2', 'px-4'], ['px-4 py-2']), ['px-4 py-2'])
  })

  test('classifies raw-editor categories and keeps unmatched tokens in other', () => {
    const tokens = [
      'px-4',
      'mt-2',
      'rounded-xl',
      'text-sm',
      'bg-white',
      'border',
      'shadow-sm',
      'relative',
    ]

    assert.equal(tokenMatchesCategory('px-4', 'padding'), true)
    assert.equal(tokenMatchesCategory('relative', 'other'), true)
    assert.equal(tokenMatchesCategory('text-sm', 'other'), false)

    assert.equal(getCategoryText(tokens, 'padding'), 'px-4')
    assert.equal(getCategoryText(tokens, 'background'), 'bg-white')
    assert.equal(getCategoryText(tokens, 'other'), 'relative')
  })
})

describe('style editor value normalization helpers', () => {
  test('normalizes padding and limit values and derives paired axis tokens', () => {
    assert.equal(normalizePaddingValue('12px'), '[12px]')
    assert.equal(normalizePaddingValue('4'), '4')
    assert.equal(normalizeLimitValue('24px'), '[24px]')
    assert.equal(normalizeLimitValue('[50%]'), '[50%]')

    assert.deepEqual(getPaddingTokensForAxis('x', '4, 6'), ['pl-4', 'pr-6'])
    assert.deepEqual(getPaddingTokensForAxis('y', '8, 8'), ['py-8'])
    assert.deepEqual(getPaddingTokensForAxis('x', ''), [])

    assert.equal(guessPaddingMode(['px-4', 'py-2']), 'axes')
    assert.equal(guessPaddingMode(['pl-4', 'pr-6']), 'sides')
  })

  test('parses comparable lengths and pulls values from limit tokens', () => {
    assert.equal(getLimitTokenValue('min-w-[320px]', 'min-w'), '320px')
    assert.equal(getLimitTokenValue('max-h-screen', 'max-h'), 'screen')
    assert.equal(getLimitTokenValue('w-full', 'min-w'), '')

    assert.deepEqual(parseComparableLengthValue('4'), {
      amount: 4,
      unit: 'tailwind-spacing',
    })
    assert.deepEqual(parseComparableLengthValue('[12rem]'), {
      amount: 12,
      unit: 'rem',
    })
    assert.equal(parseComparableLengthValue('fit-content'), null)
  })

  test('parses radius and sizing helpers for editor display', () => {
    assert.deepEqual(parseRoundedToken('rounded-tl-[12px]'), {
      corner: 'tl',
      value: '[12px]',
    })
    assert.deepEqual(parseRoundedToken('rounded-xl'), {
      corner: 'all',
      value: 'xl',
    })
    assert.equal(parseRoundedToken('px-4'), null)

    assert.equal(getRoundedValue(['rounded-lg', 'rounded-tl-[12px]'], 'tl'), '12px')
    assert.equal(getRoundedValue(['rounded-lg'], 'tr'), undefined)
    assert.equal(guessCornerRadiusMode(['rounded-lg']), 'linked')
    assert.equal(guessCornerRadiusMode(['rounded-tl-lg', 'rounded-br-lg']), 'independent')
  })

  test('derives axis, direction, and size labels for editor controls', () => {
    assert.equal(formatAxisValue('', ''), '')
    assert.equal(formatAxisValue('4', '4'), '4')
    assert.equal(formatAxisValue('4', '8'), '4, 8')
    assert.equal(getTokenValue('px-4', 'px'), '4')

    assert.equal(guessDirection(['flex', 'flex-col']), 'col')
    assert.equal(guessDirection(['grid']), 'grid')
    assert.equal(guessDirection(['flex']), 'row')

    assert.equal(guessSizeMode(['w-full'], 'w'), 'Fill')
    assert.equal(guessSizeMode(['w-fit'], 'w'), 'Hug')
    assert.equal(guessSizeMode(['h-12'], 'h'), 'Fixed')
    assert.equal(sizeModeLabel('Fill', 'w'), 'Fill (w-full)')
    assert.equal(componentTitle(null), 'Division')
    assert.equal(componentTitle('Card'), 'Card')
  })

  test('only suggests tailwind colors for non-css literals', () => {
    assert.equal(shouldSuggestTailwindColors(''), true)
    assert.equal(shouldSuggestTailwindColors('emerald-500'), true)
    assert.equal(shouldSuggestTailwindColors('#ff0000'), false)
    assert.equal(shouldSuggestTailwindColors('rgb(10 20 30)'), false)
    assert.equal(shouldSuggestTailwindColors('var(--accent)'), false)
  })
})
