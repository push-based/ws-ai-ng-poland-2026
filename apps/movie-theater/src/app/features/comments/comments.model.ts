import { getMovie } from '@nano-cinema/catalogue';
export const COMMENT_STORAGE_KEY = 'nano-cinema.comments.v1';
export const MAX_COMMENT_LENGTH = 2000;
export interface MovieComment {
  id: string;
  movieId: string;
  text: string;
  createdAt: string;
}
/** Persisted browser data is untrusted. Reject malformed records before rendering. */
export function parseComments(json: string | null): MovieComment[] {
  if (json === null) return [];
  const data: unknown = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error('Saved comments are not a list.');
  const ids = new Set<string>();
  return data.map((item: unknown) => {
    if (!item || typeof item !== 'object')
      throw new Error('Invalid saved comment.');
    const value = item as Record<string, unknown>;
    if (
      typeof value['id'] !== 'string' ||
      !value['id'] ||
      ids.has(value['id']) ||
      typeof value['movieId'] !== 'string' ||
      typeof value['text'] !== 'string' ||
      !value['text'].trim() ||
      value['text'].length > MAX_COMMENT_LENGTH ||
      typeof value['createdAt'] !== 'string' ||
      !Number.isFinite(Date.parse(value['createdAt']))
    )
      throw new Error('Invalid saved comment.');
    getMovie(value['movieId']);
    ids.add(value['id']);
    return {
      id: value['id'],
      movieId: value['movieId'],
      text: value['text'],
      createdAt: value['createdAt'],
    };
  });
}
export function createComment(movieId: string, text: string): MovieComment {
  getMovie(movieId);
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH)
    throw new Error(
      `Write a comment between 1 and ${MAX_COMMENT_LENGTH} characters.`,
    );
  return {
    id: crypto.randomUUID(),
    movieId,
    text: trimmed,
    createdAt: new Date().toISOString(),
  };
}
