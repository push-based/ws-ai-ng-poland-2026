// Exercise 4.3 · Steps 1–3 are HTML: the check reads exercise.html as text and
// looks at the attributes of the <form> and its fields. Steps 4–5 run the
// submit handler in Node with a fake SubmitEvent (Node has no DOM).
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { step } from './harness';
import {
  ReservationStore,
  handleReservationSubmit,
  readReservation,
  type ReservationResult,
} from '../../apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise';

const htmlFile = fileURLToPath(
  new URL(
    '../../apps/movie-theater/src/app/lab/exercises/4-3-declarative-webmcp/exercise.html',
    import.meta.url,
  ),
);

/** The opening tag of the first element matching `pattern`, with HTML comments removed. */
function openingTag(pattern: RegExp, what: string): string {
  const html = readFileSync(htmlFile, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const tag = html.match(pattern)?.[0];
  assert.ok(tag, `exercise.html should still contain ${what}`);
  return tag;
}

function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`\\s${name}(?:\\s*=\\s*"([^"]*)")?(?=[\\s/>])`, 'i'),
  );
  return match ? (match[1] ?? '') : undefined;
}

const formTag = () => openingTag(/<form\b[^>]*>/i, 'the <form>');
const fieldTags = () => ({
  movieId: openingTag(
    /<select\b[^>]*name="movieId"[^>]*>/i,
    '<select name="movieId">',
  ),
  seats: openingTag(/<input\b[^>]*name="seats"[^>]*>/i, '<input name="seats">'),
  showtime: openingTag(
    /<select\b[^>]*name="showtime"[^>]*>/i,
    '<select name="showtime">',
  ),
});

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

/**
 * A fake SubmitEvent. Node's FormData cannot read an HTML form, so while the
 * test runs `new FormData(form)` returns the values stored on the fake form.
 */
function submitEvent(
  t: TestContext,
  values: Record<string, string>,
  agentInvoked: boolean,
) {
  const original = globalThis.FormData;
  class FakeFormData extends original {
    constructor(form?: unknown) {
      super();
      const fake = form as { values?: Record<string, string> } | undefined;
      for (const [key, value] of Object.entries(fake?.values ?? {}))
        this.append(key, value);
    }
  }
  globalThis.FormData = FakeFormData as typeof FormData;
  t.after(() => (globalThis.FormData = original));
  const record = { prevented: 0, responses: [] as Promise<unknown>[] };
  const event = {
    type: 'submit',
    target: { values },
    currentTarget: { values },
    agentInvoked,
    preventDefault: () => record.prevented++,
    respondWith: (result: Promise<unknown>) => record.responses.push(result),
  } as unknown as SubmitEvent;
  return { event, record };
}

const valid = { movieId: 'dream', seats: '2', showtime: '20:30' };

/** Step 5 catches errors into { ok: false }; a todo() from Step 4 must still show as 🧩. */
function needsStep4(result: ReservationResult) {
  if (!result.ok && /Not implemented yet/.test(result.error))
    throw new Error(
      '🧩 Step 4 (readReservation) is not implemented yet: replace the todo(...) line (Step 5 calls it).',
    );
}

test('Step 1 · the <form> is a WebMCP tool: toolname="reserve_seats" + tooldescription', () => {
  const form = formTag();
  const name = attribute(form, 'toolname');
  if (name === undefined)
    throw new Error(
      '🧩 Step 1 (exercise.html) is not done yet: add toolname="reserve_seats" to the <form>.',
    );
  assert.equal(
    name,
    'reserve_seats',
    'use exactly toolname="reserve_seats" (the page looks for this name)',
  );
  const description = attribute(form, 'tooldescription');
  assert.ok(
    description !== undefined,
    'add tooldescription="…" to the <form>: without it the browser does not expose the tool',
  );
  assert.ok(
    description.length >= 30,
    'write a tooldescription of at least one full sentence: say what the tool does',
  );
});

test('Step 2 · every field explains itself with toolparamdescription', () => {
  const fields = fieldTags();
  if (
    Object.values(fields).every(
      (tag) => attribute(tag, 'toolparamdescription') === undefined,
    )
  )
    throw new Error(
      '🧩 Step 2 (exercise.html) is not done yet: add toolparamdescription="…" to the three fields.',
    );
  for (const [name, tag] of Object.entries(fields)) {
    const description = attribute(tag, 'toolparamdescription');
    assert.ok(
      description !== undefined,
      `add toolparamdescription="…" to the field name="${name}"`,
    );
    assert.ok(
      description.length >= 10,
      `describe "${name}" in a few words, for example its allowed values`,
    );
  }
});

