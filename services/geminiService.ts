import { AnalysisReport, SteamReview } from '../types';

export const analyzeReviewsWithGemini = async (
  gameName: string,
  reviews: SteamReview[]
): Promise<AnalysisReport> => {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameName, reviews })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Server analysis error');
  }

  return res.json();
};
