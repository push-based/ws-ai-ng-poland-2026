import type { Movie } from './movie.js';
import { sintel } from './data/sintel.js';
import { bunny } from './data/bunny.js';
import { dream } from './data/dream.js';
export const movies: readonly Movie[] = [sintel, bunny, dream];
export function getMovie(id: string): Movie {
  const movie = movies.find((movie) => movie.id === id);
  if (!movie) throw new Error(`Unknown movie: ${id}`);
  return movie;
}
// This shared search is ordinary filtering, not semantic model inference.
// Spoken-language filtering uses catalogue facts: Bunny's audioLanguage is
// 'none'. A translated subtitle track does not change a movie's spoken language.
export function searchMovies(query = '', language = ''): readonly Movie[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return movies.filter(
    (movie) =>
      (!language || movie.audioLanguage === language) &&
      words.every((word) =>
        `${movie.title} ${movie.genre} ${movie.mood} ${movie.description}`
          .toLowerCase()
          .includes(word),
      ),
  );
}
