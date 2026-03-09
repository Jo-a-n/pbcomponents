import * as React from 'react'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { LibraryWorkspace } from './LibraryWorkspace'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ComponentModule = Record<string, React.ComponentType<{ children?: React.ReactNode; className?: string }>>
type ViewModule = Record<string, React.ComponentType>

type ComponentGroup = {
  fileName: string
  name: string
  children: string[]
}

function toPascalCase(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function parseExportNames(source: string) {
  const match = source.match(/export\s*\{([\s\S]*?)\}/m)
  if (!match) return []

  return match[1]
    .split(',')
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((entry) => {
      const [left] = entry.split(/\s+as\s+/)
      return left?.trim() ?? ''
    })
    .filter(Boolean)
}

async function getComponentGroups() {
  const componentsDir = path.join(process.cwd(), 'components')
  const entries = await readdir(componentsDir, { withFileTypes: true })
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.tsx') &&
        !entry.name.endsWith('.view.tsx')
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))

  const groups: ComponentGroup[] = []

  for (const fileName of files) {
    const filePath = path.join(componentsDir, fileName)
    const source = await readFile(filePath, 'utf8')
    const exports = parseExportNames(source)
    const parentName = toPascalCase(fileName.replace(/\.tsx$/, ''))

    if (!exports.includes(parentName)) {
      continue
    }

    const children = exports.filter(
      (name) => name !== parentName && name.startsWith(parentName)
    )

    groups.push({
      fileName: fileName.replace(/\.tsx$/, ''),
      name: parentName,
      children,
    })
  }

  return groups
}

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
  const componentGroups = await getComponentGroups()
  const componentHierarchy = componentGroups.map(({ name, children }) => ({ name, children }))
  const groups = await Promise.all(
    componentGroups.map(async (group) => {
      let preview: React.ReactNode = null

      try {
        const viewModule = await loadViewModule(group.fileName)
        const View = viewModule[`${group.name}View`]
        if (isComponent(View)) {
          preview = <View />
        }
      } catch {
        // Fallback to generic composition when no dedicated view exists.
      }

      if (!preview) {
        const componentModule = await loadComponentModule(group.fileName)
        preview = renderComponentGroup(group.name, group.children, componentModule)
      }

      return { group, preview }
    })
  )

  return (
    <LibraryWorkspace components={componentHierarchy}>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Component Library
      </h1>
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
