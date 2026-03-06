'use client'
import { useState } from 'react'
import pb from './frame.json'

type Styles = typeof pb

interface StyleEditorProps {
  selectedComponent: string | null
}

export function StyleEditor({ selectedComponent }: StyleEditorProps) {
  const [styles, setStyles] = useState<Styles>(pb)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const handleChange = (key: keyof Styles, value: string) => {
    // Check if original value was an array
    if (Array.isArray(pb[key])) {
      // Split by newlines and filter empty lines
      const arrayValue = value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
      setStyles(prev => ({ ...prev, [key]: arrayValue }))
    } else {
      setStyles(prev => ({ ...prev, [key]: value }))
    }
  }

  const getValue = (key: keyof Styles) => {
    const val = styles[key]
    if (Array.isArray(val)) {
      return val.join('\n')
    }
    return val || ''
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')
    
    const dataToSave = selectedComponent ? { [selectedComponent]: styles[selectedComponent as keyof Styles] } : styles
    
    try {
      const response = await fetch('/api/save-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      })
      
      if (response.ok) {
        setSaveMessage('✓ Saved to frame.json')
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('✗ Failed to save')
      }
    } catch (error) {
      setSaveMessage('✗ Error saving styles')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const styleEntries = selectedComponent 
    ? (Object.entries(styles) as [keyof Styles, Styles[keyof Styles]][]).filter(([key]) => key === selectedComponent)
    : (Object.entries(styles) as [keyof Styles, Styles[keyof Styles]][])

  const hasStyles = selectedComponent ? styleEntries.length > 0 : true

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto p-4 shadow-lg">
      <h2 className="text-xl font-bold mb-4 sticky top-0 bg-white dark:bg-zinc-900 py-2">
        Style Editor {selectedComponent && ` - ${selectedComponent}`}
      </h2>
      
      {!hasStyles && selectedComponent && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            No styles available for {selectedComponent}. Styles are only defined for Frame components.
          </p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {styleEntries.map(([key, value]) => (
          <div key={key} className="space-y-2">
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {key}
              {Array.isArray(value) && <span className="text-xs text-gray-500"> (array)</span>}
            </label>
            <textarea
              value={getValue(key)}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full h-24 p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 font-mono text-xs text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={Array.isArray(value) ? "Group items by editing in separate lines" : "Enter value"}
            />
          </div>
        ))}
      </div>

      {hasStyles && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium transition sticky bottom-0 py-3"
        >
          {isSaving ? 'Saving...' : 'Save to frame.json'}
        </button>
      )}
      
      {saveMessage && (
        <div className="mt-2 text-sm text-center font-medium">
          {saveMessage}
        </div>
      )}
    </div>
  )
}