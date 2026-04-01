import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { tokenizeClassString } from '@/lib/style-editor/class-tokens.mjs'

type StyleValue = string | string[]

const CATEGORY_GROUPS = [
  { key: 'padding', pattern: /^(p|px|py|pl|pr|pt|pb)-.+$/ },
  { key: 'margin', pattern: /^(m|mx|my|ml|mr|mt|mb|ms|me)-.+$/ },
  {
    key: 'limits',
    pattern:
      /^(rounded(?:-(?:tl|tr|br|bl|t|r|b|l))?(?:-.+)?|w-.+|h-.+|min-w-.+|max-w-.+|min-h-.+|max-h-.+|size-.+|basis-.+)$/
  },
  {
    key: 'flex',
    pattern:
      /^(flex|inline-flex|grid|inline-grid|flex-(?:row|col|wrap|nowrap|1|auto|initial|none)|grid-cols-.+|grid-rows-.+|col-.+|row-.+|auto-cols-.+|auto-rows-.+|items-.+|justify-.+|content-.+|self-.+|place-(?:items|content|self)-.+|gap(?:-[xy])?-.+|grow(?:-.+)?|shrink(?:-.+)?|order-.+)$/
  },
  {
    key: 'text',
    pattern:
      /^(text-.+|font-.+|leading-.+|tracking-.+|whitespace-.+|break-.+|truncate|line-clamp-.+|uppercase|lowercase|capitalize|normal-case|italic|not-italic|antialiased|subpixel-antialiased|underline|overline|line-through|no-underline|decoration-.+|underline-offset-.+)$/
  },
  {
    key: 'background',
    pattern: /^(bg-(?!clip-padding$).+|from-.+|via-.+|to-.+)$/,
  },
  {
    key: 'border',
    pattern: /^(border(?:-[trblxy])?(?:-.+)?|divide(?:-[xy])?(?:-.+)?|outline(?:-.+)?)$/,
  },
  {
    key: 'effects',
    pattern: /^(ring(?:-[trblxy])?(?:-.+)?|shadow(?:-.+)?|opacity-.+|mix-blend-.+|bg-blend-.+|blur(?:-.+)?|backdrop-.+)$/,
  },
] as const

function isSafeComponentFileName(value: string) {
  return /^[a-z0-9-]+$/.test(value)
}

function getComponentJsonPath(fileName: string) {
  return join(process.cwd(), 'components', `${fileName}.json`)
}

function tokenMatchesKnownCategory(token: string) {
  return CATEGORY_GROUPS.some((group) => group.pattern.test(token))
}

function normalizeStyleValueForSave(value: StyleValue, originalValue: unknown): StyleValue {
  const raw = Array.isArray(value) ? value.join(' ') : value
  const tokens = Array.from(new Set(tokenizeClassString(raw).filter(Boolean)))

  if (!Array.isArray(originalValue) && !Array.isArray(value)) {
    return tokens.join(' ')
  }

  const groupedLines = CATEGORY_GROUPS
    .map((group) => tokens.filter((token) => group.pattern.test(token)).join(' '))
    .filter(Boolean)

  const otherTokens = tokens.filter((token) => !tokenMatchesKnownCategory(token)).join(' ')
  if (otherTokens) {
    groupedLines.push(otherTokens)
  }

  return groupedLines.length > 0 ? groupedLines : ['']
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
    const currentStyles = JSON.parse(currentStylesData) as Record<string, unknown>

    const normalizedIncomingStyles = Object.fromEntries(
      Object.entries(newStyles).map(([key, value]) => [
        key,
        normalizeStyleValueForSave(value as StyleValue, currentStyles[key]),
      ])
    )

    const updatedStyles = { ...currentStyles, ...normalizedIncomingStyles }
    const currentSerializedStyles = JSON.stringify(currentStyles, null, 2)
    const updatedSerializedStyles = JSON.stringify(updatedStyles, null, 2)

    if (currentSerializedStyles === updatedSerializedStyles) {
      return NextResponse.json({ success: true, message: 'Styles unchanged', fileName })
    }

    await writeFile(filePath, updatedSerializedStyles, 'utf-8')

    return NextResponse.json({ success: true, message: 'Styles saved successfully', fileName })
  } catch (error) {
    console.error('Error saving styles:', error)
    return NextResponse.json(
      { error: 'Failed to save styles', details: String(error) },
      { status: 500 }
    )
  }
}
