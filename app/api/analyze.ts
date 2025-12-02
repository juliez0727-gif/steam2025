import type { NextApiRequest, NextApiResponse } from 'next';
import { AnalysisReport, SteamReview } from '../../types';

type Body = {
  gameName: string;
  reviews: SteamReview[];
};

const GEMINI_MODEL = 'text-bison-001';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameName, reviews } = req.body as Body;

  if (!gameName || !Array.isArray(reviews)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: GEMINI_API_KEY missing' });
  }

  // Build a compact prompt. Keep reviews sample size limited to control payload.
  const sample = reviews.slice(0, 300).map((r, i) => `${i + 1}. ${r.review}`).join('\n');

  const instruction = `请基于下面的游戏评论集合，生成一个 JSON 对象，结构为:
{
  "summary": string,
  "positivePoints": string[],
  "negativePoints": string[],
  "technicalIssues": string[],
  "verdict": string,
  "sentimentScore": number  // 0-100
}

说明：
- 只返回严格的 JSON（不要额外文本或注释）。
- 按重点提炼要点，数组内每项短小（不超过20字）。
- sentimentScore 表示整体情绪（100 非常正面，0 非常负面）。

游戏名：${gameName}
评论样本：\n${sample}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}:generate?key=${encodeURIComponent(apiKey)}`;

    const payload = {
      prompt: { text: instruction },
      temperature: 0.1,
      maxOutputTokens: 800
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('Gemini API error:', r.status, text);
      return res.status(502).json({ error: 'AI service error', detail: text });
    }

    const json = await r.json();

    // Extract generated text from likely response shapes
    let outputText: string | undefined;
    if (json.candidates && json.candidates.length > 0 && json.candidates[0].output) {
      outputText = json.candidates[0].output;
    } else if (json.output && json.output[0] && json.output[0].content) {
      // Newer responses sometimes nest content
      const parts = json.output[0].content.map((c: any) => c.text || c.type === 'generated_text' && c.text).filter(Boolean);
      outputText = parts.join('');
    } else if (typeof json === 'object') {
      // Fallback: stringify whole response and try to pull text
      outputText = JSON.stringify(json);
    }

    if (!outputText) {
      return res.status(502).json({ error: 'AI returned no output' });
    }

    // The model was instructed to return pure JSON. Try to parse it.
    let parsed: AnalysisReport | null = null;
    try {
      parsed = JSON.parse(outputText) as AnalysisReport;
    } catch (e) {
      // Try to extract JSON substring
      const m = outputText.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]) as AnalysisReport;
        } catch (e2) {
          // ignore
        }
      }
    }

    if (!parsed) {
      // As a graceful fallback, return a minimal structure with the raw text in summary
      return res.status(200).json({
        summary: outputText.slice(0, 2000),
        positivePoints: [],
        negativePoints: [],
        technicalIssues: [],
        verdict: '无法解析模型输出为 JSON，请检查模型响应',
        sentimentScore: 50
      } as AnalysisReport);
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Analyze handler error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
