'use client'
import { useState } from 'react'

interface ComponentTreeProps {
  selectedComponent: string | null
  setSelectedComponent: (component: string | null) => void
  navigateDown?: (component: string) => void
}

export function ComponentTree({ selectedComponent, setSelectedComponent, navigateDown }: ComponentTreeProps) {
  const [expanded, setExpanded] = useState(true)

  const components = [
    {
      name: 'Card',
      children: ['CardHeader', 'CardTitle', 'CardDescription', 'CardAction', 'CardContent', 'CardFooter']
    },
    {
      name: 'Frame',
      children: ['FrameTitle', 'FrameAction']
    }
  ]

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-4 shadow-lg">
      <h2 className="text-xl font-bold mb-4 sticky top-0 bg-white dark:bg-zinc-900 py-2">Component Tree</h2>

      <div className="space-y-1">
        {components.map((comp) => (
          <div key={comp.name}>
            <div
              className={`flex items-center p-2 rounded cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                selectedComponent === comp.name ? 'bg-blue-100 dark:bg-blue-900' : ''
              }`}
              onClick={() => setSelectedComponent(comp.name)}
              onDoubleClick={() => navigateDown && navigateDown(comp.name)}
            >
              <span className="mr-2 text-sm">📁</span>
              <span className="text-sm font-medium">{comp.name}</span>
              <button
                className="ml-auto text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(!expanded)
                }}
              >
                {expanded ? '▼' : '▶'}
              </button>
            </div>

            {expanded && (
              <div className="ml-4 space-y-1">
                {comp.children.map((child) => (
                  <div
                    key={child}
                    className={`flex items-center p-2 rounded cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      selectedComponent === child ? 'bg-blue-100 dark:bg-blue-900' : ''
                    }`}
                    onClick={() => setSelectedComponent(child)}
                    onDoubleClick={() => navigateDown && navigateDown(child)}
                  >
                    <span className="mr-2 text-sm">📄</span>
                    <span className="text-sm">{child}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium transition"
        onClick={() => setSelectedComponent(null)}
      >
        Show All
      </button>
    </div>
  )
}