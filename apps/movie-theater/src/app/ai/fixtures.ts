import { Movie, Recommendation, movies } from '@nano-cinema/catalogue';
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
