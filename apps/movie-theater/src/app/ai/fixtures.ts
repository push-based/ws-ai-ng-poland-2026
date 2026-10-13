import { Movie, Recommendation, movies } from '@nano-cinema/catalogue';
// These deterministic examples let participants exercise the UI without a model.
// Keyword matching is deliberately simple and is not an AI recommendation engine.
// Fixtures are always labelled; they do not stand in for a failed native API call.
export function fixtureRecommendation(request: string): Recommendation {
  const text = request.toLowerCase();
  const movie = /fun|comedy|light|rabbit|zabaw|lustig/.test(text)
    ? movies[1]
    : /sci|surreal|mechan|dream|dziwn/.test(text)
      ? movies[2]
      : movies[0];
  return {
    movieId: movie.id,
    reason: `${movie.title} is our ${movie.genre.toLowerCase()} pick: ${movie.description} This is a deterministic demo fixture.`,
  };
}
// These confidence values are illustrative constants. Native detection obtains
// ranked predictions from LanguageDetector; this regex does not measure confidence.
export function fixtureLanguage(text: string): {
  language: string;
  confidence: number;
} {
  if (/[ąćęłńóśźż]|szukam|film po|dobry|chcę|napisy/i.test(text))
    return { language: 'pl', confidence: 0.96 };
  if (/película|quiero|busco|hola/i.test(text))
    return { language: 'es', confidence: 0.94 };
  if (/möchte|suche|deutsch|film bitte/i.test(text))
    return { language: 'de', confidence: 0.94 };
  return { language: 'en', confidence: 0.85 };
}
// One translated string per real dialogue cue, in the same order. The playback
// code reuses the original timings, including silent gaps and Bunny's empty track.
const polish: Record<string, string[]> = {
  sintel: ['Co sprowadza cię do krainy strażników?', 'Szukam kogoś…'],
  bunny: [],
  dream: [
    'Nic ci nie jest?',
    'Chyba nie. A tobie?',
    'W porządku.',
    'Wstawaj. Emo, tu nie jest bezpiecznie.',
    'Chodźmy.',
    'Co dalej?',
    'Zobaczysz!',
  ],
};
export function fixtureCaptions(movie: Movie, language: string): string[] {
  if (language === 'en') return movie.captions.map((cue) => cue.text);
  if (language === 'pl') return polish[movie.id];
  throw new Error(
    'Fixture captions support English and Polish. Select native mode for other languages.',
  );
}
