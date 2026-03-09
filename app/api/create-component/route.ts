import { readdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { NextResponse } from 'next/server'

const execFileAsync = promisify(execFile)
const COMPONENTS_DIR = join(process.cwd(), 'components')
const HIERARCHY_SCRIPT = join(process.cwd(), 'scripts', 'generate-component-hierarchy.mjs')
const FILE_PREFIX = 'div-'

function getNextComponentIndex(files: string[]) {
  const maxIndex = files.reduce((max, file) => {
    const match = file.match(/^div-(\d+)\.tsx$/)
    if (!match) return max
    const parsed = Number.parseInt(match[1] ?? '0', 10)
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max
  }, 0)

  return maxIndex + 1
}

function createComponentTsxTemplate(componentName: string, fileName: string) {
  const titleName = `${componentName}Title`
  const actionName = `${componentName}Action`

  return `import * as React from "react"
import pb from "./${fileName}.json" with { type: "json" }

import { cn } from "@/lib/utils"

function ${componentName}({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="${fileName}"
      className={cn(pb.${componentName}, className)}
      {...props}
    />
  )
}

function ${titleName}({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="${fileName}-title"
      className={cn(pb.${titleName}, className)}
      {...props}
    />
  )
}

function ${actionName}({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="${fileName}-action"
      className={cn(pb.${actionName}, className)}
      {...props}
    />
  )
}

export {
  ${componentName},
  ${titleName},
  ${actionName},
}
`
}

function createComponentJsonTemplate(componentName: string) {
  return JSON.stringify(
    {
      [componentName]: [
        'size-full border-1 bg-none rounded-none pt-none pr-none pb-none pl-none',
        'flex flex-row gap-4 flex-nowrap',
      ],
      [`${componentName}Title`]: [
        'border-none bg-red-50 rounded-none pt-none pr-none pb-none pl-none',
        'flex basis-full justify-items-end items-center',
        'text-start',
      ],
      [`${componentName}Action`]: [
        'border-none bg-red-50 rounded-none pt-none pr-none pb-none pl-none',
        'flex basis-full justify-items-center items-center',
        'text-start',
      ],
    },
    null,
    2
  )
}

function createComponentViewTemplate(componentName: string, fileName: string) {
  const titleName = `${componentName}Title`
  const actionName = `${componentName}Action`
  const componentViewName = `${componentName}View`

  return `import { ${componentName}, ${actionName}, ${titleName} } from "@/components/${fileName}"

export function ${componentViewName}() {
  return (
    <${componentName}>
      <${titleName}>${componentName} Title</${titleName}>
      <${actionName}>${componentName} Action</${actionName}>
    </${componentName}>
  )
}
`
}

export async function POST() {
  try {
    const files = await readdir(COMPONENTS_DIR)
    const nextIndex = getNextComponentIndex(files)
    const indexLabel = String(nextIndex).padStart(3, '0')
    const fileName = `${FILE_PREFIX}${indexLabel}`
    const componentName = `Div${indexLabel}`

    const tsxPath = join(COMPONENTS_DIR, `${fileName}.tsx`)
    const jsonPath = join(COMPONENTS_DIR, `${fileName}.json`)
    const viewPath = join(COMPONENTS_DIR, `${fileName}.view.tsx`)

    await writeFile(tsxPath, createComponentTsxTemplate(componentName, fileName), { encoding: 'utf8', flag: 'wx' })
    await writeFile(jsonPath, createComponentJsonTemplate(componentName), { encoding: 'utf8', flag: 'wx' })
    await writeFile(viewPath, createComponentViewTemplate(componentName, fileName), { encoding: 'utf8', flag: 'wx' })
    await execFileAsync('node', [HIERARCHY_SCRIPT], { cwd: process.cwd() })

    return NextResponse.json({
      success: true,
      componentName,
      files: [`${fileName}.tsx`, `${fileName}.json`, `${fileName}.view.tsx`],
    })
  } catch (error) {
    console.error('Error creating component files:', error)
    return NextResponse.json(
      { error: 'Failed to create component files', details: String(error) },
      { status: 500 }
    )
  }
}
