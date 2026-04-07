'use client'

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ComponentGroup } from '@/lib/component-selection/types'
import { componentNameToFileName } from '@/pb.workspace/componentNameToFileName'
import {
  buildBackgroundPickerDraft,
  buildBackgroundPickerDraftFromHsl,
  buildBackgroundPickerDraftFromRgb,
  buildBackgroundToken,
  clampNumber,
  hslToRgb,
  parseHexColor,
  parseBackgroundToken,
  parseCssColorToRgb,
} from '@/lib/style-editor/background-color.mjs'
import {
  RADIUS_TOKEN_PATTERN,
  RAW_EDITOR_GROUPS,
  PINNED_BACKGROUND_COLOR_TOKENS,
  TAILWIND_COLOR_OPTIONS,
  shouldSuggestTailwindColors,
  getSelectedGroup,
  getBreadcrumb,
  toClassTokens,
  tokenizeClassInput,
  fromClassTokens,
  findToken,
  replaceTokens,
  tokenMatchesCategory,
  getCategoryText,
  getTokenValue,
  formatPaddingValueForInput,
  normalizePaddingValue,
  getLimitTokenValue,
  normalizeLimitValue,
  parseComparableLengthValue,
  guessPaddingMode,
  resolveTailwindColorValue,
  parseBorderColorToken,
  getInheritedCurrentColor,
  buildBorderColorToken,
  formatBorderWidthValueForDisplay,
  parseBorderWidthToken,
  borderWidthTokenPattern,
  getBorderWidthState,
  nextBorderWidthCycleValue,
  borderWidthValueToPreviewCss,
  normalizeRadiusValue,
  getRoundedValue,
  guessCornerRadiusMode,
  formatAxisValue,
  componentTitle,
  guessSizeMode,
  sizeModeLabel,
  guessDirection,
  guessToggle,
  removeSharedBorderWidthTokens,
  removeBorderWidthTokens,
  buildBorderWidthToken,
  getPaddingTokensForAxis,
} from '@/lib/style-editor/style-editor-helpers.mjs'

type StyleValue = string | string[]
type Styles = Record<string, StyleValue>
type PaddingMode = 'axes' | 'sides'
type PaddingAxis = 'x' | 'y'
type PaddingMarker = 'pl' | 'pr' | 'pt' | 'pb'
type CornerRadiusMode = 'linked' | 'independent'
type FullCornerKey = 'tl' | 'tr' | 'bl' | 'br'
type LimitAxis = 'width' | 'height'
type LimitKind = 'min' | 'max'
type LimitFieldKey = `${LimitAxis}-${LimitKind}`
type BackgroundPickerMode = 'hex' | 'rgb' | 'hsl'
type BorderWidthSide = 'top' | 'right' | 'bottom' | 'left'
type BorderWidthTarget = 'all' | 'x' | 'y' | BorderWidthSide
type RawEditorCategory =
  | 'padding'
  | 'margin'
  | 'limits'
  | 'flex'
  | 'text'
  | 'background'
  | 'border'
  | 'effects'
  | 'other'

interface StyleEditorProps {
  selectedComponent: string | null
  components: ComponentGroup[]
}

const DIRECTION_OPTIONS = [
  { label: 'Row', value: 'row', icon: '→' },
  { label: 'Column', value: 'col', icon: '↓' },
  { label: 'Grid', value: 'grid', icon: '⋮⋮' },
] as const

function switchTrackClass(isActive: boolean) {
  return `relative h-5 w-8 rounded-full transition ${isActive ? 'bg-emerald-500' : 'bg-zinc-300'}`
}

function switchThumbClass(isActive: boolean) {
  return `absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${isActive ? 'left-[14px]' : 'left-0.5'}`
}

function tinyLabelClass() {
  return '[font-family:var(--font-work-sans)] text-[11px] font-medium leading-[110%] text-black/70'
}

function tinyHintClass() {
  return '[font-family:var(--font-work-sans)] text-[10px] leading-[120%] text-black/45'
}

function fieldShellClass() {
  return 'flex h-6 items-center gap-1 rounded-lg bg-gray-100 px-2 text-[12px] font-medium text-black'
}

function markerClass(marker: PaddingMarker) {
  if (marker === 'pl' || marker === 'pr') {
    return 'absolute inset-y-0 w-[5px] rounded-full bg-gray-300'
  }

  return 'absolute inset-x-0 h-[5px] rounded-full bg-gray-300'
}

function markerPositionClass(marker: PaddingMarker) {
  switch (marker) {
    case 'pl':
      return 'left-0'
    case 'pr':
      return 'right-0'
    case 'pt':
      return 'top-0'
    case 'pb':
      return 'bottom-0'
  }
}

function paddingFieldInputClass(hasValue: boolean, markers: PaddingMarker[]) {
  const hasHorizontalMarkers = markers.includes('pl') || markers.includes('pr')
  const hasVerticalMarkers = markers.includes('pt') || markers.includes('pb')
  const base = hasValue
    ? 'h-8 w-full rounded-lg bg-gray-100 text-[12px] font-medium outline-none overflow-hidden'
    : 'h-8 w-full rounded-lg border border-dashed border-gray-300 text-[12px] font-medium outline-none overflow-hidden'
  const horizontalPadding = hasHorizontalMarkers ? 'px-[9px]' : 'px-3'
  const verticalPadding = hasVerticalMarkers ? 'py-[5px]' : ''

  return [base, horizontalPadding, verticalPadding].filter(Boolean).join(' ')
}

function limitFieldKey(axis: LimitAxis, kind: LimitKind): LimitFieldKey {
  return `${axis}-${kind}`
}

function PaddingField({
  value,
  onChange,
  selectOnFocus = false,
  hasValue,
  muted = false,
  cornerCue,
  placeholder,
  ariaLabel,
  markers,
}: {
  value: string
  onChange: (value: string) => void
  selectOnFocus?: boolean
  hasValue: boolean
  muted?: boolean
  cornerCue?: FullCornerKey
  placeholder: string
  ariaLabel: string
  markers: PaddingMarker[]
}) {
  return (
    <div className="relative">
      {cornerCue && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-lg border-transparent ${
            cornerCue === 'tl'
              ? 'border-l-2 border-t-2 border-l-gray-300 border-t-gray-300'
              : cornerCue === 'tr'
                ? 'border-r-2 border-t-2 border-r-gray-300 border-t-gray-300'
                : cornerCue === 'bl'
                  ? 'border-b-2 border-l-2 border-b-gray-300 border-l-gray-300'
                  : 'border-b-2 border-r-2 border-b-gray-300 border-r-gray-300'
          }`}
        />
      )}
      {markers.map((marker) => (
        <span
          key={marker}
          aria-hidden="true"
          className={`${markerClass(marker)} ${markerPositionClass(marker)}`}
        />
      ))}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          if (selectOnFocus) {
            event.currentTarget.select()
          }
        }}
        className={`${paddingFieldInputClass(hasValue, markers)} ${muted ? 'text-black/40' : 'text-black'}`}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  )
}

function LimitValueField({
  label,
  value,
  onChange,
  onClear,
  placeholder,
  ariaLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onClear: () => void
  placeholder: string
  ariaLabel: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-16 shrink-0 ${tinyLabelClass()}`}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-6 flex-1 rounded-lg bg-gray-100 px-3 text-[12px] font-medium text-black outline-none"
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        onClick={onClear}
        className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-zinc-500 transition hover:text-black"
        aria-label={`Remove ${ariaLabel}`}
        title={`Remove ${ariaLabel}`}
      >
        ×
      </button>
    </div>
  )
}

function ColorChannelField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-1">
      <span className={tinyLabelClass()}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          event.currentTarget.select()
        }}
        className="h-8 w-full rounded-lg bg-gray-100 px-2 text-[11px] font-medium text-black outline-none"
      />
    </label>
  )
}

function BorderWeightField({
  side,
  value,
  placeholder,
  onChange,
  onActivate,
  onRemove,
}: {
  side: BorderWidthSide
  value: string
  placeholder: string
  onChange: (value: string) => void
  onActivate: () => void
  onRemove: () => void
}) {
  const isVertical = side === 'top' || side === 'bottom'
  const displayValue = formatBorderWidthValueForDisplay(value)
  const displayPlaceholder = formatBorderWidthValueForDisplay(placeholder)
  const hasExplicitValue = Boolean(value)
  const wrapperClass = [
    'rounded-[4px] px-0.5 py-1.5 transition',
    hasExplicitValue ? 'bg-[#f1f3f4]' : 'bg-[#f1f3f4]/35',
    isVertical ? 'flex flex-col items-center gap-px' : 'flex items-center gap-px',
  ].join(' ')
  const actionButton = (
    <button
      type="button"
      onClick={hasExplicitValue ? onRemove : onActivate}
      className="grid h-[20px] w-[20px] shrink-0 place-items-center self-center rounded text-black transition"
      aria-label={
        hasExplicitValue
          ? `Remove ${side} border width`
          : `Use an independent ${side} border width`
      }
      title={
        hasExplicitValue
          ? `Remove ${side} border width`
          : `Use an independent ${side} border width`
      }
    >
      <span className="block text-[20px] font-normal leading-none">
        {hasExplicitValue ? '−' : '+'}
      </span>
    </button>
  )

  return (
    <div className={wrapperClass}>
      {side === 'left' || side === 'top' ? actionButton : null}
      <input
        value={displayValue}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          event.currentTarget.select()
        }}
        className={[
          'bg-transparent text-[16px] font-semibold leading-[140%] text-black outline-none placeholder:text-black/20',
          'opacity-100',
          isVertical
            ? 'h-[18px] w-full text-center'
            : hasExplicitValue
              ? 'h-[18px] w-full text-center'
              : 'h-[18px] min-w-0 flex-1 text-center',
        ].join(' ')}
        placeholder={displayPlaceholder}
        aria-label={`${side} border width`}
      />
      {side === 'right' || side === 'bottom' ? actionButton : null}
    </div>
  )
}

function BackgroundColorCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const listboxId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [inputValue, setInputValue] = useState(value)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const filteredOptions = useMemo(() => {
    const trimmedValue = inputValue.trim().toLowerCase()
    if (!shouldSuggestTailwindColors(inputValue)) return []
    if (!trimmedValue) return TAILWIND_COLOR_OPTIONS.slice(0, 24)

    return TAILWIND_COLOR_OPTIONS.filter((option) => option.token.includes(trimmedValue)).slice(0, 24)
  }, [inputValue])
  const hasPinnedOptions = filteredOptions.some((option) =>
    PINNED_BACKGROUND_COLOR_TOKENS.includes(
      option.token as (typeof PINNED_BACKGROUND_COLOR_TOKENS)[number]
    )
  )

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen])

  const commitValue = (nextValue: string) => {
    const trimmedValue = nextValue.trim()
    if (!trimmedValue) {
      setInputValue(value)
      return
    }

    onChange(trimmedValue)
  }

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <input
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value)
          setHighlightedIndex(0)
          setIsOpen(true)
        }}
        onFocus={() => {
          setHighlightedIndex(0)
          setIsOpen(true)
        }}
        onBlur={() => {
          commitValue(inputValue)
        }}
        onKeyDown={(event) => {
          if (!filteredOptions.length) {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitValue(inputValue)
              setIsOpen(false)
            }
            if (event.key === 'Escape') {
              setInputValue(value)
              setIsOpen(false)
            }
            return
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setIsOpen(true)
            setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1))
            return
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setIsOpen(true)
            setHighlightedIndex((prev) => Math.max(prev - 1, 0))
            return
          }

          if (event.key === 'Enter' && isOpen) {
            const highlightedOption = filteredOptions[highlightedIndex]
            if (highlightedOption) {
              event.preventDefault()
              setInputValue(highlightedOption.token)
              onChange(highlightedOption.token)
              setIsOpen(false)
            } else {
              event.preventDefault()
              commitValue(inputValue)
              setIsOpen(false)
            }
            return
          }

          if (event.key === 'Escape') {
            setInputValue(value)
            setIsOpen(false)
          }
        }}
        className="h-6 w-full rounded-lg bg-gray-100 px-3 text-[10px] font-medium text-black/70 outline-none"
        placeholder="emerald-100"
        aria-label="Background color"
        aria-controls={isOpen && filteredOptions.length > 0 ? listboxId : undefined}
        aria-expanded={isOpen && filteredOptions.length > 0}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        role="combobox"
      />

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute left-0 right-0 top-7 z-20 max-h-52 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
          <div
            id={listboxId}
            role="listbox"
            aria-label="Tailwind background colors"
            className="space-y-1"
          >
            {filteredOptions.map((option, index) => (
              <button
                key={option.token}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  setInputValue(option.token)
                  onChange(option.token)
                  setIsOpen(false)
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(index)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition ${
                  highlightedIndex === index ? 'bg-zinc-100 text-black' : 'text-zinc-700'
                }`}
                style={{
                  borderTop:
                    hasPinnedOptions && index > 0 && !PINNED_BACKGROUND_COLOR_TOKENS.includes(
                      option.token as (typeof PINNED_BACKGROUND_COLOR_TOKENS)[number]
                    ) &&
                    PINNED_BACKGROUND_COLOR_TOKENS.includes(
                      filteredOptions[index - 1]
                        ?.token as (typeof PINNED_BACKGROUND_COLOR_TOKENS)[number]
                    )
                      ? '1px solid rgb(228 228 231)'
                      : undefined,
                  marginTop:
                    hasPinnedOptions && index > 0 && !PINNED_BACKGROUND_COLOR_TOKENS.includes(
                      option.token as (typeof PINNED_BACKGROUND_COLOR_TOKENS)[number]
                    ) &&
                    PINNED_BACKGROUND_COLOR_TOKENS.includes(
                      filteredOptions[index - 1]
                        ?.token as (typeof PINNED_BACKGROUND_COLOR_TOKENS)[number]
                    )
                      ? '0.25rem'
                      : undefined,
                  paddingTop:
                    hasPinnedOptions && index > 0 && !PINNED_BACKGROUND_COLOR_TOKENS.includes(
                      option.token as (typeof PINNED_BACKGROUND_COLOR_TOKENS)[number]
                    ) &&
                    PINNED_BACKGROUND_COLOR_TOKENS.includes(
                      filteredOptions[index - 1]
                        ?.token as (typeof PINNED_BACKGROUND_COLOR_TOKENS)[number]
                    )
                      ? '0.5rem'
                      : undefined,
                }}
                role="option"
                aria-selected={highlightedIndex === index}
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: option.value }}
                />
                <span className="min-w-0 flex-1 truncate">{option.token}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function parsePickerDraftNumber(value: string, fallback: number) {
  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

function BackgroundColorMap({
  mode,
  draft,
  onRgbChange,
  onHslChange,
}: {
  mode: BackgroundPickerMode
  draft: {
    red: string
    green: string
    blue: string
    hue: string
    saturation: string
    lightness: string
  }
  onRgbChange: (channel: 'red' | 'green' | 'blue', value: string) => void
  onHslChange: (channel: 'hue' | 'saturation' | 'lightness', value: string) => void
}) {
  const red = clampNumber(parsePickerDraftNumber(draft.red, 255), 0, 255)
  const green = clampNumber(parsePickerDraftNumber(draft.green, 255), 0, 255)
  const blue = clampNumber(parsePickerDraftNumber(draft.blue, 255), 0, 255)
  const hue = clampNumber(parsePickerDraftNumber(draft.hue, 0), 0, 360)
  const saturation = clampNumber(parsePickerDraftNumber(draft.saturation, 100), 0, 100)
  const lightness = clampNumber(parsePickerDraftNumber(draft.lightness, 50), 0, 100)
  const hslPreview = hslToRgb(hue, saturation, lightness)

  const colorSpaceMode = mode === 'rgb' ? 'rgb' : 'hsl'
  const isHexMode = mode === 'hex'
  const planeXRatio = saturation / 100
  const planeYRatio = 1 - lightness / 100
  const sliderRatio = hue / 360
  const planeBackground =
    `linear-gradient(to top, hsl(${hue} 100% 0%), transparent), linear-gradient(to right, hsl(${hue} 0% 50%), hsl(${hue} 100% 50%))`
  const sliderBackground =
    'linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))'
  const indicatorColor =
    colorSpaceMode === 'rgb'
      ? `rgb(${red} ${green} ${blue})`
      : `rgb(${hslPreview.red} ${hslPreview.green} ${hslPreview.blue})`

  const updatePlane = (clientX: number, clientY: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect()
    const xRatio = clampNumber((clientX - rect.left) / rect.width, 0, 1)
    const yRatio = clampNumber((clientY - rect.top) / rect.height, 0, 1)

    onHslChange('saturation', `${Math.round(xRatio * 100)}`)
    onHslChange('lightness', `${Math.round((1 - yRatio) * 100)}`)
  }

  const updateSlider = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect()
    const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1)

    onHslChange('hue', `${Math.round(ratio * 360)}`)
  }

  const renderRgbSlider = (
    channel: 'red' | 'green' | 'blue',
    label: string,
    value: number,
    backgroundImage: string
  ) => (
    <div key={channel} className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={tinyLabelClass()}>{label}</span>
        <span className={tinyLabelClass()}>{value}</span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${label} channel slider`}
        aria-valuemin={0}
        aria-valuemax={255}
        aria-valuenow={value}
        onPointerDown={(event) => {
          const target = event.currentTarget
          target.setPointerCapture(event.pointerId)
          const rect = target.getBoundingClientRect()
          const ratio = clampNumber((event.clientX - rect.left) / rect.width, 0, 1)
          onRgbChange(channel, `${Math.round(ratio * 255)}`)
        }}
        onPointerMove={(event) => {
          if ((event.buttons & 1) !== 1) return
          const rect = event.currentTarget.getBoundingClientRect()
          const ratio = clampNumber((event.clientX - rect.left) / rect.width, 0, 1)
          onRgbChange(channel, `${Math.round(ratio * 255)}`)
        }}
        className="relative h-4 w-full cursor-ew-resize rounded-full border border-zinc-200"
        style={{ backgroundImage }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-black/70 shadow-sm"
          style={{ left: `${(value / 255) * 100}%` }}
        />
      </div>
    </div>
  )

  if (colorSpaceMode === 'rgb') {
    return (
      <div className="space-y-2">
        {renderRgbSlider(
          'red',
          'Red',
          red,
          `linear-gradient(to right, rgb(0 ${green} ${blue}), rgb(255 ${green} ${blue}))`
        )}
        {renderRgbSlider(
          'green',
          'Green',
          green,
          `linear-gradient(to right, rgb(${red} 0 ${blue}), rgb(${red} 255 ${blue}))`
        )}
        {renderRgbSlider(
          'blue',
          'Blue',
          blue,
          `linear-gradient(to right, rgb(${red} ${green} 0), rgb(${red} ${green} 255))`
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <span className={tinyLabelClass()}>
        {isHexMode ? 'Visual picker' : 'Saturation / Lightness plane'}
      </span>

      <div
        role="slider"
        tabIndex={0}
        aria-label={isHexMode ? 'Hex visual color map' : 'HSL color map'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(planeXRatio * 100)}
        onPointerDown={(event) => {
          const target = event.currentTarget
          target.setPointerCapture(event.pointerId)
          updatePlane(event.clientX, event.clientY, target)
        }}
        onPointerMove={(event) => {
          if ((event.buttons & 1) !== 1) return
          updatePlane(event.clientX, event.clientY, event.currentTarget)
        }}
        className="relative h-36 w-full cursor-crosshair overflow-hidden rounded-xl border border-zinc-200"
        style={{
          backgroundImage: planeBackground,
        }}
      >
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ring-1 ring-black/20"
          style={{
            left: `${planeXRatio * 100}%`,
            top: `${planeYRatio * 100}%`,
            backgroundColor: indicatorColor,
          }}
        />
      </div>

      <span className={tinyLabelClass()}>
        {isHexMode ? 'Hue refine' : 'Hue slider'}
      </span>
      <div
        role="slider"
        tabIndex={0}
        aria-label={isHexMode ? 'Hex hue refine slider' : 'Hue channel slider'}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={hue}
        onPointerDown={(event) => {
          const target = event.currentTarget
          target.setPointerCapture(event.pointerId)
          updateSlider(event.clientX, target)
        }}
        onPointerMove={(event) => {
          if ((event.buttons & 1) !== 1) return
          updateSlider(event.clientX, event.currentTarget)
        }}
        className="relative h-4 w-full cursor-ew-resize rounded-full border border-zinc-200"
        style={{
          backgroundImage: sliderBackground,
        }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-black/70 shadow-sm"
          style={{
            left: `${sliderRatio * 100}%`,
          }}
        />
      </div>
    </div>
  )
}

function BackgroundOpacitySlider({
  colorValue,
  opacityValue,
  onChange,
}: {
  colorValue: string
  opacityValue: string
  onChange: (value: string) => void
}) {
  const normalizedOpacity = clampNumber(parsePickerDraftNumber(opacityValue, 100), 0, 100)
  const resolvedColor = resolveTailwindColorValue(colorValue) ?? '#ffffff'
  const sliderRgb = parseCssColorToRgb(resolvedColor) ?? { red: 255, green: 255, blue: 255 }
  const sliderBackground = [
    'repeating-conic-gradient(#d4d4d8 0% 25%, #f4f4f5 0% 50%)',
    `linear-gradient(to right, rgb(${sliderRgb.red} ${sliderRgb.green} ${sliderRgb.blue} / 0), rgb(${sliderRgb.red} ${sliderRgb.green} ${sliderRgb.blue} / 1))`,
  ].join(', ')

  const updateSlider = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect()
    const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1)
    onChange(`${Math.round(ratio * 100)}`)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={tinyLabelClass()}>Opacity</span>
        <span className={tinyLabelClass()}>{normalizedOpacity}%</span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Background opacity slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalizedOpacity}
        onPointerDown={(event) => {
          const target = event.currentTarget
          target.setPointerCapture(event.pointerId)
          updateSlider(event.clientX, target)
        }}
        onPointerMove={(event) => {
          if ((event.buttons & 1) !== 1) return
          updateSlider(event.clientX, event.currentTarget)
        }}
        className="relative h-2.5 w-full cursor-ew-resize rounded-full border border-zinc-200"
        style={{
          backgroundColor: '#f4f4f5',
          backgroundImage: sliderBackground,
          backgroundPosition: '0 0, 0 0',
          backgroundSize: '8px 8px, 100% 100%',
        }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-black/70 shadow-sm"
          style={{
            left: `${normalizedOpacity}%`,
          }}
        />
      </div>
    </div>
  )
}

function RawClassTextarea({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  placeholder: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [value])

  return (
    <label className="block space-y-1">
      <span className={tinyLabelClass()}>{label}</span>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        rows={1}
        className="min-h-[46px] w-full overflow-hidden resize-none rounded-2xl bg-zinc-50 px-3 py-3 font-mono text-xs text-zinc-700 outline-none ring-1 ring-zinc-200"
        placeholder={placeholder}
      />
    </label>
  )
}

function PlaceholderBadge() {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
      Placeholder
    </span>
  )
}

export function StyleEditor({ selectedComponent, components }: StyleEditorProps) {
  const [styles, setStyles] = useState<Styles>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [paddingModeOverride, setPaddingModeOverride] = useState<PaddingMode | null>(null)
  const [cornerRadiusModeOverride, setCornerRadiusModeOverride] = useState<CornerRadiusMode | null>(null)
  const [visibleLimitFields, setVisibleLimitFields] = useState<Record<LimitFieldKey, boolean>>({
    'width-min': false,
    'width-max': false,
    'height-min': false,
    'height-max': false,
  })
  const [activeLimitMenu, setActiveLimitMenu] = useState<LimitAxis | null>(null)
  const [rawClassDrafts, setRawClassDrafts] = useState<Record<RawEditorCategory, string>>({
    padding: '',
    margin: '',
    limits: '',
    flex: '',
    text: '',
    background: '',
    border: '',
    effects: '',
    other: '',
  })
  const [activeRawEditor, setActiveRawEditor] = useState<RawEditorCategory | null>(null)
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false)
  const [backgroundPickerMode, setBackgroundPickerMode] = useState<BackgroundPickerMode>('hex')
  const [backgroundPickerDraft, setBackgroundPickerDraft] = useState(() =>
    buildBackgroundPickerDraft('#ffffff')
  )
  const backgroundPickerRef = useRef<HTMLDivElement | null>(null)
  const [isBorderPickerOpen, setIsBorderPickerOpen] = useState(false)
  const [borderPickerMode, setBorderPickerMode] = useState<BackgroundPickerMode>('hex')
  const [borderPickerDraft, setBorderPickerDraft] = useState(() =>
    buildBackgroundPickerDraft('#d4d4d8')
  )
  const borderPickerRef = useRef<HTMLDivElement | null>(null)

  const breadcrumb = getBreadcrumb(selectedComponent, components)
  const selectedGroup = useMemo(
    () => getSelectedGroup(selectedComponent, components),
    [components, selectedComponent]
  )
  const selectedFileName = selectedGroup ? componentNameToFileName(selectedGroup.name) : null
  const selectedStyleValue = selectedComponent ? styles[selectedComponent] : undefined
  const classTokens = useMemo(
    () => toClassTokens(selectedStyleValue),
    [selectedStyleValue]
  )
  const rawCategoryTexts = useMemo(
    () =>
      RAW_EDITOR_GROUPS.reduce(
        (acc, group) => {
          acc[group.key] = getCategoryText(classTokens, group.key)
          return acc
        },
        {} as Record<RawEditorCategory, string>
      ),
    [classTokens]
  )
  const widthMode = guessSizeMode(classTokens, 'w')
  const heightMode = guessSizeMode(classTokens, 'h')
  const directionMode = guessDirection(classTokens)
  const isFlex = guessToggle(classTokens, 'flex')
  const clipsContent = classTokens.includes('overflow-hidden') || classTokens.includes('overflow-clip')
  const gapClass = findToken(classTokens, /^gap-.+/)
  const backgroundClass = findToken(classTokens, /^bg-(?!clip-padding$).+/)
  const backgroundDetails = parseBackgroundToken(backgroundClass)
  const backgroundPreviewColor = resolveTailwindColorValue(backgroundDetails.colorValue)
  const backgroundPreviewOpacity = Number.parseInt(backgroundDetails.opacityValue, 10)
  const backgroundPickerBaseColor = backgroundPreviewColor ?? '#ffffff'
  const hasBackgroundColor = Boolean(backgroundDetails.colorValue)
  const borderColorClass = findToken(
    classTokens,
    /^border-(?![trblxy]$)(?!0$)(?!2$)(?!4$)(?!8$)(?!solid$)(?!dashed$)(?!none$).+/
  )
  const borderDetails = parseBorderColorToken(borderColorClass)
  const borderPreviewColor = resolveTailwindColorValue(borderDetails.colorValue)
  const borderPreviewOpacity = Number.parseInt(borderDetails.opacityValue, 10)
  const borderPickerBaseColor = borderPreviewColor ?? '#d4d4d8'
  const hasBorderColor = Boolean(borderDetails.colorValue)
  const borderWidthState = getBorderWidthState(classTokens)
  const inheritedBorderColor = getInheritedCurrentColor(classTokens)
  const borderWeightPreviewColorBase = borderPreviewColor ?? inheritedBorderColor.previewColor
  const borderWeightPreviewOpacity = Number.isNaN(borderPreviewOpacity)
    ? 1
    : Math.min(100, Math.max(0, borderPreviewOpacity)) / 100
  const borderWeightPreviewColor =
    borderWeightPreviewOpacity >= 1
      ? borderWeightPreviewColorBase
      : `color-mix(in srgb, ${borderWeightPreviewColorBase} ${borderWeightPreviewOpacity * 100}%, transparent)`
  const hasBorderNone = classTokens.includes('border-none')
  const centerBorderWeightValue =
    !borderWidthState.hasSideOverrides && borderWidthState.allValue !== 'none'
      ? formatBorderWidthValueForDisplay(borderWidthState.allValue)
      : ''
  const isCenterBorderWeightActive = Boolean(centerBorderWeightValue)
  const centerBorderWeightPlaceholder = hasBorderNone
    ? 'none'
    : borderWidthState.hasSideOverrides
      ? '0'
      : formatBorderWidthValueForDisplay(borderWidthState.allValue || '0px')
  const borderWeightPreviewStyle = borderWidthState.hasSideOverrides
    ? {
        borderTopWidth: borderWidthValueToPreviewCss(borderWidthState.topExplicit),
        borderRightWidth: borderWidthValueToPreviewCss(borderWidthState.rightExplicit),
        borderBottomWidth: borderWidthValueToPreviewCss(borderWidthState.bottomExplicit),
        borderLeftWidth: borderWidthValueToPreviewCss(borderWidthState.leftExplicit),
        borderStyle: 'solid',
        borderColor: borderWeightPreviewColor,
      }
    : borderWidthState.allValue && borderWidthState.allValue !== 'none'
      ? {
          borderWidth: borderWidthValueToPreviewCss(borderWidthState.allValue),
          borderStyle: 'solid',
          borderColor: borderWeightPreviewColor,
        }
      : hasBorderNone
        ? {
            borderWidth: '0px',
            borderStyle: 'solid',
            borderColor: borderWeightPreviewColor,
          }
        : {
            borderWidth: '1px',
            borderStyle: 'dashed',
            borderColor: borderWeightPreviewColor,
          };
  const minWidthClass = findToken(classTokens, /^min-w-.+/)
  const maxWidthClass = findToken(classTokens, /^max-w-.+/)
  const minHeightClass = findToken(classTokens, /^min-h-.+/)
  const maxHeightClass = findToken(classTokens, /^max-h-.+/)
  const minWidthValue = getLimitTokenValue(minWidthClass, 'min-w')
  const maxWidthValue = getLimitTokenValue(maxWidthClass, 'max-w')
  const minHeightValue = getLimitTokenValue(minHeightClass, 'min-h')
  const maxHeightValue = getLimitTokenValue(maxHeightClass, 'max-h')
  const comparableMinWidthValue = parseComparableLengthValue(minWidthValue)
  const comparableMaxWidthValue = parseComparableLengthValue(maxWidthValue)
  const hasWidthLimitConflict =
    comparableMinWidthValue != null &&
    comparableMaxWidthValue != null &&
    comparableMinWidthValue.unit === comparableMaxWidthValue.unit &&
    comparableMinWidthValue.amount > comparableMaxWidthValue.amount
  const paddingXClass = findToken(classTokens, /^px-.+/)
  const paddingYClass = findToken(classTokens, /^py-.+/)
  const paddingLeftClass = findToken(classTokens, /^pl-.+/)
  const paddingRightClass = findToken(classTokens, /^pr-.+/)
  const paddingTopClass = findToken(classTokens, /^pt-.+/)
  const paddingBottomClass = findToken(classTokens, /^pb-.+/)
  const paddingMode = paddingModeOverride ?? guessPaddingMode(classTokens)
  const paddingLeftValue =
    formatPaddingValueForInput(getTokenValue(paddingLeftClass, 'pl')) ||
    formatPaddingValueForInput(getTokenValue(paddingXClass, 'px'))
  const paddingRightValue =
    formatPaddingValueForInput(getTokenValue(paddingRightClass, 'pr')) ||
    formatPaddingValueForInput(getTokenValue(paddingXClass, 'px'))
  const paddingTopValue =
    formatPaddingValueForInput(getTokenValue(paddingTopClass, 'pt')) ||
    formatPaddingValueForInput(getTokenValue(paddingYClass, 'py'))
  const paddingBottomValue =
    formatPaddingValueForInput(getTokenValue(paddingBottomClass, 'pb')) ||
    formatPaddingValueForInput(getTokenValue(paddingYClass, 'py'))
  const paddingAxisXValue = formatAxisValue(paddingLeftValue, paddingRightValue)
  const paddingAxisYValue = formatAxisValue(paddingTopValue, paddingBottomValue)
  const cornerRadiusMode = cornerRadiusModeOverride ?? guessCornerRadiusMode(classTokens)
  const radiusAllValue = getRoundedValue(classTokens, 'all')
  const radiusTopValue = getRoundedValue(classTokens, 't')
  const radiusRightValue = getRoundedValue(classTokens, 'r')
  const radiusBottomValue = getRoundedValue(classTokens, 'b')
  const radiusLeftValue = getRoundedValue(classTokens, 'l')
  const radiusTopLeftValue =
    getRoundedValue(classTokens, 'tl') ?? radiusTopValue ?? radiusLeftValue ?? radiusAllValue ?? ''
  const radiusTopRightValue =
    getRoundedValue(classTokens, 'tr') ?? radiusTopValue ?? radiusRightValue ?? radiusAllValue ?? ''
  const radiusBottomLeftValue =
    getRoundedValue(classTokens, 'bl') ?? radiusBottomValue ?? radiusLeftValue ?? radiusAllValue ?? ''
  const radiusBottomRightValue =
    getRoundedValue(classTokens, 'br') ?? radiusBottomValue ?? radiusRightValue ?? radiusAllValue ?? ''
  const radiusLinkedValue = radiusAllValue ?? radiusTopLeftValue
  const hasExplicitCornerRadius = classTokens.some((token) => /^rounded-(tl|tr|bl|br)-.+$/.test(token))
  const linkedShowsVarious =
    hasExplicitCornerRadius ||
    radiusTopLeftValue !== radiusTopRightValue ||
    radiusTopLeftValue !== radiusBottomLeftValue ||
    radiusTopLeftValue !== radiusBottomRightValue
  const radiusLinkedDisplayValue = linkedShowsVarious ? 'Varies (Independent)' : radiusLinkedValue
  const independentGhostedCorners = {
    tr: !getRoundedValue(classTokens, 'tr') && Boolean(radiusAllValue),
    bl: !getRoundedValue(classTokens, 'bl') && Boolean(radiusAllValue),
    br: !getRoundedValue(classTokens, 'br') && Boolean(radiusAllValue),
  }

  useEffect(() => {
    if (!selectedFileName) {
      setStyles({})
      return
    }

    let cancelled = false
    setIsLoading(true)
    setSaveMessage('')

    fetch(`/api/save-styles?fileName=${encodeURIComponent(selectedFileName)}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error ?? 'Failed to load styles')
        }
        if (!cancelled) {
          setStyles((data?.styles ?? {}) as Styles)
        }
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) {
          setStyles({})
          setSaveMessage('Failed to load styles')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedFileName])

  useEffect(() => {
    setPaddingModeOverride(null)
    setCornerRadiusModeOverride(null)
    setVisibleLimitFields({
      'width-min': false,
      'width-max': false,
      'height-min': false,
      'height-max': false,
    })
    setActiveLimitMenu(null)
    setIsBackgroundPickerOpen(false)
    setIsBorderPickerOpen(false)
  }, [selectedComponent])

  useEffect(() => {
    if (!isBackgroundPickerOpen) return
    setBackgroundPickerDraft(buildBackgroundPickerDraft(backgroundPickerBaseColor))
  }, [backgroundPickerBaseColor, isBackgroundPickerOpen])

  useEffect(() => {
    if (!isBorderPickerOpen) return
    setBorderPickerDraft(buildBackgroundPickerDraft(borderPickerBaseColor))
  }, [borderPickerBaseColor, isBorderPickerOpen])

  useEffect(() => {
    if (!isBackgroundPickerOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!backgroundPickerRef.current?.contains(event.target as Node)) {
        setIsBackgroundPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isBackgroundPickerOpen])

  useEffect(() => {
    if (!isBorderPickerOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!borderPickerRef.current?.contains(event.target as Node)) {
        setIsBorderPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isBorderPickerOpen])

  useEffect(() => {
    setVisibleLimitFields((prev) => ({
      'width-min': prev['width-min'] || Boolean(minWidthClass),
      'width-max': prev['width-max'] || Boolean(maxWidthClass),
      'height-min': prev['height-min'] || Boolean(minHeightClass),
      'height-max': prev['height-max'] || Boolean(maxHeightClass),
    }))
  }, [maxHeightClass, maxWidthClass, minHeightClass, minWidthClass])

  useEffect(() => {
    setRawClassDrafts((prev) => {
      let changed = false
      const nextDrafts = { ...prev }

      RAW_EDITOR_GROUPS.forEach((group) => {
        if (activeRawEditor === group.key) return
        const nextValue = rawCategoryTexts[group.key]
        if (nextDrafts[group.key] !== nextValue) {
          nextDrafts[group.key] = nextValue
          changed = true
        }
      })

      return changed ? nextDrafts : prev
    })
  }, [activeRawEditor, rawCategoryTexts])

  const updateSelectedStyle = (nextTokens: string[]) => {
    if (!selectedComponent) return

    setStyles((prev) => ({
      ...prev,
      [selectedComponent]: fromClassTokens(nextTokens, prev[selectedComponent]),
    }))
  }

  const updateSingleField = (pattern: RegExp, nextValue: string) => {
    const nextTokens = replaceTokens(classTokens, pattern, nextValue ? [nextValue] : [])
    updateSelectedStyle(nextTokens)
  }

  const updateBorderWidth = (target: BorderWidthTarget, nextValue: string) => {
    if (target === 'all') {
      const nextTokens = removeBorderWidthTokens(classTokens)
      const nextToken = buildBorderWidthToken('all', nextValue)
      updateSelectedStyle(nextToken ? [...nextTokens, nextToken] : nextTokens)
      return
    }

    const nextToken = buildBorderWidthToken(target, nextValue)
    const nextTokens = replaceTokens(
      classTokens,
      borderWidthTokenPattern(target),
      nextToken ? [nextToken] : []
    )
    updateSelectedStyle(nextTokens)
  }

  const activateSideBorderWidth = (side: BorderWidthSide) => {
    const sideValue =
      side === 'top'
        ? borderWidthState.topExplicit
        : side === 'right'
          ? borderWidthState.rightExplicit
          : side === 'bottom'
            ? borderWidthState.bottomExplicit
            : borderWidthState.leftExplicit

    if (sideValue) {
      updateBorderWidth(side, nextBorderWidthCycleValue(sideValue))
      return
    }

    const fallbackValue =
      (side === 'top'
        ? borderWidthState.effectiveTop
        : side === 'right'
          ? borderWidthState.effectiveRight
          : side === 'bottom'
            ? borderWidthState.effectiveBottom
            : borderWidthState.effectiveLeft) ||
      borderWidthState.uniformValue ||
      borderWidthState.allValue ||
      '1px'

    const nextTokens = removeSharedBorderWidthTokens(classTokens)
    const nextToken = buildBorderWidthToken(side, fallbackValue === 'none' ? '1px' : fallbackValue)
    updateSelectedStyle(nextToken ? [...nextTokens, nextToken] : nextTokens)
  }

  const handleBackgroundColorChange = (nextValue: string) => {
    updateSingleField(
      /^bg-(?!clip-padding$).+/,
      buildBackgroundToken(nextValue, backgroundDetails.opacityValue)
    )
  }

  const handleBackgroundOpacityChange = (nextValue: string) => {
    updateSingleField(
      /^bg-(?!clip-padding$).+/,
      buildBackgroundToken(backgroundDetails.colorValue, nextValue)
    )
  }

  const handleAddBackgroundColor = () => {
    if (backgroundDetails.colorValue) return
    updateSingleField(/^bg-(?!clip-padding$).+/, 'bg-neutral-100')
  }

  const handleRemoveBackgroundColor = () => {
    updateSingleField(/^bg-(?!clip-padding$).+/, '')
    setIsBackgroundPickerOpen(false)
  }

  const applyBackgroundPickerColor = (nextColorValue: string) => {
    handleBackgroundColorChange(nextColorValue)
  }

  const handleBackgroundPickerHexChange = (nextValue: string) => {
    const parsedHex = parseHexColor(nextValue)
    if (!parsedHex) {
      setBackgroundPickerDraft((prev) => ({ ...prev, hex: nextValue }))
      return
    }

    setBackgroundPickerDraft(
      buildBackgroundPickerDraftFromRgb(parsedHex.red, parsedHex.green, parsedHex.blue)
    )
    applyBackgroundPickerColor(nextValue)
  }

  const handleBackgroundPickerRgbChange = (
    channel: 'red' | 'green' | 'blue',
    nextValue: string
  ) => {
    setBackgroundPickerDraft((prev) => {
      const nextDraft = { ...prev, [channel]: nextValue }
      const red = Number.parseInt(nextDraft.red, 10)
      const green = Number.parseInt(nextDraft.green, 10)
      const blue = Number.parseInt(nextDraft.blue, 10)

      if ([red, green, blue].every((value) => Number.isFinite(value) && value >= 0 && value <= 255)) {
        const resolvedDraft = buildBackgroundPickerDraftFromRgb(red, green, blue)
        applyBackgroundPickerColor(`rgb(${red} ${green} ${blue})`)
        return {
          ...resolvedDraft,
          red: nextDraft.red,
          green: nextDraft.green,
          blue: nextDraft.blue,
        }
      }

      return nextDraft
    })
  }

  const handleBackgroundPickerHslChange = (
    channel: 'hue' | 'saturation' | 'lightness',
    nextValue: string
  ) => {
    setBackgroundPickerDraft((prev) => {
      const nextDraft = { ...prev, [channel]: nextValue }
      const hue = Number.parseInt(nextDraft.hue, 10)
      const saturation = Number.parseInt(nextDraft.saturation, 10)
      const lightness = Number.parseInt(nextDraft.lightness, 10)

      if (
        Number.isFinite(hue) &&
        Number.isFinite(saturation) &&
        Number.isFinite(lightness) &&
        saturation >= 0 &&
        saturation <= 100 &&
        lightness >= 0 &&
        lightness <= 100
      ) {
        const resolvedDraft = buildBackgroundPickerDraftFromHsl(hue, saturation, lightness)
        applyBackgroundPickerColor(`hsl(${hue} ${saturation}% ${lightness}%)`)
        return {
          ...resolvedDraft,
          hue: nextDraft.hue,
          saturation: nextDraft.saturation,
          lightness: nextDraft.lightness,
        }
      }

      return nextDraft
    })
  }

  const handleBorderColorChange = (nextValue: string) => {
    updateSingleField(
      /^border-(?![trblxy]$)(?!0$)(?!2$)(?!4$)(?!8$)(?!solid$)(?!dashed$)(?!none$).+/,
      buildBorderColorToken(nextValue, borderDetails.opacityValue)
    )
  }

  const handleBorderOpacityChange = (nextValue: string) => {
    updateSingleField(
      /^border-(?![trblxy]$)(?!0$)(?!2$)(?!4$)(?!8$)(?!solid$)(?!dashed$)(?!none$).+/,
      buildBorderColorToken(borderDetails.colorValue, nextValue)
    )
  }

  const handleAddBorderColor = () => {
    if (borderDetails.colorValue) return

    const nextTokens = [...classTokens]
    const withoutBorderColor = replaceTokens(
      nextTokens,
      /^border-(?![trblxy]$)(?!0$)(?!2$)(?!4$)(?!8$)(?!solid$)(?!dashed$)(?!none$).+/,
      ['border-neutral-800']
    )
    const withoutBorderNone = withoutBorderColor.filter((token) => token !== 'border-none')
    const nextBorderState = getBorderWidthState(withoutBorderNone)
    const hasAnyBorderWidth = nextBorderState.allValue || nextBorderState.hasSideOverrides

    updateSelectedStyle(hasAnyBorderWidth ? withoutBorderNone : [...withoutBorderNone, 'border'])
  }

  const handleRemoveBorderColor = () => {
    const nextTokens = classTokens.filter((token) => {
      if (/^border-(?![trblxy]$)(?!0$)(?!2$)(?!4$)(?!8$)(?!solid$)(?!dashed$)(?!none$).+/.test(token)) {
        return false
      }

      return parseBorderWidthToken(token) == null
    })

    updateSelectedStyle(nextTokens)
    setIsBorderPickerOpen(false)
  }

  const applyBorderPickerColor = (nextColorValue: string) => {
    handleBorderColorChange(nextColorValue)
  }

  const handleBorderPickerHexChange = (nextValue: string) => {
    const parsedHex = parseHexColor(nextValue)
    if (!parsedHex) {
      setBorderPickerDraft((prev) => ({ ...prev, hex: nextValue }))
      return
    }

    setBorderPickerDraft(
      buildBackgroundPickerDraftFromRgb(parsedHex.red, parsedHex.green, parsedHex.blue)
    )
    applyBorderPickerColor(nextValue)
  }

  const handleBorderPickerRgbChange = (
    channel: 'red' | 'green' | 'blue',
    nextValue: string
  ) => {
    setBorderPickerDraft((prev) => {
      const nextDraft = { ...prev, [channel]: nextValue }
      const red = Number.parseInt(nextDraft.red, 10)
      const green = Number.parseInt(nextDraft.green, 10)
      const blue = Number.parseInt(nextDraft.blue, 10)

      if ([red, green, blue].every((value) => Number.isFinite(value) && value >= 0 && value <= 255)) {
        const resolvedDraft = buildBackgroundPickerDraftFromRgb(red, green, blue)
        applyBorderPickerColor(`rgb(${red} ${green} ${blue})`)
        return {
          ...resolvedDraft,
          red: nextDraft.red,
          green: nextDraft.green,
          blue: nextDraft.blue,
        }
      }

      return nextDraft
    })
  }

  const handleBorderPickerHslChange = (
    channel: 'hue' | 'saturation' | 'lightness',
    nextValue: string
  ) => {
    setBorderPickerDraft((prev) => {
      const nextDraft = { ...prev, [channel]: nextValue }
      const hue = Number.parseInt(nextDraft.hue, 10)
      const saturation = Number.parseInt(nextDraft.saturation, 10)
      const lightness = Number.parseInt(nextDraft.lightness, 10)

      if (
        Number.isFinite(hue) &&
        Number.isFinite(saturation) &&
        Number.isFinite(lightness) &&
        saturation >= 0 &&
        saturation <= 100 &&
        lightness >= 0 &&
        lightness <= 100
      ) {
        const resolvedDraft = buildBackgroundPickerDraftFromHsl(hue, saturation, lightness)
        applyBorderPickerColor(`hsl(${hue} ${saturation}% ${lightness}%)`)
        return {
          ...resolvedDraft,
          hue: nextDraft.hue,
          saturation: nextDraft.saturation,
          lightness: nextDraft.lightness,
        }
      }

      return nextDraft
    })
  }

  const handleRawCategoryChange = (category: RawEditorCategory, value: string) => {
    setRawClassDrafts((prev) => ({ ...prev, [category]: value }))

    const nextCategoryTokens = tokenizeClassInput(value).filter((token) =>
      tokenMatchesCategory(token, category)
    )
    const nextTokens = [
      ...classTokens.filter((token) => !tokenMatchesCategory(token, category)),
      ...nextCategoryTokens,
    ]
    updateSelectedStyle(nextTokens)
  }

  const handleFlexToggle = () => {
    const nextTokens = isFlex
      ? classTokens.filter((token) => token !== 'flex' && token !== 'flex-row' && token !== 'flex-col')
      : [...classTokens, 'flex', directionMode === 'col' ? 'flex-col' : 'flex-row']
    updateSelectedStyle(nextTokens)
  }

  const handleClipContentToggle = () => {
    updateSelectedStyle(
      clipsContent
        ? classTokens.filter((token) => token !== 'overflow-hidden' && token !== 'overflow-clip')
        : replaceTokens(classTokens, /^overflow-(hidden|clip)$/, ['overflow-hidden'])
    )
  }

  const handleDirectionChange = (nextDirection: 'row' | 'col' | 'grid') => {
    let nextTokens = replaceTokens(classTokens, /^(flex-row|flex-col|grid)$/, [])
    if (nextDirection === 'grid') {
      nextTokens = replaceTokens(nextTokens, /^flex$/, ['grid'])
    } else {
      nextTokens = replaceTokens(nextTokens, /^grid$/, ['flex', nextDirection === 'col' ? 'flex-col' : 'flex-row'])
    }
    updateSelectedStyle(nextTokens)
  }

  const handleSizeModeChange = (axis: 'w' | 'h', mode: 'Fill' | 'Hug' | 'Fixed') => {
    const pattern = axis === 'w' ? /^(w-.+|basis-.+|flex-1)$/ : /^h-.+$/
    let nextValue = ''

    if (mode === 'Fill') {
      nextValue = axis === 'w' ? 'w-full' : 'h-full'
    } else if (mode === 'Hug') {
      nextValue = axis === 'w' ? 'w-fit' : 'h-fit'
    }

    updateSingleField(pattern, nextValue)
  }

  const showLimitField = (axis: LimitAxis, kind: LimitKind) => {
    setVisibleLimitFields((prev) => ({ ...prev, [limitFieldKey(axis, kind)]: true }))
    setActiveLimitMenu(null)
  }

  const hideLimitField = (axis: LimitAxis, kind: LimitKind) => {
    const pattern =
      axis === 'width'
        ? kind === 'min'
          ? /^min-w-.+$/
          : /^max-w-.+$/
        : kind === 'min'
          ? /^min-h-.+$/
          : /^max-h-.+$/

    setVisibleLimitFields((prev) => ({ ...prev, [limitFieldKey(axis, kind)]: false }))
    updateSingleField(pattern, '')
  }

  const handleLimitValueChange = (
    axis: LimitAxis,
    kind: LimitKind,
    value: string
  ) => {
    const normalizedValue = normalizeLimitValue(value)
    const prefix =
      axis === 'width'
        ? kind === 'min'
          ? 'min-w'
          : 'max-w'
        : kind === 'min'
          ? 'min-h'
          : 'max-h'
    const pattern =
      axis === 'width'
        ? kind === 'min'
          ? /^min-w-.+$/
          : /^max-w-.+$/
        : kind === 'min'
          ? /^min-h-.+$/
          : /^max-h-.+$/

    updateSingleField(pattern, normalizedValue ? `${prefix}-${normalizedValue}` : '')
  }

  const limitFieldConfig = {
    width: {
      min: {
        label: 'Min',
        value: minWidthValue,
        pattern: /^min-w-.+$/,
        placeholder: 'sm',
        ariaLabel: 'Minimum width',
      },
      max: {
        label: 'Max',
        value: maxWidthValue,
        pattern: /^max-w-.+$/,
        placeholder: 'sm',
        ariaLabel: 'Maximum width',
      },
    },
    height: {
      min: {
        label: 'Min',
        value: minHeightValue,
        pattern: /^min-h-.+$/,
        placeholder: '24',
        ariaLabel: 'Minimum height',
      },
      max: {
        label: 'Max',
        value: maxHeightValue,
        pattern: /^max-h-.+$/,
        placeholder: '48',
        ariaLabel: 'Maximum height',
      },
    },
  } as const

  const handlePaddingValueChange = (
    pattern: RegExp,
    prefix: 'px' | 'py' | 'pl' | 'pr' | 'pt' | 'pb',
    nextValue: string
  ) => {
    const normalizedValue = normalizePaddingValue(nextValue)
    updateSingleField(pattern, normalizedValue ? `${prefix}-${normalizedValue}` : '')
  }

  const handlePaddingAxisChange = (axis: PaddingAxis, nextValue: string) => {
    const pattern = axis === 'x' ? /^(px|pl|pr)-.+$/ : /^(py|pt|pb)-.+$/
    const nextPaddingTokens = getPaddingTokensForAxis(axis, nextValue)
    updateSelectedStyle(replaceTokens(classTokens, pattern, nextPaddingTokens))
  }

  const handlePaddingModeChange = (nextMode: PaddingMode) => {
    if (nextMode === paddingMode) return

    if (nextMode === 'sides') {
      const nextPaddingTokens: string[] = []
      if (paddingLeftValue) nextPaddingTokens.push(`pl-${paddingLeftValue}`)
      if (paddingRightValue) nextPaddingTokens.push(`pr-${paddingRightValue}`)
      if (paddingTopValue) nextPaddingTokens.push(`pt-${paddingTopValue}`)
      if (paddingBottomValue) nextPaddingTokens.push(`pb-${paddingBottomValue}`)

      updateSelectedStyle(
        replaceTokens(classTokens, /^(px|py|pl|pr|pt|pb)-.+$/, nextPaddingTokens)
      )
    }

    setPaddingModeOverride(nextMode)
  }

  const getExplicitCornerRadiusTokens = (nextValues: Record<FullCornerKey, string>) => {
    const orderedCorners: FullCornerKey[] = ['tl', 'tr', 'bl', 'br']

    return orderedCorners.flatMap((corner) => {
      const normalizedValue = normalizeRadiusValue(nextValues[corner])
      return normalizedValue ? [`rounded-${corner}-${normalizedValue}`] : []
    })
  }

  const handleCornerRadiusLinkedChange = (nextValue: string) => {
    const nextLinkedValue =
      linkedShowsVarious && nextValue.startsWith('Various')
        ? nextValue.slice('Various'.length).trimStart()
        : nextValue
    const normalizedValue = normalizeRadiusValue(nextLinkedValue)
    updateSelectedStyle(
      replaceTokens(classTokens, RADIUS_TOKEN_PATTERN, normalizedValue ? [`rounded-${normalizedValue}`] : [])
    )
  }

  const handleCornerRadiusValueChange = (corner: FullCornerKey, nextValue: string) => {
    const nextValues = {
      tl: radiusTopLeftValue,
      tr: radiusTopRightValue,
      bl: radiusBottomLeftValue,
      br: radiusBottomRightValue,
      [corner]: nextValue,
    } satisfies Record<FullCornerKey, string>

    updateSelectedStyle(
      replaceTokens(classTokens, RADIUS_TOKEN_PATTERN, getExplicitCornerRadiusTokens(nextValues))
    )
  }

  const handleCornerRadiusModeChange = (nextMode: CornerRadiusMode) => {
    if (nextMode === cornerRadiusMode) return

    setCornerRadiusModeOverride(nextMode)
  }

  const normalizePaddingTokensForSave = () => {
    if (paddingMode !== 'axes') return classTokens

    const nextPaddingTokens = [
      ...getPaddingTokensForAxis('x', paddingAxisXValue),
      ...getPaddingTokensForAxis('y', paddingAxisYValue),
    ]

    return replaceTokens(classTokens, /^(px|py|pl|pr|pt|pb)-.+$/, nextPaddingTokens)
  }

  const normalizeCornerRadiusTokensForSave = (tokens: string[]) => {
    if (cornerRadiusMode === 'linked') {
      return replaceTokens(
        tokens,
        RADIUS_TOKEN_PATTERN,
        normalizeRadiusValue(radiusLinkedValue) ? [`rounded-${normalizeRadiusValue(radiusLinkedValue)}`] : []
      )
    }

    return replaceTokens(
      tokens,
      RADIUS_TOKEN_PATTERN,
      getExplicitCornerRadiusTokens({
        tl: radiusTopLeftValue,
        tr: radiusTopRightValue,
        bl: radiusBottomLeftValue,
        br: radiusBottomRightValue,
      })
    )
  }

  const handleSave = async () => {
    if (!selectedFileName || !selectedComponent) return

    const nextTokens = normalizeCornerRadiusTokensForSave(normalizePaddingTokensForSave())

    setIsSaving(true)
    setSaveMessage('')

    try {
      const response = await fetch('/api/save-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFileName,
          styles: {
            [selectedComponent]: fromClassTokens(nextTokens, styles[selectedComponent]),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save styles')
      }

      setStyles((prev) => ({
        ...prev,
        [selectedComponent]: fromClassTokens(nextTokens, prev[selectedComponent]),
      }))
      setSaveMessage(`Saved to ${selectedFileName}.json`)
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error(error)
      setSaveMessage('Failed to save styles')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <aside className="fixed right-0 top-0 h-screen w-96 overflow-y-auto border-l border-zinc-200 bg-white px-3 py-5 shadow-lg">
      <div className="space-y-5 pb-28">
        <section className="space-y-4 border-b border-zinc-200 pb-5">
          <div className="pt-3">
            <p className="text-[18px] font-semibold tracking-[-0.02em] text-zinc-400">
              {componentTitle(selectedComponent)}
            </p>
            {breadcrumb && (
              <p className="mt-1 text-xs text-zinc-500">{breadcrumb.join(' / ')}</p>
            )}
          </div>

          {!selectedComponent && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
              Select a component on the canvas to inspect and edit its utility classes.
            </div>
          )}

          {selectedComponent && (
            <>
              <div className="flex items-center gap-3 pt-1">
                <p className="flex-1 text-base font-bold tracking-[-0.02em] text-black">Flex</p>
                <button
                  type="button"
                  onClick={handleFlexToggle}
                  className={switchTrackClass(isFlex)}
                >
                  <span className={switchThumbClass(isFlex)} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className={tinyLabelClass()}>Width</span>
                  <div className={fieldShellClass()}>
                    <select
                      value={widthMode}
                      onChange={(event) => handleSizeModeChange('w', event.target.value as 'Fill' | 'Hug' | 'Fixed')}
                      className="w-full bg-transparent outline-none"
                    >
                      <option value="Fill">{sizeModeLabel('Fill', 'w')}</option>
                      <option value="Hug">{sizeModeLabel('Hug', 'w')}</option>
                      <option value="Fixed">{sizeModeLabel('Fixed', 'w')}</option>
                    </select>
                  </div>
                </label>

                <label className="space-y-1">
                  <span className={tinyLabelClass()}>Height</span>
                  <div className={fieldShellClass()}>
                    <select
                      value={heightMode}
                      onChange={(event) => handleSizeModeChange('h', event.target.value as 'Fill' | 'Hug' | 'Fixed')}
                      className="w-full bg-transparent outline-none"
                    >
                      <option value="Fill">{sizeModeLabel('Fill', 'h')}</option>
                      <option value="Hug">{sizeModeLabel('Hug', 'h')}</option>
                      <option value="Fixed">{sizeModeLabel('Fixed', 'h')}</option>
                    </select>
                  </div>
                </label>
              </div>
            </>
          )}
        </section>

        {selectedComponent && (
          <>
            <section className="space-y-4 border-b border-zinc-200 pb-5">
              <div className="flex items-center gap-3 pt-1">
                <p className="flex-1 text-base font-bold tracking-[-0.02em] text-black">
                  Flex Direction / Grid
                </p>
                <PlaceholderBadge />
              </div>

              <div className="grid grid-cols-3 gap-1">
                {DIRECTION_OPTIONS.map((option) => {
                  const isActive = directionMode === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleDirectionChange(option.value)}
                      className={`flex h-8 items-center justify-center rounded-lg text-sm font-semibold transition ${
                        isActive ? 'bg-gray-100 text-black' : 'bg-gray-100/55 text-zinc-400'
                      }`}
                    >
                      {option.icon}
                    </button>
                  )
                })}
              </div>

              <label className="block space-y-1">
                <div className="space-y-0.5">
                  <span className={tinyLabelClass()}>Gap</span>
                  <p className={tinyHintClass()}>Tailwind spacing tokens or px</p>
                </div>
                <input
                  value={gapClass}
                  onChange={(event) => updateSingleField(/^gap-.+$/, event.target.value)}
                  className="h-6 w-[79px] rounded-lg bg-gray-100 px-3 text-[12px] font-medium text-black outline-none"
                  placeholder="gap-4"
                />
              </label>

              <div className="space-y-1">
                <span className={tinyLabelClass()}>Alignment</span>
                <div className="grid w-fit grid-cols-3 gap-3 rounded-xl bg-gray-100 p-3">
                  {Array.from({ length: 9 }, (_, index) => (
                    <div
                      key={index}
                      className={`h-3 w-3 rounded-sm border border-black/10 ${
                        index === 3 ? 'bg-black' : 'bg-black/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-5 border-b border-zinc-200 pb-5">
              <p className="pt-1 text-base font-bold tracking-[-0.02em] text-black">Padding</p>
              <div className="space-y-1">
                <p className={tinyHintClass()}>Tailwind spacing tokens or px</p>
                <div className="flex items-center justify-between gap-3">
                  <span className={tinyLabelClass()}>Mode</span>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-50 p-0.5">
                    {(['axes', 'sides'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handlePaddingModeChange(mode)}
                        className={`rounded-md px-1.5 py-1 text-[11px] font-semibold transition ${
                          paddingMode === mode ? 'bg-white text-black shadow-sm' : 'text-zinc-500'
                        }`}
                      >
                        {mode === 'axes' ? 'Axes' : 'Sides'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {paddingMode === 'axes' ? (
                    <>
                      <PaddingField
                        value={paddingAxisXValue}
                        onChange={(value) => handlePaddingAxisChange('x', value)}
                        hasValue={Boolean(paddingAxisXValue)}
                        placeholder="none"
                        ariaLabel="Padding X"
                        markers={['pl', 'pr']}
                      />
                      <PaddingField
                        value={paddingAxisYValue}
                        onChange={(value) => handlePaddingAxisChange('y', value)}
                        hasValue={Boolean(paddingAxisYValue)}
                        placeholder="none"
                        ariaLabel="Padding Y"
                        markers={['pt', 'pb']}
                      />
                    </>
                  ) : (
                    <>
                      <PaddingField
                        value={formatPaddingValueForInput(getTokenValue(paddingLeftClass, 'pl'))}
                        onChange={(value) => handlePaddingValueChange(/^pl-.+$/, 'pl', value)}
                        hasValue={Boolean(formatPaddingValueForInput(getTokenValue(paddingLeftClass, 'pl')))}
                        placeholder="none"
                        ariaLabel="Padding Left"
                        markers={['pl']}
                      />
                      <PaddingField
                        value={formatPaddingValueForInput(getTokenValue(paddingTopClass, 'pt'))}
                        onChange={(value) => handlePaddingValueChange(/^pt-.+$/, 'pt', value)}
                        hasValue={Boolean(formatPaddingValueForInput(getTokenValue(paddingTopClass, 'pt')))}
                        placeholder="none"
                        ariaLabel="Padding Top"
                        markers={['pt']}
                      />
                      <PaddingField
                        value={formatPaddingValueForInput(getTokenValue(paddingRightClass, 'pr'))}
                        onChange={(value) => handlePaddingValueChange(/^pr-.+$/, 'pr', value)}
                        hasValue={Boolean(formatPaddingValueForInput(getTokenValue(paddingRightClass, 'pr')))}
                        placeholder="none"
                        ariaLabel="Padding Right"
                        markers={['pr']}
                      />
                      <PaddingField
                        value={formatPaddingValueForInput(getTokenValue(paddingBottomClass, 'pb'))}
                        onChange={(value) => handlePaddingValueChange(/^pb-.+$/, 'pb', value)}
                        hasValue={Boolean(formatPaddingValueForInput(getTokenValue(paddingBottomClass, 'pb')))}
                        placeholder="none"
                        ariaLabel="Padding Bottom"
                        markers={['pb']}
                      />
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4 border-b border-zinc-200 pb-5">
              <div className="flex items-center gap-2 pt-1">
                <p className="flex-1 text-base font-bold tracking-[-0.02em] text-black">
                  Background Color
                </p>
                <button
                  type="button"
                  onClick={handleAddBackgroundColor}
                  className="text-2xl leading-none text-black"
                  aria-label="Add background color"
                  title="Add background color"
                >
                  +
                </button>
              </div>
              <p className={tinyHintClass()}>Tailwind colors, hex, rgb, hsl, oklch, or var()</p>
              {hasBackgroundColor && (
                <div className="flex gap-1">
                  <BackgroundColorCombobox
                    value={backgroundDetails.colorValue}
                    onChange={handleBackgroundColorChange}
                  />
                <input
                  value={`${backgroundDetails.opacityValue}%`}
                  onChange={(event) => handleBackgroundOpacityChange(event.target.value)}
                  className="h-6 w-11 rounded-lg bg-gray-100 px-2 text-[10px] font-medium text-black/70 outline-none"
                  placeholder="100%"
                  aria-label="Background opacity"
                />
                <div className="relative" ref={backgroundPickerRef}>
                  <button
                    type="button"
                    onClick={() => setIsBackgroundPickerOpen((prev) => !prev)}
                      className="flex h-6 w-[30px] items-stretch overflow-hidden rounded-lg border border-zinc-200 bg-white"
                      aria-label="Open background color picker"
                      title="Open background color picker"
                    >
                      <div
                        className="w-full"
                        style={{
                          backgroundColor: backgroundPreviewColor ?? 'transparent',
                          opacity: Number.isNaN(backgroundPreviewOpacity)
                            ? 1
                            : Math.min(100, Math.max(0, backgroundPreviewOpacity)) / 100,
                        }}
                      />
                    </button>
                    {isBackgroundPickerOpen && (
                      <div className="absolute right-0 top-8 z-20 w-56 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={backgroundPickerDraft.hex}
                                onChange={(event) => {
                                  const nextValue = event.target.value
                                  setBackgroundPickerDraft(buildBackgroundPickerDraft(nextValue))
                                  applyBackgroundPickerColor(nextValue)
                                }}
                                className="h-10 flex-1 cursor-pointer rounded-xl border border-zinc-200 bg-white p-1"
                                aria-label="Pick background color"
                              />
                              <div
                                className="relative h-10 w-10 overflow-hidden rounded-xl border border-zinc-200"
                                aria-label="Background color preview"
                                title="Background color preview"
                                style={{
                                  backgroundColor: '#f4f4f5',
                                  backgroundImage: 'repeating-conic-gradient(#d4d4d8 0% 25%, #f4f4f5 0% 50%)',
                                  backgroundSize: '8px 8px',
                                }}
                              >
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    backgroundColor: backgroundPreviewColor ?? 'transparent',
                                    opacity: Number.isNaN(backgroundPreviewOpacity)
                                      ? 1
                                      : Math.min(100, Math.max(0, backgroundPreviewOpacity)) / 100,
                                  }}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1">
                              {(['hex', 'rgb', 'hsl'] as const).map((mode) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => setBackgroundPickerMode(mode)}
                                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] transition ${
                                    backgroundPickerMode === mode
                                      ? 'bg-white text-black shadow-sm'
                                      : 'text-zinc-500'
                                  }`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                          </div>

                          <BackgroundColorMap
                            mode={backgroundPickerMode}
                            draft={backgroundPickerDraft}
                            onRgbChange={handleBackgroundPickerRgbChange}
                            onHslChange={handleBackgroundPickerHslChange}
                          />

                          <BackgroundOpacitySlider
                            colorValue={backgroundDetails.colorValue}
                            opacityValue={backgroundDetails.opacityValue}
                            onChange={handleBackgroundOpacityChange}
                          />

                          {backgroundPickerMode === 'hex' && (
                            <ColorChannelField
                              label="Hex"
                              value={backgroundPickerDraft.hex}
                              onChange={handleBackgroundPickerHexChange}
                            />
                          )}

                          {backgroundPickerMode === 'rgb' && (
                            <div className="grid grid-cols-3 gap-2">
                              <ColorChannelField
                                label="R"
                                value={backgroundPickerDraft.red}
                                onChange={(value) => handleBackgroundPickerRgbChange('red', value)}
                              />
                              <ColorChannelField
                                label="G"
                                value={backgroundPickerDraft.green}
                                onChange={(value) => handleBackgroundPickerRgbChange('green', value)}
                              />
                              <ColorChannelField
                                label="B"
                                value={backgroundPickerDraft.blue}
                                onChange={(value) => handleBackgroundPickerRgbChange('blue', value)}
                              />
                            </div>
                          )}

                          {backgroundPickerMode === 'hsl' && (
                            <div className="grid grid-cols-3 gap-2">
                              <ColorChannelField
                                label="H"
                                value={backgroundPickerDraft.hue}
                                onChange={(value) => handleBackgroundPickerHslChange('hue', value)}
                              />
                              <ColorChannelField
                                label="S"
                                value={backgroundPickerDraft.saturation}
                                onChange={(value) =>
                                  handleBackgroundPickerHslChange('saturation', value)
                                }
                              />
                              <ColorChannelField
                                label="L"
                                value={backgroundPickerDraft.lightness}
                                onChange={(value) =>
                                  handleBackgroundPickerHslChange('lightness', value)
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveBackgroundColor}
                    className="ml-1 flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-zinc-500 transition hover:text-black"
                    aria-label="Remove background color"
                    title="Remove background color"
                  >
                    ×
                  </button>
                </div>
              )}
            </section>

            <section className="space-y-5 border-b border-zinc-200 pb-5">
              <div className="flex items-center gap-2 pt-1">
                <p className="flex-1 text-base font-bold tracking-[-0.02em] text-black">Border</p>
                <button
                  type="button"
                  onClick={handleAddBorderColor}
                  className="text-2xl leading-none text-black"
                  aria-label="Add border color"
                  title="Add border color"
                >
                  +
                </button>
              </div>
              <p className={tinyHintClass()}>Tailwind colors, hex, rgb, hsl, oklch, or var()</p>

              <div className="space-y-1">
                {hasBorderColor && (
                  <div className="flex gap-1">
                    <BackgroundColorCombobox
                      value={borderDetails.colorValue}
                      onChange={handleBorderColorChange}
                    />
                    <input
                      value={`${borderDetails.opacityValue}%`}
                      onChange={(event) => handleBorderOpacityChange(event.target.value)}
                      className="h-6 w-11 rounded-lg bg-gray-100 px-2 text-[10px] font-medium text-black/70 outline-none"
                      placeholder="100%"
                      aria-label="Border opacity"
                    />
                    <div className="relative" ref={borderPickerRef}>
                      <button
                        type="button"
                        onClick={() => setIsBorderPickerOpen((prev) => !prev)}
                        className="flex h-6 w-[30px] items-stretch overflow-hidden rounded-lg border border-zinc-200 bg-white"
                        aria-label="Open border color picker"
                        title="Open border color picker"
                      >
                        <div
                          className="w-full"
                          style={{
                            backgroundColor: borderPreviewColor ?? 'transparent',
                            opacity: Number.isNaN(borderPreviewOpacity)
                              ? 1
                              : Math.min(100, Math.max(0, borderPreviewOpacity)) / 100,
                          }}
                        />
                      </button>
                      {isBorderPickerOpen && (
                        <div className="absolute right-0 top-8 z-20 w-56 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={borderPickerDraft.hex}
                                  onChange={(event) => {
                                    const nextValue = event.target.value
                                    setBorderPickerDraft(buildBackgroundPickerDraft(nextValue))
                                    applyBorderPickerColor(nextValue)
                                  }}
                                  className="h-10 flex-1 cursor-pointer rounded-xl border border-zinc-200 bg-white p-1"
                                  aria-label="Pick border color"
                                />
                                <div
                                  className="relative h-10 w-10 overflow-hidden rounded-xl border border-zinc-200"
                                  aria-label="Border color preview"
                                  title="Border color preview"
                                  style={{
                                    backgroundColor: '#f4f4f5',
                                    backgroundImage: 'repeating-conic-gradient(#d4d4d8 0% 25%, #f4f4f5 0% 50%)',
                                    backgroundSize: '8px 8px',
                                  }}
                                >
                                  <div
                                    className="absolute inset-0"
                                    style={{
                                      backgroundColor: borderPreviewColor ?? 'transparent',
                                      opacity: Number.isNaN(borderPreviewOpacity)
                                        ? 1
                                        : Math.min(100, Math.max(0, borderPreviewOpacity)) / 100,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1">
                                {(['hex', 'rgb', 'hsl'] as const).map((mode) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setBorderPickerMode(mode)}
                                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] transition ${
                                      borderPickerMode === mode
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-zinc-500'
                                    }`}
                                  >
                                    {mode}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <BackgroundColorMap
                              mode={borderPickerMode}
                              draft={borderPickerDraft}
                              onRgbChange={handleBorderPickerRgbChange}
                              onHslChange={handleBorderPickerHslChange}
                            />
                            {borderPickerMode === 'hsl' && (
                              <div className="grid grid-cols-3 gap-2">
                                <ColorChannelField
                                  label="H"
                                  value={borderPickerDraft.hue}
                                  onChange={(value) => handleBorderPickerHslChange('hue', value)}
                                />
                                <ColorChannelField
                                  label="S"
                                  value={borderPickerDraft.saturation}
                                  onChange={(value) =>
                                    handleBorderPickerHslChange('saturation', value)
                                  }
                                />
                                <ColorChannelField
                                  label="L"
                                  value={borderPickerDraft.lightness}
                                  onChange={(value) =>
                                    handleBorderPickerHslChange('lightness', value)
                                  }
                                />
                              </div>
                            )}

                            <BackgroundOpacitySlider
                              colorValue={borderDetails.colorValue}
                              opacityValue={borderDetails.opacityValue}
                              onChange={handleBorderOpacityChange}
                            />

                            {borderPickerMode === 'hex' && (
                              <ColorChannelField
                                label="Hex"
                                value={borderPickerDraft.hex}
                                onChange={handleBorderPickerHexChange}
                              />
                            )}

                            {borderPickerMode === 'rgb' && (
                              <div className="grid grid-cols-3 gap-2">
                                <ColorChannelField
                                  label="R"
                                  value={borderPickerDraft.red}
                                  onChange={(value) => handleBorderPickerRgbChange('red', value)}
                                />
                                <ColorChannelField
                                  label="G"
                                  value={borderPickerDraft.green}
                                  onChange={(value) => handleBorderPickerRgbChange('green', value)}
                                />
                                <ColorChannelField
                                  label="B"
                                  value={borderPickerDraft.blue}
                                  onChange={(value) => handleBorderPickerRgbChange('blue', value)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveBorderColor}
                      disabled={!hasBorderColor}
                      className="ml-1 flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-zinc-500 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-500"
                      aria-label="Remove border color"
                      title="Remove border color"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div
                  className={`flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-[10px] font-medium text-black/70 ${
                    hasBorderColor ? 'opacity-40' : ''
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: inheritedBorderColor.previewColor }}
                    aria-hidden="true"
                  />
                  <span className="truncate">
                    {inheritedBorderColor.source}: {inheritedBorderColor.label}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                  <div className="space-y-0.5">
                    <span className={tinyLabelClass()}>Border-weight</span>
                    <p className={tinyHintClass()}>Width in px</p>
                  </div>
                  <div className="px-1 py-2">
                    <div className="relative grid grid-cols-[50px_1fr_50px] grid-rows-[51px_30px_51px] gap-x-[6px] gap-y-1 px-[10px] py-[8px]">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-[4px]"
                        style={borderWeightPreviewStyle}
                      />

                      <div className="col-start-2 row-start-1">
                        <BorderWeightField
                          side="top"
                          value={borderWidthState.topExplicit}
                          placeholder={borderWidthState.effectiveTop || centerBorderWeightPlaceholder || '0px'}
                          onChange={(value) => updateBorderWidth('top', value)}
                          onActivate={() => activateSideBorderWidth('top')}
                          onRemove={() => updateBorderWidth('top', '')}
                        />
                      </div>

                      <div className="col-start-1 row-start-2">
                        <BorderWeightField
                          side="left"
                          value={borderWidthState.leftExplicit}
                          placeholder={borderWidthState.effectiveLeft || centerBorderWeightPlaceholder || '0px'}
                          onChange={(value) => updateBorderWidth('left', value)}
                          onActivate={() => activateSideBorderWidth('left')}
                          onRemove={() => updateBorderWidth('left', '')}
                        />
                      </div>

                      <div
                        className={`col-start-2 row-start-2 flex items-center justify-center rounded-[4px] bg-[#f1f3f4] px-2 py-1.5 transition ${
                          isCenterBorderWeightActive ? 'opacity-100' : 'opacity-35 focus-within:opacity-100'
                        }`}
                      >
                        <input
                          value={centerBorderWeightValue}
                          onChange={(event) => updateBorderWidth('all', event.target.value)}
                          onFocus={(event) => {
                            event.currentTarget.select()
                          }}
                          className="h-[20px] w-full bg-transparent text-center text-[16px] font-medium leading-[140%] text-black outline-none placeholder:text-black/40"
                          placeholder={centerBorderWeightPlaceholder}
                          aria-label="Border width for all sides"
                        />
                      </div>

                      <div className="col-start-3 row-start-2">
                        <BorderWeightField
                          side="right"
                          value={borderWidthState.rightExplicit}
                          placeholder={borderWidthState.effectiveRight || centerBorderWeightPlaceholder || '0px'}
                          onChange={(value) => updateBorderWidth('right', value)}
                          onActivate={() => activateSideBorderWidth('right')}
                          onRemove={() => updateBorderWidth('right', '')}
                        />
                      </div>

                      <div className="col-start-2 row-start-3">
                        <BorderWeightField
                          side="bottom"
                          value={borderWidthState.bottomExplicit}
                          placeholder={borderWidthState.effectiveBottom || centerBorderWeightPlaceholder || '0px'}
                          onChange={(value) => updateBorderWidth('bottom', value)}
                          onActivate={() => activateSideBorderWidth('bottom')}
                          onRemove={() => updateBorderWidth('bottom', '')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
            </section>

            <section className="space-y-5">
              <p className="pt-1 text-base font-bold tracking-[-0.02em] text-black">Limits & Corners</p>
              <div className="flex items-center gap-3">
                <span className={`flex-1 ${tinyLabelClass()}`}>Clip content to limits</span>
                <button
                  type="button"
                  onClick={handleClipContentToggle}
                  className={switchTrackClass(clipsContent)}
                  aria-pressed={clipsContent}
                  aria-label="Clip content to radius"
                >
                  <span className={switchThumbClass(clipsContent)} />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className={tinyLabelClass()}>Corner radius</span>
                    <p className={tinyHintClass()}>Tailwind radius tokens or px</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-50 p-0.5">
                    {(['linked', 'independent'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleCornerRadiusModeChange(mode)}
                        className={`rounded-md px-1.5 py-1 text-[11px] font-semibold transition ${
                          cornerRadiusMode === mode ? 'bg-white text-black shadow-sm' : 'text-zinc-500'
                        }`}
                      >
                        {mode === 'linked' ? 'Linked' : 'Independent'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {cornerRadiusMode === 'linked' ? (
                    <PaddingField
                      value={radiusLinkedDisplayValue}
                      onChange={handleCornerRadiusLinkedChange}
                      selectOnFocus={linkedShowsVarious}
                      hasValue={Boolean(radiusLinkedDisplayValue)}
                      placeholder="none"
                      ariaLabel="Corner radius all"
                      markers={[]}
                    />
                  ) : (
                    <>
                      <PaddingField
                        value={radiusTopLeftValue}
                        onChange={(value) => handleCornerRadiusValueChange('tl', value)}
                        hasValue={Boolean(radiusTopLeftValue)}
                        cornerCue="tl"
                        placeholder="none"
                        ariaLabel="Corner radius top left"
                        markers={[]}
                      />
                      <PaddingField
                        value={radiusTopRightValue}
                        onChange={(value) => handleCornerRadiusValueChange('tr', value)}
                        hasValue={Boolean(radiusTopRightValue)}
                        muted={independentGhostedCorners.tr}
                        cornerCue="tr"
                        placeholder="none"
                        ariaLabel="Corner radius top right"
                        markers={[]}
                      />
                      <PaddingField
                        value={radiusBottomLeftValue}
                        onChange={(value) => handleCornerRadiusValueChange('bl', value)}
                        hasValue={Boolean(radiusBottomLeftValue)}
                        muted={independentGhostedCorners.bl}
                        cornerCue="bl"
                        placeholder="none"
                        ariaLabel="Corner radius bottom left"
                        markers={[]}
                      />
                      <PaddingField
                        value={radiusBottomRightValue}
                        onChange={(value) => handleCornerRadiusValueChange('br', value)}
                        hasValue={Boolean(radiusBottomRightValue)}
                        muted={independentGhostedCorners.br}
                        cornerCue="br"
                        placeholder="none"
                        ariaLabel="Corner radius bottom right"
                        markers={[]}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-0.5">
                  <div className={`${tinyLabelClass()}`}>Dimension Restrictions</div>
                  <p className={tinyHintClass()}>
                    Tailwind tokens, px, %, rem, em, vw, vh, auto, full, fit, min, or max
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="relative flex items-center gap-2">
                    <span className={`flex-1 ${tinyLabelClass()}`}>Width (Max/Min)</span>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveLimitMenu((prev) => (prev === 'width' ? null : 'width'))
                      }
                      className="flex h-[18px] w-[18px] items-center justify-center text-lg leading-none text-black"
                      aria-label="Add width limit"
                      title="Add width limit"
                    >
                      +
                    </button>
                    {activeLimitMenu === 'width' && (
                      <div className="absolute right-0 top-6 z-10 min-w-[110px] rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
                        {(['min', 'max'] as const).map((kind) => (
                          <button
                            key={kind}
                            type="button"
                            onClick={() => showLimitField('width', kind)}
                            disabled={visibleLimitFields[limitFieldKey('width', kind)]}
                            className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
                          >
                            Add {kind}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {visibleLimitFields['width-min'] && (
                    <LimitValueField
                      label={limitFieldConfig.width.min.label}
                      value={limitFieldConfig.width.min.value}
                      onChange={(value) => handleLimitValueChange('width', 'min', value)}
                      onClear={() => hideLimitField('width', 'min')}
                      placeholder={limitFieldConfig.width.min.placeholder}
                      ariaLabel={limitFieldConfig.width.min.ariaLabel}
                    />
                  )}

                  {visibleLimitFields['width-max'] && (
                    <LimitValueField
                      label={limitFieldConfig.width.max.label}
                      value={limitFieldConfig.width.max.value}
                      onChange={(value) => handleLimitValueChange('width', 'max', value)}
                      onClear={() => hideLimitField('width', 'max')}
                      placeholder={limitFieldConfig.width.max.placeholder}
                      ariaLabel={limitFieldConfig.width.max.ariaLabel}
                    />
                  )}

                  {hasWidthLimitConflict && (
                    <p className="text-[10px] font-medium leading-tight text-red-500">
                      Min width is larger than max width.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative flex items-center gap-2">
                    <span className={`flex-1 ${tinyLabelClass()}`}>Height (Max/Min)</span>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveLimitMenu((prev) => (prev === 'height' ? null : 'height'))
                      }
                      className="flex h-[18px] w-[18px] items-center justify-center text-lg leading-none text-black"
                      aria-label="Add height limit"
                      title="Add height limit"
                    >
                      +
                    </button>
                    {activeLimitMenu === 'height' && (
                      <div className="absolute right-0 top-6 z-10 min-w-[110px] rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
                        {(['min', 'max'] as const).map((kind) => (
                          <button
                            key={kind}
                            type="button"
                            onClick={() => showLimitField('height', kind)}
                            disabled={visibleLimitFields[limitFieldKey('height', kind)]}
                            className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
                          >
                            Add {kind}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {visibleLimitFields['height-min'] && (
                    <LimitValueField
                      label={limitFieldConfig.height.min.label}
                      value={limitFieldConfig.height.min.value}
                      onChange={(value) => handleLimitValueChange('height', 'min', value)}
                      onClear={() => hideLimitField('height', 'min')}
                      placeholder={limitFieldConfig.height.min.placeholder}
                      ariaLabel={limitFieldConfig.height.min.ariaLabel}
                    />
                  )}

                  {visibleLimitFields['height-max'] && (
                    <LimitValueField
                      label={limitFieldConfig.height.max.label}
                      value={limitFieldConfig.height.max.value}
                      onChange={(value) => handleLimitValueChange('height', 'max', value)}
                      onClear={() => hideLimitField('height', 'max')}
                      placeholder={limitFieldConfig.height.max.placeholder}
                      ariaLabel={limitFieldConfig.height.max.ariaLabel}
                    />
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-2 border-t border-zinc-200 pt-5">
              {RAW_EDITOR_GROUPS.map((group) => (
                <RawClassTextarea
                  key={group.key}
                  label={group.label}
                  value={activeRawEditor === group.key ? rawClassDrafts[group.key] : rawCategoryTexts[group.key]}
                  onChange={(value) => handleRawCategoryChange(group.key, value)}
                  onFocus={() => setActiveRawEditor(group.key)}
                  onBlur={() => setActiveRawEditor(null)}
                  placeholder={group.placeholder}
                />
              ))}
            </section>
          </>
        )}

        <div className="sticky bottom-0 -mx-3 border-t border-zinc-200 bg-white/95 px-3 pb-5 pt-4 backdrop-blur">
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading || !selectedComponent}
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>

          {saveMessage && <p className="mt-2 text-center text-xs font-medium text-zinc-500">{saveMessage}</p>}
        </div>
      </div>
    </aside>
  )
}
