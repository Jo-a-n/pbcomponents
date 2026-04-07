import * as React from 'react'

import { componentHierarchy } from '@/lib/component-selection/componentHierarchy.generated'
import { componentNameToFileName } from '@/pb.workspace/componentNameToFileName'
import { LibraryWorkspace } from '@/pb.workspace/LibraryWorkspace'

type ComponentModule = Record<string, React.ComponentType<{ children?: React.ReactNode; className?: string }>>
type ViewModule = Record<string, React.ComponentType>

async function loadComponentModule(fileName: string) {
  const componentModule = (await import(`@/components/${fileName}.tsx`)) as ComponentModule
  return componentModule
}

async function loadViewModule(fileName: string) {
  const viewModule = (await import(`@/components/${fileName}.view.tsx`)) as ViewModule
  return viewModule
}

function isComponent(value: unknown): value is React.ComponentType<{ children?: React.ReactNode; className?: string }> {
  return typeof value === 'function'
}

function renderComponentGroup(groupName: string, childrenNames: string[], componentModule: ComponentModule) {
  const Parent = componentModule[groupName]
  if (!isComponent(Parent)) return null

  const childElements = childrenNames
    .map((childName) => {
      const Child = componentModule[childName]
      if (!isComponent(Child)) return null
      return <Child key={childName}>{childName}</Child>
    })
    .filter(Boolean)

  return <Parent className="w-full">{childElements.length > 0 ? childElements : `${groupName} preview`}</Parent>
}

export default async function LibraryPage() {
  const groups = await Promise.all(
    componentHierarchy.map(async (group) => {
      const fileName = componentNameToFileName(group.name)
      let preview: React.ReactNode = null

      try {
        const viewModule = await loadViewModule(fileName)
        const View = viewModule[`${group.name}View`]
        if (isComponent(View)) {
          preview = <View />
        }
      } catch {
        // Fallback to generic composition when no dedicated view exists.
      }

      if (!preview) {
        const componentModule = await loadComponentModule(fileName)
        preview = renderComponentGroup(group.name, group.children, componentModule)
      }

      return { group, preview }
    })
  )

  return (
    <LibraryWorkspace components={componentHierarchy}>
      <div className="space-y-8">
        {groups.map(({ group, preview }) => (
          <section
            key={group.name}
          >
            <h2 className="mb-2 text-md italic text-zinc-500 dark:text-zinc-100">
              {group.name}
            </h2>
            <div className="border-t border-zinc-200 py-4 dark:border-zinc-800 grid gap-4">{preview}</div>
          </section>
        ))}
      </div>
    </LibraryWorkspace>
  )
}
