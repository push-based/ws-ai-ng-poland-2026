// A cue separates content from timing: start/end are seconds in the edited
// 30-second clip, and only text is translated. There need not be a cue in
// every second; a silent scene has no invented transcript.
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

// Machine-readable selection returned by Prompt, after domain validation.
// The real catalogue ID is for navigation; the reason is human-readable model
// output and remains something the viewer should evaluate.
export interface Recommendation {
  movieId: string;
  reason: string;
}
