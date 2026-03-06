import { writeFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const styles = await request.json()
    
    const filePath = join(process.cwd(), 'components', 'frame.json')
    
    await writeFile(filePath, JSON.stringify(styles, null, 2), 'utf-8')
    
    return NextResponse.json({ success: true, message: 'Styles saved successfully' })
  } catch (error) {
    console.error('Error saving styles:', error)
    return NextResponse.json(
      { error: 'Failed to save styles', details: String(error) },
      { status: 500 }
    )
  }
}
