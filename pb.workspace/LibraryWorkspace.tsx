'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { ComponentTree } from '@/pb.workspace/ComponentTree'
import { StyleEditor } from '@/pb.workspace/StyleEditor'
import { useComponentSelection } from '@/lib/component-selection/useComponentSelection'
import type { ComponentGroup } from '@/lib/component-selection/types'

const MIN_PAGE_WIDTH = 320
const MAX_PAGE_WIDTH = 1440
const DEFAULT_PAGE_WIDTH = 1024
const PAGE_WIDTH_PRESETS = [390, 768, 1024, 1440]

interface LibraryWorkspaceProps {
  components: ComponentGroup[]
  children: ReactNode
}

export function LibraryWorkspace({ components, children }: LibraryWorkspaceProps) {
  const router = useRouter()
  const {
    selectedComponent,
    selectedComponentSize,
    setSelectedComponent,
    canvasRef,
    navigateDown,
    handleCanvasClickCapture,
    handleCanvasDoubleClickCapture,
  } = useComponentSelection({ componentHierarchy: components })
  const [isRenewingLibrary, startRenewLibraryTransition] = useTransition()
  const [renewMessage, setRenewMessage] = useState('')
  const [pageWidth, setPageWidth] = useState(DEFAULT_PAGE_WIDTH)

  const updatePageWidth = (nextWidth: number) => {
    if (!Number.isFinite(nextWidth)) return

    const normalizedWidth = Math.round(nextWidth)
    setPageWidth(Math.min(MAX_PAGE_WIDTH, Math.max(MIN_PAGE_WIDTH, normalizedWidth)))
  }

  const handleCreateComponent = async () => {
    const response = await fetch('/api/create-component', { method: 'POST' })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error ?? 'Failed to create component')
    }

    startRenewLibraryTransition(() => {
      router.refresh()
    })
    return data.componentName as string
  }

  const handleDeleteComponent = async (componentName: string) => {
    const response = await fetch('/api/delete-component', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ componentName }),
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error ?? 'Failed to delete component')
    }

    startRenewLibraryTransition(() => {
      router.refresh()
    })
  }

  const handleRenewLibrary = async () => {
    setRenewMessage('')

    try {
      const response = await fetch('/api/renew-library', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to renew library')
      }

      startRenewLibraryTransition(() => {
        router.refresh()
      })
      setRenewMessage('Library renewed')
    } catch (error) {
      console.error(error)
      setRenewMessage('Failed to renew library')
    }
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <ComponentTree
        selectedComponent={selectedComponent}
        setSelectedComponent={setSelectedComponent}
        navigateDown={navigateDown}
        components={components}
        onCreateComponent={handleCreateComponent}
        onDeleteComponent={handleDeleteComponent}
      />

      <main className="ml-64 mr-96 flex-1 overflow-x-hidden px-8 py-10 md:px-12">
        <div className="mx-auto mb-8 max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Component Library
            </h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => void handleRenewLibrary()}
                disabled={isRenewingLibrary}
              >
                {isRenewingLibrary ? 'Renewing...' : 'Renew Library'}
              </button>
              {renewMessage ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{renewMessage}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 border-y border-zinc-200 py-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-4">
              <label
                htmlFor="library-page-width"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
              >
                Page width
              </label>
              <input
                id="library-page-width"
                type="range"
                min={MIN_PAGE_WIDTH}
                max={MAX_PAGE_WIDTH}
                step={1}
                value={pageWidth}
                onChange={(event) => updatePageWidth(Number(event.target.value))}
                className="h-2 min-w-56 flex-1 accent-zinc-900 dark:accent-zinc-100"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={MIN_PAGE_WIDTH}
                  max={MAX_PAGE_WIDTH}
                  step={1}
                  value={pageWidth}
                  onChange={(event) => updatePageWidth(Number(event.target.value))}
                  className="h-9 w-24 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  aria-label="Page width in pixels"
                />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">px</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PAGE_WIDTH_PRESETS.map((presetWidth) => (
                <button
                  key={presetWidth}
                  type="button"
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 aria-pressed:border-zinc-900 aria-pressed:bg-zinc-900 aria-pressed:text-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:aria-pressed:border-zinc-100 dark:aria-pressed:bg-zinc-100 dark:aria-pressed:text-zinc-950"
                  aria-pressed={pageWidth === presetWidth}
                  onClick={() => updatePageWidth(presetWidth)}
                >
                  {presetWidth}px
                </button>
              ))}
              <button
                type="button"
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => updatePageWidth(DEFAULT_PAGE_WIDTH)}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-6">
          <div
            ref={canvasRef}
            className="mx-auto space-y-8"
            style={{ width: `${pageWidth}px` }}
            onClickCapture={handleCanvasClickCapture}
            onDoubleClickCapture={handleCanvasDoubleClickCapture}
          >
            {children}
          </div>
        </div>
      </main>

      <StyleEditor
        selectedComponent={selectedComponent}
        selectedComponentSize={selectedComponentSize}
        components={components}
        previewRootRef={canvasRef}
      />
    </div>
  )
}
