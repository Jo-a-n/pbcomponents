import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  borderWidthTokenPattern,
  borderWidthValueToPreviewCss,
  buildBorderColorToken,
  buildBorderWidthToken,
  getBorderWidthState,
  getInheritedCurrentColor,
  nextBorderWidthCycleValue,
  parseBorderColorToken,
  parseBorderWidthToken,
  removeBorderWidthTokens,
  removeSharedBorderWidthTokens,
  resolveTailwindColorValue,
} from '../../lib/style-editor/style-editor-helpers.mjs'

describe('style editor border color helpers', () => {
  test('resolves border colors from tailwind tokens and arbitrary values', () => {
    assert.equal(resolveTailwindColorValue('white'), '#fff')
    assert.equal(resolveTailwindColorValue('emerald-500'), 'oklch(69.6% 0.17 162.48)')
    assert.equal(resolveTailwindColorValue('rgb(10 20 30)'), 'rgb(10 20 30)')
    assert.equal(resolveTailwindColorValue('missing-999'), null)

    assert.deepEqual(parseBorderColorToken('border-[#ff0000]/75'), {
      colorValue: '#ff0000',
      opacityValue: '75',
    })
    assert.deepEqual(parseBorderColorToken('border-white'), {
      colorValue: 'white',
      opacityValue: '100',
    })
    assert.deepEqual(parseBorderColorToken('px-4'), {
      colorValue: '',
      opacityValue: '100',
    })

    assert.equal(buildBorderColorToken('white', '100'), 'border-white')
    assert.equal(buildBorderColorToken('#ff0000', '75'), 'border-[#ff0000]/75')
    assert.equal(buildBorderColorToken('  ', '75'), '')
  })

  test('inherits current color from the last text color token only', () => {
    assert.deepEqual(
      getInheritedCurrentColor(['text-sm', 'text-left', 'text-zinc-700', 'underline']),
      {
        label: 'zinc-700',
        previewColor: 'oklch(37% 0.013 285.805)',
        source: 'Text color',
      }
    )

    assert.deepEqual(getInheritedCurrentColor(['text-sm', 'text-center']), {
      label: 'var(--foreground)',
      previewColor: 'var(--foreground)',
      source: 'Body text color',
    })
  })
})

describe('style editor border width helpers', () => {
  test('parses and rebuilds shared and side-specific border width tokens', () => {
    assert.deepEqual(parseBorderWidthToken('border'), {
      target: 'all',
      value: '1px',
    })
    assert.deepEqual(parseBorderWidthToken('border-x-4'), {
      target: 'x',
      value: '4px',
    })
    assert.deepEqual(parseBorderWidthToken('border-l-[3px]'), {
      target: 'left',
      value: '3px',
    })
    assert.deepEqual(parseBorderWidthToken('border-none'), {
      target: 'all',
      value: 'none',
    })
    assert.equal(parseBorderWidthToken('border-solid'), null)

    assert.equal(buildBorderWidthToken('all', '1px'), 'border')
    assert.equal(buildBorderWidthToken('all', '2'), 'border-2')
    assert.equal(buildBorderWidthToken('left', '3'), 'border-l-[3px]')
    assert.equal(buildBorderWidthToken('right', 'none'), 'border-r-0')
  })

  test('computes border width state with shared values and overrides', () => {
    assert.deepEqual(getBorderWidthState(['border', 'border-x-4', 'border-t-2']), {
      allValue: '1px',
      xValue: '4px',
      yValue: '',
      topExplicit: '2px',
      rightExplicit: '',
      bottomExplicit: '',
      leftExplicit: '',
      effectiveTop: '2px',
      effectiveRight: '4px',
      effectiveBottom: '1px',
      effectiveLeft: '4px',
      hasNone: false,
      hasSideOverrides: true,
      uniformValue: '',
    })

    assert.deepEqual(getBorderWidthState(['border-2']), {
      allValue: '2px',
      xValue: '',
      yValue: '',
      topExplicit: '',
      rightExplicit: '',
      bottomExplicit: '',
      leftExplicit: '',
      effectiveTop: '2px',
      effectiveRight: '2px',
      effectiveBottom: '2px',
      effectiveLeft: '2px',
      hasNone: false,
      hasSideOverrides: false,
      uniformValue: '2px',
    })
  })

  test('filters and previews border width tokens consistently', () => {
    const topPattern = borderWidthTokenPattern('top')
    assert.equal(topPattern.test('border-t'), true)
    assert.equal(topPattern.test('border-t-4'), true)
    assert.equal(topPattern.test('border-l-4'), false)

    assert.deepEqual(removeBorderWidthTokens(['border', 'border-zinc-200', 'shadow-sm']), [
      'border-zinc-200',
      'shadow-sm',
    ])
    assert.deepEqual(removeSharedBorderWidthTokens(['border', 'border-l-2', 'border-x-4']), [
      'border-l-2',
      'border-x-4',
    ])

    assert.equal(nextBorderWidthCycleValue('2px'), '3px')
    assert.equal(nextBorderWidthCycleValue('0px'), '1px')
    assert.equal(nextBorderWidthCycleValue('auto'), '1px')

    assert.equal(borderWidthValueToPreviewCss('2px'), '3px')
    assert.equal(borderWidthValueToPreviewCss('0px'), '0px')
    assert.equal(borderWidthValueToPreviewCss('none'), '0px')
    assert.equal(borderWidthValueToPreviewCss('[0.5rem]'), '0.5rem')
  })
})
