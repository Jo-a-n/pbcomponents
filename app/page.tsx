'use client'
import { useState, useEffect } from 'react'
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
import { StyleEditor } from '@/components/StyleEditor'
import { ComponentTree } from '@/components/ComponentTree'

export default function Home() {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedComponent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const componentHierarchy = [
    {
      name: 'Card',
      children: ['CardHeader', 'CardTitle', 'CardDescription', 'CardAction', 'CardContent', 'CardFooter']
    },
    {
      name: 'Frame',
      children: ['FrameTitle', 'FrameAction']
    }
  ]

  const navigateDown = (currentComponent: string) => {
    // Find the parent that contains this component
    for (const group of componentHierarchy) {
      if (group.name === currentComponent) {
        // It's a parent, go to first child
        setSelectedComponent(group.children[0])
        return
      }
      const childIndex = group.children.indexOf(currentComponent)
      if (childIndex !== -1) {
        // It's a child, go to next sibling or back to first
        const nextIndex = (childIndex + 1) % group.children.length
        setSelectedComponent(group.children[nextIndex])
        return
      }
    }
    // If not found in hierarchy, do nothing
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <ComponentTree selectedComponent={selectedComponent} setSelectedComponent={setSelectedComponent} navigateDown={navigateDown} />

      <main className="flex-1 flex items-center justify-center py-32 px-16 ml-64">
        <div className="w-full max-w-3xl grid gap-4">
          <Card 
            className={selectedComponent === 'Card' ? 'ring-2 ring-blue-500' : ''} 
            onClick={() => setSelectedComponent('Card')}
            onDoubleClick={(e) => { e.stopPropagation(); setSelectedComponent('Card'); }}
          >
            <CardHeader 
              className={selectedComponent === 'CardHeader' ? 'ring-2 ring-blue-500' : ''} 
              onClick={() => setSelectedComponent('CardHeader')}
              onDoubleClick={(e) => { e.stopPropagation(); setSelectedComponent('CardHeader'); }}
            >
              <CardTitle 
                className={selectedComponent === 'CardTitle' ? 'ring-2 ring-blue-500' : ''} 
                onClick={() => setSelectedComponent('CardTitle')}
                onDoubleClick={(e) => { e.stopPropagation(); setSelectedComponent('CardTitle'); }}
              >
                Card Title
              </CardTitle>
              <CardDescription 
                className={selectedComponent === 'CardDescription' ? 'ring-2 ring-blue-500' : ''} 
                onClick={() => setSelectedComponent('CardDescription')}
                onDoubleClick={(e) => { e.stopPropagation(); setSelectedComponent('CardDescription'); }}
              >
                Card Description
              </CardDescription>
              <CardAction 
                className={selectedComponent === 'CardAction' ? 'ring-2 ring-blue-500' : ''} 
                onClick={() => setSelectedComponent('CardAction')}
                onDoubleClick={(e) => { e.stopPropagation(); setSelectedComponent('CardAction'); }}
              >
                Card Action
              </CardAction>
            </CardHeader>
            <CardContent 
              className={selectedComponent === 'CardContent' ? 'ring-2 ring-blue-500' : ''} 
              onClick={() => setSelectedComponent('CardContent')}
              onDoubleClick={(e) => { e.stopPropagation(); setSelectedComponent('CardContent'); }}
            >
              <p>Card Content</p>
            </CardContent>
            <CardFooter 
              className={selectedComponent === 'CardFooter' ? 'ring-2 ring-blue-500' : ''} 
              onClick={() => setSelectedComponent('CardFooter')}
              onDoubleClick={(e) => { e.stopPropagation(); setSelectedComponent('CardFooter'); }}
            >
              <p>Card Footer</p>
            </CardFooter>
          </Card>
          <Frame 
            className={selectedComponent === 'Frame' ? 'ring-2 ring-blue-500' : ''} 
            onClick={() => setSelectedComponent('Frame')}
            onDoubleClick={(e) => { e.stopPropagation(); setSelectedComponent('Frame'); }}
          >
            <FrameTitle 
              className={selectedComponent === 'FrameTitle' ? 'ring-2 ring-blue-500' : ''} 
              onClick={() => setSelectedComponent('FrameTitle')}
              onDoubleClick={(e) => { e.stopPropagation(); setSelectedComponent('FrameTitle'); }}
            >
              Card Title Card TitleCard TitleCard TitleCard TitleCard TitleCard TitleCard TitleCard Title
            </FrameTitle>
            <FrameAction 
              className={selectedComponent === 'FrameAction' ? 'ring-2 ring-blue-500' : ''} 
              onClick={() => setSelectedComponent('FrameAction')}
              onDoubleClick={(e) => { e.stopPropagation(); setSelectedComponent('FrameAction'); }}
            >
              Card Action
            </FrameAction>
          </Frame>
        </div>  
        
      </main>
      <StyleEditor selectedComponent={selectedComponent} />
    </div>
  );
}
