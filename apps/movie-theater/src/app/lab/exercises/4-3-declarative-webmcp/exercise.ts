/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4.3 · Declarative WebMCP
// Guide: workshop/exercises/4-3-declarative-webmcp.md
//
// You edit TWO files: exercise.html (Steps 1–3: the form) and THIS file
// (Steps 4–5: what happens on submit). The page at
// http://127.0.0.1:4200/lab/4-3 is ready. Replace each `todo(...)` line.
// Check your work: pnpm lab:check 4-3
// ─────────────────────────────────────────────────────────────────────────────
import { movies } from '@nano-cinema/catalogue';
import { todo } from '../../shared/todo';

/** The showtimes offered in the form's <select name="showtime">. */
export const showtimes = ['18:00', '20:30', '22:45'] as const;
export type Showtime = (typeof showtimes)[number];

/** At most this many seats per reservation (the form says max="6"). */
export const maxSeats = 6;

export interface Reservation {
  movieId: string;
  seats: number;
  showtime: Showtime;
}

export interface ConfirmedReservation extends Reservation {
  code: string;
}

/** What the submit handler returns, and what an agent receives through respondWith(). */
export type ReservationResult =
  | { ok: true; reservation: ConfirmedReservation; message: string }
  | { ok: false; error: string };

/**
 * A SubmitEvent as WebMCP delivers it: `agentInvoked` is true when an agent
 * (not a person) submitted the form, and respondWith() hands a result back to
 * that agent. Neither exists on a normal SubmitEvent, so both are optional.
 */
export interface AgentSubmitEvent extends SubmitEvent {
  readonly agentInvoked?: boolean;
  respondWith?(result: Promise<unknown>): void;
}

/** Given: a tiny in-memory list of reservations. */
export class ReservationStore {
  readonly items: ConfirmedReservation[] = [];

  constructor(
    private readonly onChange: (
      items: readonly ConfirmedReservation[],
    ) => void = () => undefined,
  ) {}

  add(reservation: Reservation): ConfirmedReservation {
    const confirmed = {
      ...reservation,
      code: `NC-${String(this.items.length + 1).padStart(3, '0')}`,
    };
    this.items.push(confirmed);
    this.onChange([...this.items]);
    return confirmed;
  }
}

/**
 * STEP 4 · Read and validate the submitted values. The form's HTML limits
 * (min, max, <option>s) are hints for people and agents, NOT validation: a
 * caller can send anything. Return a Reservation or throw an Error that says
 * what is wrong, so the agent can tell the user.
 */
export function readReservation(data: FormData): Reservation {
  // TODO Step 4: read movieId, seats and showtime from data, validate them, return them.
  return todo('4-3', 'Step 4 (readReservation)');
}

/**
 * STEP 5 · Handle the submit event (people AND agents end up here).
 * Stop the browser's own submission, read the form, store the reservation,
 * and if an agent submitted it, answer that agent with respondWith().
 */
export function handleReservationSubmit(
  event: SubmitEvent,
  reservations: ReservationStore,
): ReservationResult {
  // TODO Step 5: preventDefault, readReservation(new FormData(form)), store, respondWith for agents.
  return todo('4-3', 'Step 5 (handleReservationSubmit)');
}
