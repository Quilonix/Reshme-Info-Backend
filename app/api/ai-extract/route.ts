import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    // 1. Security Check: Authenticate caller
    const supabaseServer = await createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    let isAuthorized = !!user;
    if (!isAuthorized) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: userFromToken } = await supabaseServer.auth.getUser(token);
        isAuthorized = !!userFromToken?.user;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required to use AI Price Extractor.' }, { status: 401 });
    }

    const { text, provider } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const prompt = `You are an expert parser for Karnataka Silk Cocoon Market bulletins and WhatsApp market slips in Kannada or English.
Extract all silk cocoon price records from the text below.
Return ONLY a valid JSON object with a "records" array:
{
  "records": [
    {
      "market_name": "Sidlaghatta",
      "breed": "CB",
      "min_price": 480,
      "max_price": 786,
      "avg_price": 709,
      "lot_number": 437,
      "total_weight": 23181,
      "report_date": "2026-08-17"
    }
  ]
}

Rules:
- market_name: standard APMC market name (e.g. Ramanagara, Sidlaghatta, Kolar, Vijayapura, Chintamani, Kanakapura).
- breed: "CB" (Cross Breed/ಮಿಶ್ರತಳಿ), "BV" (Bivoltine/ಬೈವೋಲ್ಟಿನ್), or "CB_GOLD".
- min_price, max_price, avg_price: numbers in INR.
- lot_number: total lots as an integer if present, otherwise null.
- total_weight: total kg as a number if present, otherwise null.
- report_date: formatted as YYYY-MM-DD (convert DD/MM/YYYY e.g. 17/08/2026 to 2026-08-17).

Input text:
${text}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    let extractedList: any[] = [];
    let usedProvider = 'heuristic';

    // 1. Try Groq (openai/gpt-oss-120b or openai/gpt-oss-20b)
    if (groqKey && (provider === 'groq' || !geminiKey)) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.1,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(rawText);
          extractedList = extractRecordsArray(parsed);
          usedProvider = 'groq-gpt-oss-120b';
        }
      } catch (e) {
        console.warn('Groq extraction notice:', e);
      }
    }

    // 2. Try Gemini 1.5 Flash if selected or if Groq didn't produce results
    if (extractedList.length === 0 && geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { response_mime_type: 'application/json' },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(clean);
          extractedList = extractRecordsArray(parsed);
          usedProvider = 'gemini-1.5-flash';
        }
      } catch (e) {
        console.warn('Gemini extraction notice:', e);
      }
    }

    // 3. Fallback Heuristic Parser if AI did not return any records
    if (extractedList.length === 0) {
      extractedList = heuristicParse(text, today);
      usedProvider = 'pattern-parser';
    }

    return NextResponse.json({
      success: true,
      data: extractedList,
      count: extractedList.length,
      provider: usedProvider,
    });
  } catch (err: any) {
    console.error('AI extraction error:', err);
    return NextResponse.json({ error: err.message || 'Extraction failed' }, { status: 500 });
  }
}

// Helper to extract array from whatever structure LLM returned
function extractRecordsArray(parsed: any): any[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed.records && Array.isArray(parsed.records)) return parsed.records;
  if (parsed.prices && Array.isArray(parsed.prices)) return parsed.prices;
  if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
  if (parsed.market_name) return [parsed];
  return [];
}

// Resilient Regex Pattern Parser for slips
function heuristicParse(text: string, defaultDate: string): any[] {
  const records: any[] = [];

  // 1. Detect Market
  let market = 'Sidlaghatta';
  if (/ramanagara|ರಾಮನಗರ/i.test(text)) market = 'Ramanagara';
  else if (/shidlaghatta|sidlaghatta|ಶಿಡ್ಲಘಟ್ಟ/i.test(text)) market = 'Sidlaghatta';
  else if (/kolar|ಕೋಲಾರ/i.test(text)) market = 'Kolar';
  else if (/vijayapura|ವಿಜಯಪುರ/i.test(text)) market = 'Vijayapura';
  else if (/chintamani|ಚಿಂತಾಮಣಿ/i.test(text)) market = 'Chintamani';
  else if (/kanakapura|ಕನಕಪುರ/i.test(text)) market = 'Kanakapura';

  // 2. Detect Date
  let date = defaultDate;
  const dateMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3];
    date = `${year}-${month}-${day}`;
  }

  // 3. Extract CB block
  const cbBlockMatch = text.match(/CB[\s\S]*?(?=BV|$)/i);
  if (cbBlockMatch) {
    const block = cbBlockMatch[0];
    const minM = block.match(/(?:mn|min|ಕನಿಷ್ಠ)[\s:-]*([0-9]{3,4})/i);
    const maxM = block.match(/(?:mx|max|ಗರಿಷ್ಠ)[\s:-]*([0-9]{3,4})/i);
    const avgM = block.match(/(?:avg|ಸರಾಸರಿ)[\s:-]*([0-9]{3,4})/i);
    const lotsM = block.match(/lots?[\s:-]*([0-9]+)/i);
    const qtyM = block.match(/(?:qty|weight)[\s:-]*([0-9]+(?:\.[0-9]+)?)/i);

    if (minM || maxM || avgM) {
      const min = minM ? parseFloat(minM[1]) : 480;
      const max = maxM ? parseFloat(maxM[1]) : 780;
      const avg = avgM ? parseFloat(avgM[1]) : Math.round((min + max) / 2);
      records.push({
        market_name: market,
        breed: 'CB',
        quality: 'A',
        min_price: min,
        max_price: max,
        avg_price: avg,
        lot_number: lotsM ? parseInt(lotsM[1]) : null,
        total_weight: qtyM ? parseFloat(qtyM[1]) : null,
        report_date: date,
      });
    }
  }

  // 4. Extract BV block
  const bvBlockMatch = text.match(/BV[\s\S]*/i);
  if (bvBlockMatch) {
    const block = bvBlockMatch[0];
    const minM = block.match(/(?:mn|min|ಕನಿಷ್ಠ)[\s:-]*([0-9]{3,4})/i);
    const maxM = block.match(/(?:mx|max|ಗರಿಷ್ಠ)[\s:-]*([0-9]{3,4})/i);
    const avgM = block.match(/(?:avg|ಸರಾಸರಿ)[\s:-]*([0-9]{3,4})/i);
    const lotsM = block.match(/lots?[\s:-]*([0-9]+)/i);
    const qtyM = block.match(/(?:qty|weight)[\s:-]*([0-9]+(?:\.[0-9]+)?)/i);

    if (minM || maxM || avgM) {
      const min = minM ? parseFloat(minM[1]) : 650;
      const max = maxM ? parseFloat(maxM[1]) : 870;
      const avg = avgM ? parseFloat(avgM[1]) : Math.round((min + max) / 2);
      records.push({
        market_name: market,
        breed: 'BV',
        quality: 'A',
        min_price: min,
        max_price: max,
        avg_price: avg,
        lot_number: lotsM ? parseInt(lotsM[1]) : null,
        total_weight: qtyM ? parseFloat(qtyM[1]) : null,
        report_date: date,
      });
    }
  }

  return records;
}
