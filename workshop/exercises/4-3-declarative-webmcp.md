# Exercise 4.3: Declarative WebMCP

WebMCP puts tools inside the web page, where a browser agent calls them in the user's open tab. Turn a seat-reservation form into a tool with a few HTML attributes, validate what is submitted, and answer the agent.

- **Page:** http://127.0.0.1:4200/lab/4-3
- **You edit:** `apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.html` and `exercise.ts`
- **Check:** `pnpm lab:check 4-3`
- **Time:** ~20 min
- **Level:** core

> **Tip:** The badge in section **A** says **No WebMCP**? Enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome, or turn on **Use simulated browser AI**. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

Steps 1–3 are in `exercise.html`, Steps 4–5 in `exercise.ts`.

The form already has `novalidate`. Browser validation would block an invalid agent submit without telling the agent why, so we validate in code (Step 4).

## 1. Name the tool

Two attributes turn a `<form>` into a tool. The fields' `name` attributes become its parameters.

On the `<form>` tag, add `toolname="reserve_seats"` and a `tooldescription` of at least one full sentence that says what the tool does and returns.

Write plain attributes, not Angular bindings like `[toolname]`.

<details>
  <summary>Solution: toolname and tooldescription</summary>

```html
<!-- apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.html -->
<form
  toolname="reserve_seats"
  tooldescription="Reserve seats for one Nano Cinema screening: choose the film, the number of seats (1 to 6) and the showtime. Returns a reservation code."
```

</details>

### Try it

1. In section **B**, click **Discover tools**.
   - You see `reserve_seats` and a schema with `movieId`, `seats` and `showtime`.
   - The browser built it from your HTML.

## 2. Describe every parameter

Add a `toolparamdescription` to each of the three fields. Name the allowed values in each.

<details>
  <summary>Solution: toolparamdescription attributes</summary>

```html
<!-- apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.html -->
  <div class="lab-grid">
    <div>
      <label for="reserve-movie">Film</label>
      <select
        id="reserve-movie"
        name="movieId"
        required
        toolparamdescription="The film to watch, by catalogue id: sintel (Sintel), bunny (Big Buck Bunny) or dream (Elephants Dream)."
      >
        <option value="sintel">Sintel</option>
        <option value="bunny">Big Buck Bunny</option>
        <option value="dream">Elephants Dream</option>
      </select>
    </div>
    <div>
      <label for="reserve-seats">Seats (1–6)</label>
      <input
        id="reserve-seats"
        name="seats"
        type="number"
        min="1"
        max="6"
        value="2"
        required
        toolparamdescription="How many seats to reserve: a whole number from 1 to 6."
      />
    </div>
    <div>
      <label for="reserve-showtime">Showtime</label>
      <select
        id="reserve-showtime"
        name="showtime"
        required
        toolparamdescription="The screening start time, 24-hour clock: 18:00, 20:30 or 22:45."
      >
        <option value="18:00">18:00</option>
        <option value="20:30">20:30</option>
        <option value="22:45">22:45</option>
      </select>
    </div>
  </div>
```

</details>

### Try it

1. Click **Discover tools** again.
   - Each property now has your `description`.

## 3. Decide who presses Submit

Without `toolautosubmit`, the agent fills in the form and a person must press the button. That is the safer choice for payments and deletions. With it, the browser submits for the agent.

Add `toolautosubmit` to the `<form>` tag.

<details>
  <summary>Solution: toolautosubmit</summary>

```html
<!-- apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.html -->
<form
  toolname="reserve_seats"
  tooldescription="Reserve seats for one Nano Cinema screening: choose the film, the number of seats (1 to 6) and the showtime. Returns a reservation code."
  toolautosubmit
  novalidate
  (submit)="submitted.emit($event)"
>
```

</details>

### Try it

1. In section **C**, click **Valid request**.
   - The fields change and the form is submitted.
   - The log shows a 🧩 hint for Step 5.

## 4. Validate the submitted values

`min`, `max` and the option list are hints. Any caller can submit any value, so the code checks.

