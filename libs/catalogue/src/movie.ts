export interface Cue {
  start: number;
  end: number;
  text: string;
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  genre: string;
  mood: string;
  color: string;
  director: string;
  audioLanguage: string;
  description: string;
  notes: string[];
  captions: Cue[];
  credit: string;
  source: string;
  license: string;
  excerptStart: number;
  subtitleSource?: string;
  subtitleLicense?: string;
  subtitleCredit?: string;
}

export interface Recommendation {
  movieId: string;
  reason: string;
}
