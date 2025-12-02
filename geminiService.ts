import { AnalysisReport, SteamReview } from "../types";

/**
 * Calls the secure Next.js backend API to analyze reviews.
 * The API Key is hidden on the server.
 */
export const analyzeReviewsWithGemini = async (
  gameName: string,
  reviews: SteamReview[]
): Promise<AnalysisReport> => {
  
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameName,
        reviews
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server Error: ${response.status}`);
    }

    const data = await response.json();
    return data as AnalysisReport;
    
  } catch (error) {
    console.error("Analysis Request Error:", error);
    throw new Error("AI 分析请求失败，请稍后重试。");
  }
};
