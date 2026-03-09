'use client'
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
import { StyleEditor } from '@/components/panels/StyleEditor'
import { ComponentTree } from '@/components/panels/ComponentTree'
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

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <ComponentTree
        selectedComponent={selectedComponent}
        setSelectedComponent={setSelectedComponent}
        navigateDown={navigateDown}
        components={componentHierarchy}
      />

      <main className="flex-1 flex items-center justify-center py-32 px-16 ml-64">
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
