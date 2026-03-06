import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const newStyles = await request.json()
    
    const filePath = join(process.cwd(), 'components', 'frame.json')
    
    // Read current styles
    const currentStylesData = await readFile(filePath, 'utf-8')
    const currentStyles = JSON.parse(currentStylesData)
    
    // Merge new styles with current styles
    const updatedStyles = { ...currentStyles, ...newStyles }
    
    await writeFile(filePath, JSON.stringify(updatedStyles, null, 2), 'utf-8')
    
    return NextResponse.json({ success: true, message: 'Styles saved successfully' })
  } catch (error) {
    console.error('Error saving styles:', error)
    return NextResponse.json(
      { error: 'Failed to save styles', details: String(error) },
      { status: 500 }
    )
  }
}
