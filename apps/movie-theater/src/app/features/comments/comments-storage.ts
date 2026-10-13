import {
  COMMENT_STORAGE_KEY,
  MovieComment,
  parseComments,
} from './comments.model';
// Use the same read/write boundary with browser localStorage or an in-memory
// test implementation. The model assistance code has no access to this boundary.
export interface CommentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
/** Storage access can fail under privacy settings or quota limits. Never report a failed write as saved. */
export function readComments(storage: CommentStorage): MovieComment[] {
  return parseComments(storage.getItem(COMMENT_STORAGE_KEY));
}
export function saveComments(
  storage: CommentStorage,
  comments: readonly MovieComment[],
): void {
  storage.setItem(COMMENT_STORAGE_KEY, JSON.stringify(comments));
}
