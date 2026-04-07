'use client'
import Link from 'next/link'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card"
import {
  Frame,
  FrameTitle,
  FrameAction,
} from "@/components/frame"
import { StyleEditor } from '@/pb.workspace/StyleEditor'
import { ComponentTree } from '@/pb.workspace/ComponentTree'
import { componentHierarchy } from '@/lib/component-selection/componentHierarchy.generated'
import { useComponentSelection } from '@/lib/component-selection/useComponentSelection'

export default function Home() {
  const {
    selectedComponent,
    setSelectedComponent,
    canvasRef,
    navigateDown,
    handleCanvasClickCapture,
    handleCanvasDoubleClickCapture,
  } = useComponentSelection({ componentHierarchy })

  const handleCreateComponent = async () => {
    const response = await fetch('/api/create-component', { method: 'POST' })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error ?? 'Failed to create component')
    }

    // Refresh so the updated generated hierarchy is re-imported.
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

    // Refresh so the updated generated hierarchy is re-imported.
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <ComponentTree
        selectedComponent={selectedComponent}
        setSelectedComponent={setSelectedComponent}
        navigateDown={navigateDown}
        components={componentHierarchy}
        onCreateComponent={handleCreateComponent}
        onDeleteComponent={handleDeleteComponent}
      />

      <main className="flex-1 flex items-center justify-center py-32 px-16 ml-64">
        <div className="absolute top-6 right-[26rem]">
          <Link
            href="/library"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Open Library
          </Link>
        </div>
        <div
          ref={canvasRef}
          className="w-full max-w-3xl grid gap-4"
          onClickCapture={handleCanvasClickCapture}
          onDoubleClickCapture={handleCanvasDoubleClickCapture}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                Card Title
              </CardTitle>
              <CardDescription>
                Card Description
              </CardDescription>
              <CardAction>
                Card Action
              </CardAction>
            </CardHeader>
            <CardContent>
              <p>Card Content</p>
            </CardContent>
            <CardFooter>
              <p>Card Footer</p>
            </CardFooter>
          </Card>
          
          <Frame>
            <FrameTitle>
              Card Title Card TitleCard TitleCard TitleCard TitleCard TitleCard TitleCard TitleCard Title
            </FrameTitle>
            <FrameAction>
              Card Action
            </FrameAction>
          </Frame>
        </div>  
        
      </main>
      <StyleEditor selectedComponent={selectedComponent} components={componentHierarchy} />
    </div>
  );
}