In `readReservation()` in `exercise.ts`, read `movieId`, `seats` and `showtime` from `data`. Throw an `Error` with a clear message when:

- the film is not in `movies`
- seats is not a whole number from 1 to `maxSeats` (convert with `Number()` first). The message must contain the word "seats".
- the showtime is not in `showtimes`

Otherwise return the three values.

<details>
  <summary>Hint · skeleton: <code>readReservation()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.ts
export function readReservation(data: FormData): Reservation {
  const movieId = /* the movieId field, as a string */;
  const seats = /* the seats field, as a number */;
  const showtime = /* the showtime field, as a string */;
  if (/* the film is not in movies */)
    throw new Error(/* name the film and the three ids */);
  if (/* seats is not a whole number from 1 to maxSeats */)
    throw new Error(/* name the allowed range */);
  if (/* the showtime is not in showtimes */)
    throw new Error(/* name the allowed showtimes */);
  return { movieId, seats, showtime: showtime as Showtime };
}
```

</details>

<details>
  <summary>Solution: <code>readReservation()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.ts
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
```

</details>

## 5. Answer the agent with `respondWith()`

On an agent's submit, `event.agentInvoked` is `true` and `event.respondWith(promise)` hands the agent its result.

In `handleReservationSubmit()`:

- Call `event.preventDefault()` first.
- Read the form with `new FormData(form)`, validate with `readReservation()` and store with `reservations.add()`. On success the result is `{ ok: true, reservation, message }`, with a confirmation sentence that contains the code.
- Turn an error into `{ ok: false, error }`. Do not throw it.
- Cast the event to `AgentSubmitEvent`. When `agentInvoked` is true, call `respondWith(Promise.resolve(result))`. Return the result.

<details>
  <summary>Hint · skeleton: <code>handleReservationSubmit()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.ts
export function handleReservationSubmit(
  event: SubmitEvent,
  reservations: ReservationStore,
): ReservationResult {
  /* stay on the page */

  let result: ReservationResult;
  try {
    const form = event.target as HTMLFormElement;
    const reservation = /* validate the form data and store it */;
    const title = /* the film's title */;
    result = { ok: true, reservation, message: /* a confirmation with the code */ };
  } catch (error) {
    result = { ok: false, error: /* the error's message */ };
  }

  const agentEvent = event as AgentSubmitEvent;
  /* an agent submitted? hand it the result */
  return result;
}
```

</details>

<details>
  <summary>Solution: <code>handleReservationSubmit()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.ts
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
```

</details>

### Try it

1. Click **Valid request**.
   - Section **C** shows **Agent received** with a code such as `NC-001`.
2. Click **Too many seats**.
   - The agent receives `"ok": false` and your message.
   - Native Chrome may refuse 9 seats before your code runs.
3. Press **Reserve seats** yourself.
   - The log says `submitted by a person`.

---

## Check your work

```sh
pnpm lab:check 4-3
```

All 6 checks should pass.

Stuck?

- `pnpm lab:solve 4-3` puts the solution in place and keeps your files as `*.mine`.
- `pnpm lab:reset 4-3` restores the starters.

| You see                                            | What to do                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `No tool named reserve_seats yet`                  | Put both Step 1 attributes on the `<form>` itself.                   |
| `The page called preventDefault() for you…`        | Make `event.preventDefault()` the first line of Step 5.              |
| "Waiting for a person to press Reserve seats…"     | Add `toolautosubmit` to the form (Step 3), or press the button.      |
| Agent receives `null`                              | Call `respondWith` during the submit handler, not in a `setTimeout`. |
| `Seats must be a whole number…` for a valid number | Convert first: `Number(data.get('seats'))`.                          |
| Angular error about an unknown property            | Write `toolname="…"`, not `[toolname]="…"`.                          |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: the search form in `features/discover/discover.html` uses the same attributes.

## Bonus

- Remove `toolautosubmit` and click **Valid request** again. When would you want that?
- Call the tool from DevTools with the snippet in section **D**.
