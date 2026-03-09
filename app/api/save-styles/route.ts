import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

function isSafeComponentFileName(value: string) {
  return /^[a-z0-9-]+$/.test(value)
}

function getComponentJsonPath(fileName: string) {
  return join(process.cwd(), 'components', `${fileName}.json`)
}

export async function GET(request: NextRequest) {
  try {
    const fileName = request.nextUrl.searchParams.get('fileName')
    if (!fileName || !isSafeComponentFileName(fileName)) {
      return NextResponse.json({ error: 'Invalid fileName' }, { status: 400 })
    }

    const filePath = getComponentJsonPath(fileName)
    const stylesData = await readFile(filePath, 'utf-8')
    const styles = JSON.parse(stylesData)

    return NextResponse.json({ success: true, fileName, styles })
  } catch (error) {
    console.error('Error loading styles:', error)
    return NextResponse.json(
      { error: 'Failed to load styles', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const fileName = typeof payload?.fileName === 'string' ? payload.fileName : ''
    const newStyles = payload?.styles

    if (!fileName || !isSafeComponentFileName(fileName)) {
      return NextResponse.json({ error: 'Invalid fileName' }, { status: 400 })
    }

    if (!newStyles || typeof newStyles !== 'object') {
      return NextResponse.json({ error: 'Invalid styles payload' }, { status: 400 })
    }

    const filePath = getComponentJsonPath(fileName)

    const currentStylesData = await readFile(filePath, 'utf-8')
    const currentStyles = JSON.parse(currentStylesData)

    const updatedStyles = { ...currentStyles, ...newStyles }

    await writeFile(filePath, JSON.stringify(updatedStyles, null, 2), 'utf-8')

    return NextResponse.json({ success: true, message: 'Styles saved successfully', fileName })
  } catch (error) {
    console.error('Error saving styles:', error)
    return NextResponse.json(
      { error: 'Failed to save styles', details: String(error) },
      { status: 500 }
    )
  }
}
