import { execFile } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { NextResponse } from 'next/server'

const execFileAsync = promisify(execFile)
const HIERARCHY_SCRIPT = join(process.cwd(), 'scripts', 'pb.workspace', 'generate-component-hierarchy.mjs')

export async function POST() {
  try {
    await execFileAsync('node', [HIERARCHY_SCRIPT], { cwd: process.cwd() })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error renewing library hierarchy:', error)
    return NextResponse.json(
      { error: 'Failed to renew library hierarchy', details: String(error) },
      { status: 500 }
    )
  }
}
