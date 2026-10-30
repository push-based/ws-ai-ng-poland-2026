# Exercise 4.3: Declarative WebMCP

In exercises 4.1 and 4.2 the tools lived in a separate server process that a desktop host started. WebMCP puts tools inside the web page: an agent that works in the browser calls them in the user's open tab, with the user's session and the page's live state. In this exercise we will turn a normal seat-reservation form into a WebMCP tool with a few HTML attributes, validate what is submitted, and send the result back to the agent.

**Page:** http://127.0.0.1:4200/lab/4-3 · **You edit:** `apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.html` and `exercise.ts` · **Check:** `pnpm lab:check 4-3` · **Time:** ~20 min · **Level:** core

## Goal

At the end of this exercise **Valid request** fills in and submits the form as an agent would, and section **C** shows **Agent received** with a reservation code such as `NC-001`.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/4-3 in Chrome. Look at the badge in section **A**:

- **Native WebMCP**: your Chrome exposes `document.modelContext` (the flag `chrome://flags/#enable-webmcp-testing` is on). Keep the simulation switch off.
- **No WebMCP**: enable that flag and relaunch Chrome, or turn on **Use simulated browser AI** at the top. The badge then says **Simulated WebMCP**: a small stand-in for `document.modelContext` that reads declarative forms the same way, so everything in this exercise works with it.

WebMCP is an experimental proposal. Open both exercise files: `exercise.html` is the form you see in section **A**, with `<!-- TODO Step n -->` comments for Steps 1–3. `exercise.ts` has two functions with `return todo(...)` lines for Steps 4–5.

> [!NOTE]
> The form already has `novalidate`, on purpose. The browser's built-in checks (`min`, `max`, `required`) would silently block an invalid submission, and the agent would get no explanation. We validate in code instead (Step 4) and return a readable error.

## 1. Name the tool

Two attributes on a `<form>` turn it into a tool. `toolname` is the name an agent calls, like a function name; we use `reserve_seats`. `tooldescription` says in one or two sentences what the tool does and what it returns. An agent chooses tools by reading this text, so make it specific. The fields' `name` attributes become the tool's parameters.

In `exercise.html`, add `toolname="reserve_seats"` and a `tooldescription` to the opening `<form>` tag, before `novalidate`, and delete the Step 1 TODO comment. Leave the Step 3 comment for later.

> [!TIP]
> Use plain attributes: `toolname="…"`. Angular passes them straight to the DOM, with no import and no special syntax. A binding such as `[toolname]="…"` makes Angular look for a property of that name and fail with an unknown-property error.

<details>
  <summary>toolname and tooldescription solution</summary>

```html
<!-- apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.html -->
<form
  toolname="reserve_seats"
  tooldescription="Reserve seats for one Nano Cinema screening: choose the film, the number of seats (1 to 6) and the showtime. Returns a reservation code."
```

The rest of the tag, `novalidate (submit)="submitted.emit($event)">`, stays as it is.

</details>

Save. In section **B**, click **Discover tools**. You see `reserve_seats`, your description and an input schema with three properties: `movieId`, `seats` and `showtime`. The browser built this schema from your HTML:

- each `<select>` → `"type": "string"` with an `enum` of its `<option>` values. Chrome's real schema may also add the option texts as titles.
- `<input type="number" min="1" max="6">` → `"type": "number"` with `minimum` and `maximum` (in the simulation; your Chrome version may express this differently).
- `required` fields → the schema's `required` list.

## 2. Describe every parameter

The agent also needs to know what each field means and which values are allowed. Without help, the browser falls back to the field's `<label>` ("Film", "Seats (1–6)"), and without a label to `aria-description`, which is often too short. `toolparamdescription="…"` on a field becomes that parameter's `description` in the schema. It is only for agents; people still read the label.

In `exercise.html`, add a `toolparamdescription` to each of the three fields, `<select name="movieId">`, `<input name="seats">` and `<select name="showtime">`, and delete the three Step 2 TODO comments. Name the allowed values in each description.

