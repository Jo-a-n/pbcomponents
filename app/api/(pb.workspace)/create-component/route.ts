import { readFile, readdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { NextResponse } from 'next/server'

const execFileAsync = promisify(execFile)
const COMPONENTS_DIR = join(process.cwd(), 'components')
const TEMPLATES_DIR = join(process.cwd(), 'app/api/(pb.workspace)/create-component/templates')
const HIERARCHY_SCRIPT = join(process.cwd(), 'scripts', 'pb.workspace', 'generate-component-hierarchy.mjs')
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

async function renderTemplate(templateFile: string, componentName: string, fileName: string) {
  const template = await readFile(join(TEMPLATES_DIR, templateFile), 'utf8')
  return template
    .replaceAll('COMPONENT_NAME_TITLE', `${componentName}Title`)
    .replaceAll('COMPONENT_NAME_ACTION', `${componentName}Action`)
    .replaceAll('COMPONENT_NAME_VIEW', `${componentName}View`)
    .replaceAll('COMPONENT_NAME', componentName)
    .replaceAll('FILE_NAME', fileName)
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

    await writeFile(tsxPath, await renderTemplate('component.tsx', componentName, fileName), { encoding: 'utf8', flag: 'wx' })
    await writeFile(jsonPath, await renderTemplate('component.json', componentName, fileName), { encoding: 'utf8', flag: 'wx' })
    await writeFile(viewPath, await renderTemplate('component.view.tsx', componentName, fileName), { encoding: 'utf8', flag: 'wx' })
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
