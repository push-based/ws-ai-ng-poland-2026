// A short, beginner-friendly node:test reporter for `pnpm lab:check`.
// It prints one line per check and only the message of a failure, without
// stack traces. Unfinished steps (todo()) are shown as 🧩 hints.
interface TestEvent {
  type: string;
  data: {
    name: string;
    nesting: number;
    details?: { error?: { cause?: unknown; message?: string } };
  };
}

function reason(event: TestEvent): string {
  const error = event.data.details?.error;
  const cause = (error?.cause ?? error) as
    | { name?: string; message?: string; exercise?: string; step?: string }
    | undefined;
  if (cause?.name === 'TodoError')
    return `🧩 ${cause.step} still contains todo(...). Replace it with your code.`;
  return String(cause?.message ?? error?.message ?? 'failed').split('\n')[0];
}

export default async function* reporter(source: AsyncIterable<TestEvent>) {
  let passed = 0;
  let failed = 0;
  for await (const event of source) {
    if (event.data?.nesting !== 0) continue;
    if (event.type === 'test:pass') {
      passed++;
      yield `  ✔ ${event.data.name}\n`;
    } else if (event.type === 'test:fail') {
      failed++;
      yield `  ✖ ${event.data.name}\n      → ${reason(event)}\n`;
    }
  }
  yield `\n  ${passed} passed, ${failed} failed\n`;
}
