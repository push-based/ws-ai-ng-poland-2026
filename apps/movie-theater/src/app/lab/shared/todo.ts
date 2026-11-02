// Starter code calls todo() wherever a participant still has to write code.
// The lab page catches TodoError and explains which step is missing, so an
// unfinished exercise shows a friendly hint instead of a stack trace.
export class TodoError extends Error {
  constructor(
    readonly exercise: string,
    readonly step: string,
  ) {
    super(
      `Not implemented yet: exercise ${exercise}, ${step}. Follow its step in the guide workshop/exercises/${exercise}-*.md.`,
    );
    this.name = 'TodoError';
  }
}

export function todo(exercise: string, step: string): never {
  throw new TodoError(exercise, step);
}

export function isTodo(error: unknown): error is TodoError {
  return error instanceof Error && error.name === 'TodoError';
}
