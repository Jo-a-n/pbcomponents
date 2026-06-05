import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  translateChildTokensOnFlexOff,
  translateChildTokensOnFlexOn,
  translateChildTokensOnSwitchToGrid,
} from '../../lib/style-editor/style-editor-helpers.mjs'

describe('translateChildTokensOnFlexOff', () => {
  describe('row parent (isColumnDirection = false)', () => {
    test('flex-1 becomes w-full', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOff(['flex-1', 'p-4'], false),
        ['w-full', 'p-4']
      )
    })

    test('flex-none is removed, fixed size token stays', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOff(['flex-none', 'w-[200px]', 'p-4'], false),
        ['w-[200px]', 'p-4']
      )
    })

    test('flex-auto is removed', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOff(['flex-auto', 'p-4'], false),
        ['p-4']
      )
    })

    test('flex-initial is removed', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOff(['flex-initial', 'p-4'], false),
        ['p-4']
      )
    })

    test('unrelated tokens are unchanged', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOff(['p-4', 'text-sm', 'rounded-lg'], false),
        ['p-4', 'text-sm', 'rounded-lg']
      )
    })

    test('multiple flex tokens are all handled', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOff(['flex-1', 'flex-none', 'p-4'], false),
        ['w-full', 'p-4']
      )
    })
  })

  describe('col parent (isColumnDirection = true)', () => {
    test('flex-1 becomes h-full', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOff(['flex-1', 'p-4'], true),
        ['h-full', 'p-4']
      )
    })

    test('flex-none is removed, fixed size token stays', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOff(['flex-none', 'h-[200px]', 'p-4'], true),
        ['h-[200px]', 'p-4']
      )
    })

    test('flex-auto and flex-initial are removed', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOff(['flex-auto', 'flex-initial', 'p-4'], true),
        ['p-4']
      )
    })
  })
})

describe('translateChildTokensOnFlexOn', () => {
  describe('row parent (isColumnDirection = false)', () => {
    test('w-full becomes flex-1', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['w-full', 'p-4'], false),
        ['flex-1', 'p-4']
      )
    })

    test('fixed width gets flex-none added', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['w-[200px]', 'p-4'], false),
        ['w-[200px]', 'p-4', 'flex-none']
      )
    })

    test('tailwind scale width gets flex-none added', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['w-24', 'p-4'], false),
        ['w-24', 'p-4', 'flex-none']
      )
    })

    test('w-fit (hug) is unchanged', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['w-fit', 'p-4'], false),
        ['w-fit', 'p-4']
      )
    })

    test('no size token is unchanged', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['p-4', 'text-sm'], false),
        ['p-4', 'text-sm']
      )
    })

    test('existing flex token prevents flex-none from being added', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['flex-1', 'w-[200px]'], false),
        ['flex-1', 'w-[200px]']
      )
    })

    test('h-full (cross axis) is unchanged in row mode', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['h-full', 'p-4'], false),
        ['h-full', 'p-4']
      )
    })

    test('fixed height (cross axis) does not get flex-none in row mode', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['h-[200px]', 'p-4'], false),
        ['h-[200px]', 'p-4']
      )
    })
  })

  describe('col parent (isColumnDirection = true)', () => {
    test('h-full becomes flex-1', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['h-full', 'p-4'], true),
        ['flex-1', 'p-4']
      )
    })

    test('fixed height gets flex-none added', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['h-[200px]', 'p-4'], true),
        ['h-[200px]', 'p-4', 'flex-none']
      )
    })

    test('h-fit (hug) is unchanged', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['h-fit', 'p-4'], true),
        ['h-fit', 'p-4']
      )
    })

    test('w-full (cross axis) is unchanged in col mode', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['w-full', 'p-4'], true),
        ['w-full', 'p-4']
      )
    })

    test('fixed width (cross axis) does not get flex-none in col mode', () => {
      assert.deepEqual(
        translateChildTokensOnFlexOn(['w-[200px]', 'p-4'], true),
        ['w-[200px]', 'p-4']
      )
    })
  })
})

describe('translateChildTokensOnSwitchToGrid', () => {
  test('flex-1 is removed', () => {
    assert.deepEqual(
      translateChildTokensOnSwitchToGrid(['flex-1', 'p-4']),
      ['p-4']
    )
  })

  test('flex-none is removed', () => {
    assert.deepEqual(
      translateChildTokensOnSwitchToGrid(['flex-none', 'w-[200px]', 'p-4']),
      ['w-[200px]', 'p-4']
    )
  })

  test('flex-auto is removed', () => {
    assert.deepEqual(
      translateChildTokensOnSwitchToGrid(['flex-auto', 'p-4']),
      ['p-4']
    )
  })

  test('flex-initial is removed', () => {
    assert.deepEqual(
      translateChildTokensOnSwitchToGrid(['flex-initial', 'p-4']),
      ['p-4']
    )
  })

  test('multiple flex tokens are all removed', () => {
    assert.deepEqual(
      translateChildTokensOnSwitchToGrid(['flex-1', 'flex-none', 'p-4']),
      ['p-4']
    )
  })

  test('unrelated tokens are unchanged', () => {
    assert.deepEqual(
      translateChildTokensOnSwitchToGrid(['p-4', 'text-sm', 'w-[200px]']),
      ['p-4', 'text-sm', 'w-[200px]']
    )
  })

  test('empty token list stays empty', () => {
    assert.deepEqual(translateChildTokensOnSwitchToGrid([]), [])
  })
})
