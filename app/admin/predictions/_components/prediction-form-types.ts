export type Team = {
  id: string;
  name: string;
  logoUrl?: string;
  shortName?: string;
  league?: string;
  country?: string;
  externalId?: string;
  sport?: string;
  metadata?: Record<string, unknown>;
};

export type Tip = {
  id: string;
  title: string;
  content: string;
  summary?: string;
  odds?: number;
  oddsSource: string;
  sport: string;
  league?: string;
  matchDate?: string;
  homeTeam?: Team;
  awayTeam?: Team;
  predictionType?: string;
  predictedOutcome?: string;
  confidenceLevel?: number;
  ticketSnapshots: string[];
  isVIP: boolean;
  category: "tip" | "update";
  featured: boolean;
  status: string;
  result?: string;
  matchResult?: string;
  createdAt: string;
  publishAt: string;
  tags: string[];
};

export type PredictionFormValues = {
  title: string;
  content: string;
  summary: string;
  odds: string;
  oddsSource: "manual" | "api_auto";
  sport: string;
  league: string;
  matchDate: string;
  homeTeamId: string;
  awayTeamId: string;
  predictionType: string;
  predictedOutcome: string;
  ticketSnapshots: string[];
  isVIP: boolean;
  category: "tip" | "update";
  featured: boolean;
  status: "draft" | "scheduled" | "published" | "archived";
  publishAt: string;
  tags: string;
  confidenceLevel: string;
  result: "won" | "lost" | "void" | "pending";
  matchResult: string;
};

export type PredictionFormPayload = Record<string, unknown>;
