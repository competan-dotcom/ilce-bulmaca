
export interface Question {
  district: string;
  province: string;
  wrong_answers: string[];
  options: string[]; // Pre-shuffled list containing province + wrong_answers
  imageBase64?: string; // Base64 encoded image string
  mapShapeIndex: number; // Index for the random abstract map shape
}

export interface UserStats {
  totalGames: number;
  totalScore: number; // Legacy total (kept for compatibility, logic moves to cumulative)
  cumulativeScore: number; // All time total score
  dailyScore: number; // Sum of scores for the current day
  dailyGamesPlayed: number; // Games played today (0, 1, 2)
  lastPlayedDate: string; // YYYY-MM-DD string
  maxScore: number;
  totalCorrect: number;
  totalWrong: number;
  bestStreak: number;
}

export interface GameResult {
  timestamp: number;
  score: number;
  correct: number;
  wrong: number;
}

export interface HighScore {
  score: number;
  date: number;
  name: string;
  correct: number;
}

export interface User {
  email: string;
  name: string;
  isAdmin: boolean;
  playHistory: number[]; // Timestamps of when games were started
  stats: UserStats;
  gameHistory: GameResult[]; // Detailed history of finished games
}

export enum GameState {
  START = 'START',
  LOBBY = 'LOBBY',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER', // Round result
  SESSION_OVER = 'SESSION_OVER', // 100s timer finished
  STATS = 'STATS', // Statistics Screen
  ERROR = 'ERROR'
}