<details>
  <summary>toolparamdescription attributes solution</summary>

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

Save and click **Discover tools** again. Each property in the schema now has your `description`.

## 3. Decide who presses Submit

When an agent invokes a declarative tool, the browser fills in the fields. Then there are two options. Without `toolautosubmit`, the form stays filled in and a person must press **Reserve seats** while the agent waits: the safer choice for actions with consequences (payments, messages, deletions), because a human confirms. With `toolautosubmit`, the browser submits the form for the agent right away. We choose `toolautosubmit` here, so the demo runs end to end; the stretch goals try the other choice.

Add `toolautosubmit` to the `<form>` tag, before `novalidate`, and delete the Step 3 TODO comment.

<details>
  <summary>toolautosubmit solution</summary>

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

Save. In section **C**, click **Valid request** and watch the form: the fields change to _Elephants Dream_, _2_ and _20:30_, and the form is submitted. The Event log shows `handleReservationSubmit() · submitted by an agent` with a 🧩 hint, because Step 5 isn't done yet. The page also tells you that it called `preventDefault()` for you, so the browser did not reload.

## 4. Validate the submitted values

`min="1" max="6"` and the `<option>` list are hints, for people and for agents. They are not a security boundary: an agent with a mistake, a script or the DevTools console can submit any value. The code that acts on the data checks it, and throws an `Error` whose message explains what is wrong. The agent forwards that message, so the user learns what to change.

In `readReservation()` in `exercise.ts`, read `movieId`, `seats` and `showtime` from `data`. Throw an `Error` when the film is not in `movies`, when seats is not a whole number from 1 to `maxSeats`, or when the showtime is not in `showtimes`. Otherwise return the three values.

> [!TIP]
> `FormData` gives every value as a string, or `null` when the field is missing. Convert seats with `Number(data.get('seats'))` before you compare it.

<details>
  <summary>readReservation() skeleton</summary>

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
  <summary>readReservation() solution</summary>

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

| Code                      | Meaning                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `data.get('seats')`       | The value of the field with `name="seats"`, as text: `"2"`. `null` if the field is missing. |
| `Number(...)`             | `"2"` → `2`, `"two"` → `NaN`, `""` → `0`. All bad values fail the next check.               |
| `Number.isInteger(seats)` | Rejects `NaN` and half seats such as `1.5`.                                                 |
| `showtime as Showtime`    | Tells TypeScript the string is one of the three showtimes, after we checked it.             |

</details>

Save and run `pnpm lab:check 4-3` in a second terminal. The `Step 4 · readReservation() returns a valid reservation and rejects bad values` line turns ✔. The page calls this function from Step 5.

## 5. Answer the agent with `respondWith()`

People and agents both end up in the form's `submit` event. WebMCP adds two members to it: `event.agentInvoked` is `true` when an agent submitted the form, and `event.respondWith(promise)` hands the agent its tool result. A person's submit has no `respondWith`, so we call it only for agents.

In `handleReservationSubmit()`, call `event.preventDefault()` first, so the browser doesn't navigate away and lose the agent's result. Then read the form with `new FormData(form)`, validate it with `readReservation()` and store it with `reservations.add()`. Turn an error from Step 4 into `{ ok: false, error }` instead of throwing it, so that a person or an agent gets an answer either way. Finally, when `agentInvoked` is true, pass the result to `respondWith()`, and return it.

> [!WARNING]
> Call `respondWith()` during the submit handler, after `preventDefault()`. A call made later, for example in a `setTimeout`, leaves the agent with `null` as its result.

<details>
  <summary>handleReservationSubmit() skeleton</summary>

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
  <summary>handleReservationSubmit() solution</summary>

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

Why `respondWith?.(...)`? `AgentSubmitEvent`, defined in the file, marks both new members as optional, because a normal `SubmitEvent` doesn't have them. `?.` calls the method only when it exists.

</details>

Save, let the page reload, and try it:

