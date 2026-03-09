'use client'

import type { ReactNode } from 'react'

import { ComponentTree } from '@/components/panels/ComponentTree'
import { StyleEditor } from '@/components/panels/StyleEditor'
import { useComponentSelection } from '@/lib/component-selection/useComponentSelection'
import type { ComponentGroup } from '@/lib/component-selection/types'

interface LibraryWorkspaceProps {
  components: ComponentGroup[]
  children: ReactNode
}

export function LibraryWorkspace({ components, children }: LibraryWorkspaceProps) {
  const {
    selectedComponent,
    setSelectedComponent,
    canvasRef,
    navigateDown,
    handleCanvasClickCapture,
    handleCanvasDoubleClickCapture,
  } = useComponentSelection({ componentHierarchy: components })

  const handleCreateComponent = async () => {
    const response = await fetch('/api/create-component', { method: 'POST' })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error ?? 'Failed to create component')
    }

    // Refresh to load newly created files in the server-rendered library list.
    window.location.reload()
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

    // Refresh to remove deleted files from the server-rendered library list.
    window.location.reload()
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
