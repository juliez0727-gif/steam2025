export interface SteamGame {
  appid: number;
  name: string;
  logo: string;
  release_date?: string;
  developer?: string;
  publishers?: string[]; // Added
  total_reviews?: number; // Approximate count from search
  review_summary?: string; // e.g., "Very Positive"
  score?: number; // Internal score for verification confidence
}

export interface SteamReview {
  recommendationid: string;
  author: {
    steamid: string;
    num_games_owned: number;
    num_reviews: number;
    playtime_forever: number; // in minutes
    playtime_last_two_weeks: number;
    playtime_at_review: number; // in minutes
    last_played: number;
  };
  language: string;
  review: string;
  timestamp_created: number;
  timestamp_updated: number;
  voted_up: boolean;
  votes_up: number;
  votes_funny: number;
  weighted_vote_score: string;
  comment_count: number;
  steam_purchase: boolean;
  received_for_free: boolean;
  written_during_early_access: boolean;
}

export interface FilterCriteria {
  minPlaytimeHours: number;
  maxPlaytimeHours: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface AnalysisReport {
  summary: string;
  positivePoints: string[];
  negativePoints: string[];
  technicalIssues: string[];
  verdict: string;
  sentimentScore: number; // 0-100
}