1. In section **C**, click **Valid request**. Section **C** shows **Agent received** with `"ok": true` and a message like `Reserved 2 seat(s) for Elephants Dream at 20:30. Code NC-001.`, and the reservation appears in the table in section **A**.
2. Click **Too many seats**. The agent receives `"ok": false` and `"error": "Seats must be a whole number from 1 to 6."`, and nothing is stored. In the simulation this request always reaches your handler. Chrome may refuse 9 seats earlier, because the schema says `maximum: 6`. Either way your code is the last line of defence.
3. Press **Reserve seats** yourself. The log says `submitted by a person`, and no `respondWith()` is called.

Well done! The same form now serves people and agents.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 4-3
```

Expected result:

```
  ✔ Step 1 · the <form> is a WebMCP tool: toolname="reserve_seats" + tooldescription
  ✔ Step 2 · every field explains itself with toolparamdescription
  ✔ Step 3 · toolautosubmit lets an agent submit the form
  ✔ Step 4 · readReservation() returns a valid reservation and rejects bad values
  ✔ Step 5 · a person submits: preventDefault, store, return the result, no respondWith
  ✔ Step 5 · an agent submits: respondWith() carries the result, also for invalid input

  6 passed, 0 failed
```

The check reads `exercise.html` as text to find your attributes, and runs Steps 4–5 in Node with a fake submit event. It does not start a browser or an agent.

To call the tool from DevTools, copy the snippet in section **D** into the Console: it runs `getTools()`, then `executeTool(reserve, { movieId: 'bunny', seats: 3, showtime: '18:00' })`, both on `document.modelContext`, so it works with native WebMCP and with the simulation.

### Troubleshooting

| You see                                                   | What to do                                                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 4-3, Step N` in the log | That function still calls `todo(...)`. Replace the whole line, then save.                                       |
| `No tool named reserve_seats yet`                         | Put both Step 1 attributes on the `<form>` itself, and spell the name `reserve_seats`.                          |
| `document.modelContext is missing`                        | Turn on **Use simulated browser AI**, or enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome.    |
| `The page called preventDefault() for you…`               | Make `event.preventDefault()` the first line of Step 5, before anything that can throw.                         |
| "Waiting for a person to press Reserve seats…"            | This is the human-confirmation mode: press the button, or add `toolautosubmit` to the form (Step 3).            |
| Agent receives `null`                                     | Check `agentEvent.agentInvoked`, and call `respondWith` during the submit handler, not later in a `setTimeout`. |
| `Seats must be a whole number…` for a valid number        | Convert first: `Number(data.get('seats'))`, then compare.                                                       |
| Angular error about an unknown property                   | Write the plain attribute `toolname="…"` instead of the binding `[toolname]="…"`.                               |

Still stuck? `pnpm lab:solve 4-3` copies the reference solution into place and saves your files as `exercise.html.mine` and `exercise.ts.mine`. `pnpm lab:reset 4-3` brings back the starter files.

> [!NOTE]
> The cinema app uses the same attributes. `apps/movie-theater/src/app/features/discover/discover.html` is the catalogue search form with `toolname`, `tooldescription` and `toolparamdescription`; it performs a search, so it needs no `respondWith()`. `apps/movie-theater/src/app/core/webmcp/` holds the cinema's imperative tools (exercise 4.4), registered from JavaScript for actions that are not forms, such as the audio mixer. `declarativeForms()` in `apps/movie-theater/src/app/lab/shared/simulated-ai.ts` shows how the lab's simulation turns your form into a schema, a simplified model of what Chrome does.

## 6. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Remove `toolautosubmit` and click **Valid request** again. The agent fills in the form and waits until you press **Reserve seats**. When would you want that? (Hint: anything that costs money.)
- Style the form while an agent is using it. Chrome's documentation describes the pseudo-classes `:tool-form-active` (on the form) and `:tool-submit-active` (on the submit button). They apply only in a Chrome build with WebMCP; the simulation does not set them.
- Listen for the `toolactivated` and `toolcancel` events on `document.modelContext` (the page already logs them in native mode) and show an "An assistant is filling this form" banner.
