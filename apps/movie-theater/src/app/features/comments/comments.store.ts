import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { MovieComment, createComment } from './comments.model';
import { CommentStorage, readComments, saveComments } from './comments-storage';
export const COMMENT_STORAGE = new InjectionToken<CommentStorage>(
  'Comment storage',
  {
    providedIn: 'root',
    factory: () => ({
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
    }),
  },
);
@Injectable({ providedIn: 'root' })
export class CommentsStore {
  private readonly storage = inject(COMMENT_STORAGE);
  private readonly savedComments = signal<MovieComment[]>([]);
  readonly comments = this.savedComments.asReadonly();
  readonly error = signal('');
  private loaded = false;

  constructor() {
    this.reload();
  }

  reload() {
    try {
      this.savedComments.set(readComments(this.storage));
      this.loaded = true;
      this.error.set('');
    } catch {
      this.loaded = false;
      this.error.set(
        'Saved comments could not be loaded. Your existing browser data has been left untouched.',
      );
    }
  }

  add(movieId: string, text: string): boolean {
    if (!this.loaded) return false;
    try {
      const next = [createComment(movieId, text), ...this.comments()];
      saveComments(this.storage, next);
      this.savedComments.set(next);
      this.error.set('');
      return true;
    } catch {
      this.error.set(
        'The comment could not be saved. Your draft is still here; check browser storage permissions or available space.',
      );
      return false;
    }
  }
}
