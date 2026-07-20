import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

type VisionResponse = {
  responses: Array<{
    fullTextAnnotation?: {
      text: string
    }
    error?: {
      message: string
    }
  }>
}

function extractReceiptFields(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // --- Issue date ---
  // Matches: 2024/01/15, 2024-01-15, 令和6年1月15日, R6.1.15 etc.
  let issue_date: string | null = null

  const isoDate = text.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/)
  if (isoDate) {
    const y = isoDate[1]
    const m = String(isoDate[2]).padStart(2, '0')
    const d = String(isoDate[3]).padStart(2, '0')
    issue_date = `${y}-${m}-${d}`
  }

  // Japanese era dates: 令和6年1月15日 / R6.1.15
  if (!issue_date) {
    const reiwa = text.match(/令和\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/)
    if (reiwa) {
      const y = 2018 + parseInt(reiwa[1])
      const m = String(reiwa[2]).padStart(2, '0')
      const d = String(reiwa[3]).padStart(2, '0')
      issue_date = `${y}-${m}-${d}`
    }
  }

  if (!issue_date) {
    const heisei = text.match(/平成\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/)
    if (heisei) {
      const y = 1988 + parseInt(heisei[1])
      const m = String(heisei[2]).padStart(2, '0')
      const d = String(heisei[3]).padStart(2, '0')
      issue_date = `${y}-${m}-${d}`
    }
  }

  // --- Total amount ---
  // Matches: ¥1,234 / 合計 1,234円 / 1234円 / 計 ¥1,234
  let total_amount: number | null = null
  let tax_amount: number | null = null

  // Look for 合計/total lines first
  const totalPatterns = [
    /合[計算]\s*[¥￥]?\s*([\d,]+)/,
    /お?[会支]?払[い合]?\s*[¥￥]?\s*([\d,]+)/,
    /総[計合]?\s*[¥￥]?\s*([\d,]+)/,
    /[¥￥]\s*([\d,]+)\s*円?/,
    /([\d,]+)\s*円/,
  ]

  for (const pattern of totalPatterns) {
    const match = text.match(pattern)
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ''))
      if (amount > 0 && amount < 10000000) {
        total_amount = amount
        break
      }
    }
  }

  // Tax amount
  const taxMatch = text.match(/(?:消費税|税額|内税|外税)\s*[¥￥]?\s*([\d,]+)/)
  if (taxMatch) {
    tax_amount = parseInt(taxMatch[1].replace(/,/g, ''))
  }

  // --- Tax rate ---
  let tax_rate: number | null = null
  if (text.includes('軽減税率') || text.match(/8\s*%/)) {
    tax_rate = 8
  } else if (text.match(/10\s*%/) || text.includes('消費税')) {
    tax_rate = 10
  }

  // --- Payee name ---
  // Usually the first meaningful line, or line after 領収書
  let payee_name: string | null = null

  // Look for 領収書 and take the line before or after
  const receiptIdx = lines.findIndex(l => l.includes('領収書') || l.includes('レシート'))
  if (receiptIdx > 0) {
    // Line before 領収書 is often the shop name
    const candidate = lines[receiptIdx - 1]
    if (candidate && candidate.length > 1 && candidate.length < 50) {
      payee_name = candidate
    }
  }

  // If not found, take first line that looks like a name (not a date or number)
  if (!payee_name) {
    for (const line of lines.slice(0, 5)) {
      if (
        line.length > 1 &&
        line.length < 50 &&
        !line.match(/^\d/) &&
        !line.match(/^[¥￥]/) &&
        !line.match(/領収書|レシート|合計|日付|TEL|電話/)
      ) {
        payee_name = line
        break
      }
    }
  }

  return {
    issue_date,
    payee_name,
    total_amount,
    tax_amount,
    tax_rate,
    raw_text: text,
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imagePath } = await request.json()
  if (!imagePath) return NextResponse.json({ error: 'No image path provided' }, { status: 400 })

  // Verify ownership
  if (!imagePath.startsWith(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Download image from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('receipts')
    .download(imagePath)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to download image' }, { status: 500 })
  }

  // Convert to base64
  const buffer = await fileData.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  // Send to Google Vision API
  const apiKey = process.env.GOOGLE_VISION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Vision API key not configured' }, { status: 500 })

  const visionRes = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [
            { type: 'DOCUMENT_TEXT_DETECTION' },
          ],
          imageContext: {
            languageHints: ['ja', 'en'],
          },
        }],
      }),
    }
  )

  const visionData: VisionResponse = await visionRes.json()

  if (!visionRes.ok || visionData.responses[0]?.error) {
    const msg = visionData.responses[0]?.error?.message ?? 'Vision API error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const rawText = visionData.responses[0]?.fullTextAnnotation?.text ?? ''

  if (!rawText) {
    return NextResponse.json({ error: 'No text detected in image' }, { status: 422 })
  }

  // Extract structured fields
  const fields = extractReceiptFields(rawText)

  return NextResponse.json(fields)
}
