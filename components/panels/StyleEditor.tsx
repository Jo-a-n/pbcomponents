'use client'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentGroup } from '@/lib/component-selection/types'

type StyleValue = string | string[]
type Styles = Record<string, StyleValue>

interface StyleEditorProps {
  selectedComponent: string | null
  components: ComponentGroup[]
}

function componentNameToFileName(componentName: string) {
  const generatedMatch = componentName.match(/^Div(\d{3})$/)
  if (generatedMatch) {
    return `div-${generatedMatch[1]}`
  }

  return componentName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function getSelectedGroup(selectedComponent: string | null, components: ComponentGroup[]) {
  if (!selectedComponent) return null
  return (
    components.find(
      (group) => group.name === selectedComponent || group.children.includes(selectedComponent)
    ) ?? null
  )
}

function getBreadcrumb(selectedComponent: string | null, components: ComponentGroup[]) {
  if (!selectedComponent) return null

  const group = getSelectedGroup(selectedComponent, components)
  if (!group) return [selectedComponent]
  if (group.name === selectedComponent) return [group.name]
  return [group.name, selectedComponent]
}

export function StyleEditor({ selectedComponent, components }: StyleEditorProps) {
  const [styles, setStyles] = useState<Styles>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const breadcrumb = getBreadcrumb(selectedComponent, components)
  const selectedGroup = useMemo(
    () => getSelectedGroup(selectedComponent, components),
    [components, selectedComponent]
  )
  const selectedFileName = selectedGroup ? componentNameToFileName(selectedGroup.name) : null

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

  const handleChange = (key: string, value: string) => {
    const originalValue = styles[key]
    if (Array.isArray(originalValue)) {
      const arrayValue = value
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
      setStyles((prev) => ({ ...prev, [key]: arrayValue }))
      return
    }

    setStyles((prev) => ({ ...prev, [key]: value }))
  }

  const getValue = (key: string) => {
    const val = styles[key]
    if (Array.isArray(val)) {
      return val.join('\n')
    }
    return val ?? ''
  }

  const handleSave = async () => {
    if (!selectedFileName) return

    setIsSaving(true)
    setSaveMessage('')

    const dataToSave = selectedComponent
      ? { [selectedComponent]: styles[selectedComponent] }
      : styles

    try {
      const response = await fetch('/api/save-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFileName,
          styles: dataToSave,
        }),
      })

      if (response.ok) {
        setSaveMessage(`Saved to ${selectedFileName}.json`)
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('Failed to save styles')
      }
    } catch (error) {
      setSaveMessage('Error saving styles')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const styleEntries = selectedComponent
    ? Object.entries(styles).filter(([key]) => key === selectedComponent)
    : Object.entries(styles)

  const hasStyles = selectedComponent ? styleEntries.length > 0 : Object.keys(styles).length > 0

  return (
    <div className="fixed right-0 top-0 h-screen w-96 overflow-y-auto border-l border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="sticky top-0 mb-4 bg-white py-2 text-xl font-bold dark:bg-zinc-900">
        Style Editor {selectedComponent && ` - ${selectedComponent}`}
      </h2>

      {breadcrumb && (
        <div className="mb-4 rounded-xl border border-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          Editing: {breadcrumb.join(' / ')}
        </div>
      )}

      {isLoading && (
        <div className="mb-4 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          Loading styles...
        </div>
      )}

      {!isLoading && !hasStyles && selectedComponent && (
        <div className="mb-4 rounded border border-yellow-300 bg-yellow-100 p-3 dark:border-yellow-700 dark:bg-yellow-900">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            No styles found for {selectedComponent} in {selectedFileName}.json.
          </p>
        </div>
      )}

      <div className="mb-6 space-y-4">
        {styleEntries.map(([key, value]) => (
          <div key={key} className="space-y-2">
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {key}
              {Array.isArray(value) && <span className="text-xs text-gray-500"> (array)</span>}
            </label>
            <textarea
              value={getValue(key)}
              onChange={(e) => handleChange(key, e.target.value)}
              className="h-24 w-full resize-none rounded border border-zinc-300 bg-zinc-50 p-2 font-mono text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder={Array.isArray(value) ? 'Group items by editing in separate lines' : 'Enter value'}
            />
          </div>
        ))}
      </div>

      {selectedFileName && hasStyles && (
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="sticky bottom-0 w-full rounded bg-green-500 px-4 py-3 font-medium text-white transition hover:bg-green-600 disabled:bg-gray-400"
        >
          {isSaving ? 'Saving...' : `Save to ${selectedFileName}.json`}
        </button>
      )}

      {saveMessage && <div className="mt-2 text-center text-sm font-medium">{saveMessage}</div>}
    </div>
  )
}
