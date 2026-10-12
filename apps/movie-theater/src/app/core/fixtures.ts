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
    reason: `${movie.title} is our ${movie.genre.toLowerCase()} pick: ${movie.description} This is a deterministic workshop fixture.`,
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
  sintel: [
    'Podróżniczka wkracza do świata odległych miast i dzikich krajobrazów.',
    'Sintel to krótki film fantasy w reżyserii Colina Levy’ego.',
    'Przyjaźń z małym smokiem rozpoczyna znacznie większą podróż.',
    'Zwróć uwagę na kontrast między intymnymi chwilami a rozległymi krajobrazami.',
    'Stworzony w Blenderze. Otwarty film, udostępniony światu.',
  ],
  bunny: [
    'Spokojny poranek w kolorowym lesie.',
    'Poznaj łagodnego olbrzyma o wyrazistej osobowości.',
    'Komedia ruchu opowiada historię bez dialogów.',
    'Posłuchaj muzyki i atmosfery lasu.',
    'Big Buck Bunny. Otwarty film Fundacji Blender.',
  ],
  dream: [
    'Dwie postacie odkrywają dziwny mechaniczny świat.',
    'Proog i Emo inaczej widzą swoje otoczenie.',
    'Maszyny i wyobraźnia spotykają się w surrealistycznym krajobrazie.',
    'Posłuchaj szczegółów, które tworzą atmosferę.',
    'Elephants Dream. Projekt otwartego filmu Orange.',
  ],
};
export function fixtureCaptions(movie: Movie, language: string): string[] {
  if (language === 'en') return movie.captions.map((cue) => cue.text);
  if (language === 'pl') return polish[movie.id];
  throw new Error(
    'Fixture captions support English and Polish. Select native mode for other languages.',
  );
}
