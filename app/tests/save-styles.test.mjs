import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeIncomingStylesForSave,
  normalizeStyleValueForSave,
  tokenMatchesKnownCategory,
} from '../../lib/style-editor/save-styles.mjs'

describe('save-styles normalization', () => {
  test('keeps string style values as single normalized class strings', () => {
    assert.equal(
      normalizeStyleValueForSave('  px-4  py-2 px-4  bg-[hsl(150 70% 55%)]  ', 'px-4'),
      'px-4 py-2 bg-[hsl(150 70% 55%)]'
    )
  })

  test('groups array style values by known editor categories and appends other classes', () => {
    assert.deepEqual(
      normalizeStyleValueForSave(
        [
          'relative border border-zinc-200 px-4',
          'shadow-sm text-sm px-4 rounded-xl',
          'bg-white',
        ],
        ['existing array shape']
      ),
      [
        'px-4',
        'rounded-xl',
        'text-sm',
        'bg-white',
        'border border-zinc-200',
        'shadow-sm',
        'relative',
      ]
    )
  })

  test('preserves array output when the incoming value is an array even if the original was a string', () => {
    assert.deepEqual(normalizeStyleValueForSave(['px-4 py-2', 'relative'], 'px-2'), [
      'px-4 py-2',
      'relative',
    ])
  })

  test('returns a blank line placeholder when an array-backed value normalizes to empty', () => {
    assert.deepEqual(normalizeStyleValueForSave(['   '], ['existing array shape']), [''])
  })

  test('normalizes a whole incoming styles payload against current styles', () => {
    const currentStyles = {
      Frame: ['px-2', 'text-sm'],
      Card: 'border px-2',
    }

    assert.deepEqual(
      normalizeIncomingStylesForSave(
        {
          Frame: ['relative px-4', 'text-sm border'],
          Card: ' border px-4 px-4 ',
        },
        currentStyles
      ),
      {
        Frame: ['px-4', 'text-sm', 'border', 'relative'],
        Card: 'border px-4',
      }
    )
  })

  test('detects known category tokens the route groups specially', () => {
    assert.equal(tokenMatchesKnownCategory('px-4'), true)
    assert.equal(tokenMatchesKnownCategory('text-sm'), true)
    assert.equal(tokenMatchesKnownCategory('relative'), false)
  })
})
