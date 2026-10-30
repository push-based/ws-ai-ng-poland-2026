// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4.3 · Declarative WebMCP — SOLUTION
// Copy into place with: pnpm lab:solve 4-3
// ─────────────────────────────────────────────────────────────────────────────
import { movies } from '@nano-cinema/catalogue';

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
  const movieId = String(data.get('movieId') ?? '');
  const seats = Number(data.get('seats'));
  const showtime = String(data.get('showtime') ?? '');
  if (!movies.some((movie) => movie.id === movieId))
    throw new Error(
      `Unknown film "${movieId}". Choose sintel, bunny or dream.`,
    );
  if (!Number.isInteger(seats) || seats < 1 || seats > maxSeats)
    throw new Error(`Seats must be a whole number from 1 to ${maxSeats}.`);
  if (!showtimes.includes(showtime as Showtime))
    throw new Error(
      `Unknown showtime "${showtime}". Choose ${showtimes.join(', ')}.`,
    );
  return { movieId, seats, showtime: showtime as Showtime };
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
  // 5a · Stay on the page: no browser navigation, our code handles the data.
  event.preventDefault();

  // 5b · Read, validate and store. An invalid value becomes a readable error.
  let result: ReservationResult;
  try {
    const form = event.target as HTMLFormElement;
    const reservation = reservations.add(readReservation(new FormData(form)));
    const title = movies.find(
      (movie) => movie.id === reservation.movieId,
    )?.title;
    result = {
      ok: true,
      reservation,
      message: `Reserved ${reservation.seats} seat(s) for ${title} at ${reservation.showtime}. Code ${reservation.code}.`,
    };
  } catch (error) {
    result = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // 5c · An agent submitted the form: hand it the result as the tool output.
  const agentEvent = event as AgentSubmitEvent;
  if (agentEvent.agentInvoked)
    agentEvent.respondWith?.(Promise.resolve(result));
  return result;
}
