import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

type VisionResponse = {
  responses: Array<{
    fullTextAnnotation?: { text: string }
    error?: { message: string }
  }>
}

function hasJapanese(str: string) {
  return /[\u3040-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]/.test(str)
}

function parseAmount(str: string): number | null {
  const cleaned = str.replace(/[,，、\s¥￥円]/g, '')
  const n = parseInt(cleaned)
  return isNaN(n) || n <= 0 || n >= 10000000 ? null : n
}

function extractLineAmount(line: string): number | null {
  const nums = [...line.matchAll(/[\d,]+/g)]
  if (nums.length === 0) return null
  return parseAmount(nums[nums.length - 1][0])
}

function extractReceiptFields(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  console.log('=== OCR RAW LINES ===')
  lines.forEach((l, i) => console.log(`${i}: ${l}`))

  // ── Issue date ──────────────────────────────────────────────
  let issue_date: string | null = null

  const isoDate = text.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/)
  if (isoDate) {
    issue_date = `${isoDate[1]}-${isoDate[2].padStart(2,'0')}-${isoDate[3].padStart(2,'0')}`
  }
  if (!issue_date) {
    const reiwa = text.match(/令和\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/)
    if (reiwa) issue_date = `${2018+parseInt(reiwa[1])}-${reiwa[2].padStart(2,'0')}-${reiwa[3].padStart(2,'0')}`
  }
  if (!issue_date) {
    const heisei = text.match(/平成\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/)
    if (heisei) issue_date = `${1988+parseInt(heisei[1])}-${heisei[2].padStart(2,'0')}-${heisei[3].padStart(2,'0')}`
  }
  if (!issue_date) {
    const jpDate = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
    if (jpDate) issue_date = `${jpDate[1]}-${jpDate[2].padStart(2,'0')}-${jpDate[3].padStart(2,'0')}`
  }

  // ── Total amount ─────────────────────────────────────────────
  const cashPattern = /現金|お預かり|釣銭|チェンジ|おつり|クレジット|カード|ポイント|割引|値引|返金/

  let total_amount: number | null = null

  // Find 合計 line index
  const totalLineIdx = lines.findIndex(l =>
    /^合計$|^小計$|^お支払|^支払合計|^請求|^総額/.test(l) ||
    /合計[:：]|小計[:：]/.test(l)
  )

  if (totalLineIdx >= 0) {
    // Try same line first
    const sameLineAmt = extractLineAmount(lines[totalLineIdx])
    if (sameLineAmt) {
      total_amount = sameLineAmt
    } else {
      // Scan forward for first ¥ amount not on a cash line
      // Skip lines that are cash-related or intermediate subtotals
      for (let i = totalLineIdx + 1; i < Math.min(totalLineIdx + 6, lines.length); i++) {
        if (cashPattern.test(lines[i])) continue
        // Match standalone ¥ amount lines like "¥479"
        const amtMatch = lines[i].match(/^[¥￥]([\d,]+)$/)
        if (amtMatch) {
          const amt = parseAmount(amtMatch[1])
          if (amt) { total_amount = amt; break }
        }
        // Also match plain number lines
        if (/^[\d,]+$/.test(lines[i])) {
          const amt = parseAmount(lines[i])
          if (amt) { total_amount = amt; break }
        }
      }
    }
  }

  // Fallback: largest ¥ amount excluding cash lines
  if (!total_amount) {
    const candidates: number[] = []
    for (const line of lines) {
      if (cashPattern.test(line)) continue
      const m = line.match(/[¥￥]\s*([\d,]+)/)
      if (m) {
        const amt = parseAmount(m[1])
        if (amt) candidates.push(amt)
      }
    }
    if (candidates.length > 0) total_amount = Math.max(...candidates)
  }

  // ── Tax amount ───────────────────────────────────────────────
  // Handles two formats:
  // Format A: "内消費税等: 43" (amount on same line)
  // Format B: "消費税等 ( 10%)" on one line, "¥43" on next line
  let tax_amount: number | null = null

  const taxKeywordPattern = /消費税|内税|外税|税額|うち税/

  for (let i = 0; i < lines.length; i++) {
    if (!taxKeywordPattern.test(lines[i])) continue

    // Skip lines that are about taxable base amount (課税対象額)
    if (/課税対象|課税売上/.test(lines[i])) continue

    // Try same line
    const sameAmt = extractLineAmount(lines[i])
    if (sameAmt && sameAmt !== 8 && sameAmt !== 10) {
      tax_amount = sameAmt
      break
    }

    // Try next line (standalone ¥ amount)
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      const nextMatch = nextLine.match(/^[¥￥]([\d,]+)$/)
      if (nextMatch) {
        const amt = parseAmount(nextMatch[1])
        if (amt && amt !== 8 && amt !== 10) {
          tax_amount = amt
          break
        }
      }
    }
  }

  // ── Tax rate ─────────────────────────────────────────────────
  // Only use explicit (10%) or (8%) markers
  // Ignore 軽減税率 if followed by 非課税 (means item is NOT reduced rate)
  let tax_rate: number | null = null

  const rate10 = /[（(]\s*10\s*[%％]\s*[）)]/.test(text)
  const rate8 = /[（(]\s*8\s*[%％]\s*[）)]/.test(text)

  // Check if 軽減税率 is actually applied (not just mentioned as non-applicable)
  const reducedRateApplied = /軽減税率/.test(text) && !/軽減税率\s*非課税|非課税.*軽減税率|※.*軽減税率/.test(text)

  if (reducedRateApplied || (rate8 && !rate10)) {
    tax_rate = 8
  } else if (rate10) {
    tax_rate = 10
  } else if (taxKeywordPattern.test(text)) {
    tax_rate = 10
  }

  // ── Payee name ───────────────────────────────────────────────
  let payee_name: string | null = null
  const skipLine = /領収書|レシート|合計|日付|TEL|電話|〒|住所|担当|登録番号|インボイス|No\.|receipt|Books\s*&\s*Stationery/i

  // Strategy 1: line before 領収書
  const receiptIdx = lines.findIndex(l => /^領収書$|^レシート$/.test(l))
  if (receiptIdx > 0) {
    const candidate = lines[receiptIdx - 1]
    if (candidate && candidate.length > 1 && candidate.length < 60 && !skipLine.test(candidate)) {
      payee_name = candidate
    }
  }

  // Strategy 2: first Japanese line that looks like a name
  if (!payee_name) {
    for (const line of lines.slice(0, 10)) {
      if (
        hasJapanese(line) &&
        line.length >= 2 && line.length <= 60 &&
        !line.match(/^\d/) && !line.match(/^[¥￥]/) &&
        !skipLine.test(line) && !cashPattern.test(line)
      ) {
        payee_name = line
        break
      }
    }
  }

  // Strategy 3: any clean non-numeric line
  if (!payee_name) {
    for (const line of lines.slice(0, 5)) {
      if (
        line.length >= 2 && line.length <= 60 &&
        !line.match(/^\d/) && !line.match(/^[¥￥]/) &&
        !skipLine.test(line)
      ) {
        payee_name = line
        break
      }
    }
  }

  // Prefer Japanese over English-only
  if (payee_name && !hasJapanese(payee_name)) {
    const jpCandidate = lines.slice(0, 10).find(l =>
      hasJapanese(l) && l.length >= 2 && l.length <= 60 &&
      !skipLine.test(l) && !l.match(/^\d/)
    )
    if (jpCandidate) payee_name = jpCandidate
  }

  console.log('=== OCR RESULT ===', { issue_date, payee_name, total_amount, tax_amount, tax_rate })

  return { issue_date, payee_name, total_amount, tax_amount, tax_rate, raw_text: text }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imagePath } = await request.json()
  if (!imagePath) return NextResponse.json({ error: 'No image path provided' }, { status: 400 })

  if (!imagePath.startsWith(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('receipts').download(imagePath)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to download image' }, { status: 500 })
  }

  const buffer = await fileData.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

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
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          imageContext: { languageHints: ['ja', 'en'] },
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
  if (!rawText) return NextResponse.json({ error: 'No text detected in image' }, { status: 422 })

  const fields = extractReceiptFields(rawText)
  return NextResponse.json(fields)
}
