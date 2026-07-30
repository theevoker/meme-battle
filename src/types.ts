export interface Player {
  id: string;
  name: string;
  avatarColor: string;
  isHost: boolean;
  score: number;
  isConnected: boolean;
  lastSeen?: number;
}

export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  isCustom?: boolean;
}

export interface TextElement {
  id: string;
  text: string;
  x: number; // percentage 0-100 or canvas px
  y: number; // percentage 0-100 or canvas px
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  fontFamily: string;
  isUppercase: boolean;
  align: 'left' | 'center' | 'right';
}

export interface MemeSubmission {
  id: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  templateId: string;
  templateName: string;
  imageDataUrl: string;
  createdAt: number;
}

export interface Vote {
  voterId: string;
  submissionId: string;
  points: 200 | 0 | -200;
}

export interface GameSettings {
  totalRounds: number;
  roundDuration: number; // in seconds
  customTemplates: MemeTemplate[];
  useOnlyCustomTemplates?: boolean;
}

export type GameState = 
  | 'LOBBY' 
  | 'MEME_CREATION' 
  | 'SHOWCASE_VOTING' 
  | 'ROUND_RESULTS' 
  | 'FINAL_LEADERBOARD';

export interface Room {
  code: string;
  hostId: string;
  settings: GameSettings;
  state: GameState;
  currentRound: number;
  players: Record<string, Player>;
  submissions: Record<string, MemeSubmission>; // submissionId -> submission
  votes: Record<string, Record<string, Vote>>; // round -> submissionId:voterId -> Vote
  roundStartTime: number | null;
  currentShowcaseIndex: number;
  showcaseStartTime: number | null;
  phaseStartTime?: number | null;
  lastActivity?: number;
  roundScores: Record<number, Record<string, number>>; // round -> playerId -> pointsEarnedThisRound
  submissionOrder?: string[]; // randomized submission IDs for showcase voting phase
}

export interface AIResponseCaption {
  captions: string[];
}