test('Step 3 · toolautosubmit lets an agent submit the form', () => {
  const form = formTag();
  assert.ok(
    attribute(form, 'toolname') !== undefined,
    '🧩 Step 1 (exercise.html) comes first: add toolname to the <form>.',
  );
  if (attribute(form, 'toolautosubmit') === undefined)
    throw new Error(
      '🧩 Step 3 (exercise.html) is not done yet: add the toolautosubmit attribute to the <form>.',
    );
  assert.ok(
    attribute(form, 'novalidate') !== undefined,
    'keep novalidate: your code validates (Step 4)',
  );
  assert.match(
    form,
    /\(submit\)="submitted\.emit\(\$event\)"/,
    'keep (submit)="submitted.emit($event)" on the <form>',
  );
});

test('Step 4 · readReservation() returns a valid reservation and rejects bad values', async () => {
  const reservation = await step('Step 4 (readReservation)', () =>
    readReservation(formData(valid)),
  );
  assert.deepEqual(
    reservation,
    { movieId: 'dream', seats: 2, showtime: '20:30' },
    'return { movieId, seats: Number(...), showtime }',
  );
  assert.throws(
    () => readReservation(formData({ ...valid, seats: '9' })),
    Error,
    'reject more than 6 seats',
  );
  assert.throws(
    () => readReservation(formData({ ...valid, seats: '0' })),
    Error,
    'reject 0 seats',
  );
  assert.throws(
    () => readReservation(formData({ ...valid, seats: '1.5' })),
    Error,
    'reject half seats: use Number.isInteger',
  );
  assert.throws(
    () => readReservation(formData({ ...valid, seats: 'two' })),
    Error,
    'reject seats that are not a number',
  );
  assert.throws(
    () => readReservation(formData({ ...valid, movieId: 'titanic' })),
    Error,
    'reject a film that is not in the catalogue',
  );
  assert.throws(
    () => readReservation(formData({ ...valid, showtime: '03:00' })),
    Error,
    'reject a showtime that is not offered',
  );
  assert.throws(
    () => readReservation(formData({ seats: '2', showtime: '20:30' })),
    Error,
    'reject a missing movieId',
  );
});

test('Step 5 · a person submits: preventDefault, store, return the result, no respondWith', async (t) => {
  const store = new ReservationStore();
  const { event, record } = submitEvent(t, valid, false);
  const result = await step('Step 5 (handleReservationSubmit)', () =>
    handleReservationSubmit(event, store),
  );
  needsStep4(result);
  assert.equal(
    record.prevented,
    1,
    'call event.preventDefault() first, so the browser does not navigate',
  );
  assert.equal(result.ok, true, 'a valid form returns { ok: true, … }');
  assert.equal(
    store.items.length,
    1,
    'store the reservation with reservations.add(...)',
  );
  assert.ok(
    result.ok && result.reservation.code,
    'return the stored reservation (it has a code)',
  );
  assert.equal(
    record.responses.length,
    0,
    'only call respondWith() when event.agentInvoked is true',
  );
});

test('Step 5 · an agent submits: respondWith() carries the result, also for invalid input', async (t) => {
  const store = new ReservationStore();
  const agent = submitEvent(t, valid, true);
  const result = await step('Step 5 (handleReservationSubmit)', () =>
    handleReservationSubmit(agent.event, store),
  );
  needsStep4(result);
  assert.equal(
    agent.record.responses.length,
    1,
    'call event.respondWith(...) once when event.agentInvoked is true',
  );
  assert.deepEqual(
    await agent.record.responses[0],
    result,
    'respondWith(Promise.resolve(result)): the agent receives the same result',
  );
  const invalid = submitEvent(t, { ...valid, seats: '9' }, true);
  const rejected = handleReservationSubmit(
    invalid.event,
    store,
  ) as ReservationResult;
  assert.equal(
    invalid.record.prevented,
    1,
    'call preventDefault() for invalid input too',
  );
  assert.equal(
    rejected.ok,
    false,
    'invalid seats return { ok: false, error } instead of throwing',
  );
  assert.ok(
    !rejected.ok && /seat/i.test(rejected.error),
    'pass the readReservation() error message to the agent; the seats error should mention "seats"',
  );
  assert.deepEqual(
    await invalid.record.responses[0],
    rejected,
    'answer the agent for invalid input too, so it can tell the user',
  );
  assert.equal(
    store.items.length,
    1,
    'an invalid reservation must not be stored',
  );
});
