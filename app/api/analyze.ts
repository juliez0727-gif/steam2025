import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from 'next/server';

// Initialize Gemini on the server side ONLY
const initGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Server configuration error: API Key is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function POST(request: Request) {
  try {
    const { gameName, reviews } = await request.json();

    if (!gameName || !reviews || !Array.isArray(reviews)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const ai = initGenAI();

    // Prepare data for the prompt.
    const reviewsText = reviews.map((r: any) => {
      // Handle both raw steam review format and potentially sanitized format
      const hours = (r.author.playtime_forever / 60).toFixed(1);
      const date = new Date(r.timestamp_created * 1000).toLocaleDateString('zh-CN');
      const vote = r.voted_up ? "好评" : "差评";
      const content = r.review.replace(/(\r\n|\n|\r)/gm, " ").substring(0, 300); 
      return `[${date}, ${hours}小时, ${vote}] ${content}`;
    }).join("\n");

    const prompt = `
      你是一位专业的游戏数据分析师。请针对国产游戏《${gameName}》的以下Steam用户评论数据进行深度分析。
      
      数据包含：评论日期、游玩时长、好评/差评状态、评论内容。
      
      请生成一份详细的中文分析报告，必须包含以下 JSON 结构的字段：
      - summary: 整体舆情总结（200字以内）
      - positivePoints: 玩家普遍称赞的优点（数组，提取3-5点）
      - negativePoints: 玩家普遍抱怨的缺点（数组，提取3-5点）
      - technicalIssues: 提到的具体技术问题或Bug（数组，如优化差、闪退等）
      - verdict: 最终购买建议与评价（简短有力）
      - sentimentScore: 综合情感评分（0-100的整数，100为完美）

      请忽略无意义的刷屏评论。重点关注2025年后的游戏设计趋势、文化输出以及技术表现。

      评论数据如下:
      ${reviewsText}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            negativePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            technicalIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
            verdict: { type: Type.STRING },
            sentimentScore: { type: Type.INTEGER },
          }
        }
      }
    });

    if (response.text) {
      const report = JSON.parse(response.text);
      return NextResponse.json(report);
    }
    
    return NextResponse.json({ error: "No analysis generated" }, { status: 500 });

  } catch (error: any) {
    console.error("Gemini Server Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}