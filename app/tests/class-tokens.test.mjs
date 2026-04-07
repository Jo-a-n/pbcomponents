import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import { tokenizeClassString } from '../../lib/style-editor/class-tokens.mjs'

describe('tokenizeClassString', () => {
  test('keeps arbitrary background colors with spaces intact', () => {
    assert.deepEqual(tokenizeClassString('rounded-xl bg-[hsl(150 70% 55%)] shadow-sm'), [
      'rounded-xl',
      'bg-[hsl(150 70% 55%)]',
      'shadow-sm',
    ])
  })

  test('keeps slash opacity attached to arbitrary colors', () => {
    assert.deepEqual(tokenizeClassString('bg-[#ff0000]/75 text-white'), [
      'bg-[#ff0000]/75',
      'text-white',
    ])
  })

  test('ignores extra outer whitespace', () => {
    assert.deepEqual(tokenizeClassString('  px-4   py-2  text-sm  '), [
      'px-4',
      'py-2',
      'text-sm',
    ])
  })

  test('does not split variant tokens containing nested brackets and parentheses', () => {
    assert.deepEqual(
      tokenizeClassString('data-[state=open]:bg-[rgb(220_252_20)]/40 hover:text-white'),
      ['data-[state=open]:bg-[rgb(220_252_20)]/40', 'hover:text-white']
    )
  })
})
