import { readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { NextRequest, NextResponse } from 'next/server'
import { componentNameToFileName } from '@/pb.workspace/componentNameToFileName'

const execFileAsync = promisify(execFile)
const COMPONENTS_DIR = join(process.cwd(), 'components')
const HIERARCHY_SCRIPT = join(process.cwd(), 'scripts', 'pb.workspace', 'generate-component-hierarchy.mjs')

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const componentName = typeof payload?.componentName === 'string' ? payload.componentName : ''

    if (!/^Div\d{3}$/.test(componentName)) {
      return NextResponse.json(
        { error: 'Only generated Div components can be deleted.' },
        { status: 400 }
      )
    }

    const fileName = componentNameToFileName(componentName)
    const filesToDelete = [`${fileName}.tsx`, `${fileName}.json`, `${fileName}.view.tsx`]
    const currentFiles = new Set(await readdir(COMPONENTS_DIR))

    await Promise.all(
      filesToDelete
        .filter((file) => currentFiles.has(file))
        .map((file) => unlink(join(COMPONENTS_DIR, file)))
    )

    await execFileAsync('node', [HIERARCHY_SCRIPT], { cwd: process.cwd() })

    return NextResponse.json({
      success: true,
      componentName,
      deletedFiles: filesToDelete,
    })
  } catch (error) {
    console.error('Error deleting component files:', error)
    return NextResponse.json(
      { error: 'Failed to delete component files', details: String(error) },
      { status: 500 }
    )
  }
}
