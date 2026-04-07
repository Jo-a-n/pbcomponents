'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { ComponentTree } from '@/pb.workspace/ComponentTree'
import { StyleEditor } from '@/pb.workspace/StyleEditor'
import { useComponentSelection } from '@/lib/component-selection/useComponentSelection'
import type { ComponentGroup } from '@/lib/component-selection/types'

interface LibraryWorkspaceProps {
  components: ComponentGroup[]
  children: ReactNode
}

export function LibraryWorkspace({ components, children }: LibraryWorkspaceProps) {
  const router = useRouter()
  const {
    selectedComponent,
    setSelectedComponent,
    canvasRef,
    navigateDown,
    handleCanvasClickCapture,
    handleCanvasDoubleClickCapture,
  } = useComponentSelection({ componentHierarchy: components })
  const [isRenewingLibrary, startRenewLibraryTransition] = useTransition()
  const [renewMessage, setRenewMessage] = useState('')

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

      <main className="ml-64 mr-96 flex-1 px-8 py-10 md:px-12">
        <div className="mx-auto mb-8 flex max-w-5xl items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Component Library
          </h1>
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => void handleRenewLibrary()}
            disabled={isRenewingLibrary}
          >
            {isRenewingLibrary ? 'Renewing…' : 'Renew Library'}
          </button>
          {renewMessage ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{renewMessage}</p>
          ) : null}
        </div>
        <div
          ref={canvasRef}
          className="mx-auto max-w-5xl space-y-8"
          onClickCapture={handleCanvasClickCapture}
          onDoubleClickCapture={handleCanvasDoubleClickCapture}
        >
          {children}
        </div>
      </main>

      <StyleEditor selectedComponent={selectedComponent} components={components} />
    </div>
  )
}
