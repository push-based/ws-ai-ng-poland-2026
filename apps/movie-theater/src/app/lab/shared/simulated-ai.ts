import { movies } from '@nano-cinema/catalogue';
import {
  fixtureCaptions,
  fixtureLanguage,
  fixtureRecommendation,
} from '../../ai/fixtures';

// Simulated built-in AI for the workshop lab and for `pnpm lab:check`.
// It implements the same shapes as Chrome's LanguageModel, Summarizer, Translator,
// LanguageDetector, Writer, Rewriter and Proofreader, plus document.modelContext,
// so exercise code can run on a device without on-device models. No model runs:
// answers are deterministic text built from the input. It is never a quality signal.
// The lab shows a "SIMULATED" banner whenever these globals are installed.

export interface SimulationConfig {
  /** What availability() reports before the first create(). */
  availability: Availability;
  /** Duration of the fake model download when availability is 'downloadable'. */
  downloadMs: number;
  /** Fake Prompt context window in tokens. */
  contextWindow: number;
  /** Fake Summarizer/Writer/Rewriter input quota in tokens. */
  inputQuota: number;
  /** Delay between streamed words. */
  chunkDelayMs: number;
  /** Delay before a one-shot answer resolves. */
  latencyMs: number;
}

export const defaultSimulationConfig: SimulationConfig = {
  availability: 'downloadable',
  downloadMs: 1600,
  contextWindow: 4096,
  inputQuota: 1024,
  chunkDelayMs: 35,
  latencyMs: 250,
};

let config: SimulationConfig = { ...defaultSimulationConfig };
// After one simulated download every later availability() call reports 'available'.
let downloaded = false;

/** Roughly four characters per token, the same rule of thumb used for English text. */
export function estimateTokens(text: string): number {
  return text ? Math.max(1, Math.ceil(text.length / 4)) : 0;
}

function abortError(signal?: AbortSignal): unknown {
  return (
    signal?.reason ??
    new DOMException('The operation was aborted.', 'AbortError')
  );
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError(signal));
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError(signal));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function currentAvailability(): Availability {
  return downloaded && config.availability !== 'unavailable'
    ? 'available'
    : config.availability;
}

// create() behaves like the browser: an 'unavailable' configuration rejects, a
// 'downloadable' one reports downloadprogress events through the monitor first.
async function simulateCreate(options?: {
  signal?: AbortSignal;
  monitor?: CreateMonitorCallback;
}): Promise<void> {
  const signal = options?.signal;
  if (signal?.aborted) throw abortError(signal);
  const state = currentAvailability();
  if (state === 'unavailable')
    throw new DOMException(
      'The model is unavailable for this configuration (simulated).',
      'NotSupportedError',
    );
  const monitor = new EventTarget() as CreateMonitor;
  options?.monitor?.(monitor);
  const report = (loaded: number) =>
    monitor.dispatchEvent(
      Object.assign(new Event('downloadprogress'), { loaded, total: 1 }),
    );
  if (state === 'available') {
    report(1);
    return;
  }
  for (const loaded of [0, 0.2, 0.45, 0.7, 0.9, 1]) {
    report(loaded);
    if (loaded < 1) await wait(config.downloadMs / 5, signal);
  }
  downloaded = true;
}

function streamWords(
  text: string,
  signal?: AbortSignal,
  onDone?: () => void,
): ReadableStream<string> {
  const words = text.match(/\S+\s*/g) ?? [];
  let index = 0;
  return new ReadableStream<string>({
    async pull(controller) {
      try {
        await wait(config.chunkDelayMs, signal);
      } catch (error) {
        controller.error(error);
        return;
      }
      if (index < words.length) controller.enqueue(words[index++]);
      else {
        onDone?.();
        controller.close();
      }
    },
  });
}

// Structural message type: covers prompt() input as well as initialPrompts.
interface AnyMessage {
  role: string;
  content: string | LanguageModelMessageContent[];
}
type PromptInput = string | readonly AnyMessage[];

function contentText(content: AnyMessage['content']): string {
  if (typeof content === 'string') return content;
  return content
    .map((part) =>
      part.type === 'text' ? String(part.value) : `[${part.type}]`,
    )
    .join(' ');
}

function promptText(input: PromptInput): string {
  return typeof input === 'string'
    ? input
    : input.map((message) => contentText(message.content)).join('\n');
}

function hasImage(input: PromptInput): boolean {
  return (
    typeof input !== 'string' &&
    input.some(
      (message) =>
        typeof message.content !== 'string' &&
        message.content.some((part) => part.type === 'image'),
    )
  );
}

const movieIds = movies.map((movie) => movie.id);

// Produce a value that satisfies a JSON schema, using the latest request text
// for hints. This mimics constrained decoding: the shape is right, the content
// is only as good as a keyword match. Out-of-range numbers are passed through on
// purpose so exercises can prove that their own validation rejects them.
export function valueFromSchema(
  schema: Record<string, unknown>,
  request: string,
  key = '',
): unknown {
  const lower = request.toLowerCase();
  const values = schema['enum'] as unknown[] | undefined;
  if (Array.isArray(values)) {
    if (
      values.length &&
      values.every((value) => movieIds.includes(String(value)))
    ) {
      const byTitle = movies.find(
        (movie) =>
          values.includes(movie.id) &&
          (lower.includes(movie.id) ||
            lower.includes(movie.title.toLowerCase())),
      );
      const pick = byTitle?.id ?? fixtureRecommendation(request).movieId;
      return values.includes(pick) ? pick : values[0];
    }
    const mentioned = values
      .filter(
        (value) =>
          lower.includes(String(value).toLowerCase().replaceAll('_', ' ')) ||
          lower.includes(String(value).toLowerCase()),
      )
      .sort((a, b) => String(b).length - String(a).length);
    return mentioned[0] ?? values[0];
  }
  switch (schema['type']) {
    case 'object': {
      const properties = (schema['properties'] ?? {}) as Record<
        string,
        Record<string, unknown>
      >;
      return Object.fromEntries(
        Object.entries(properties).map(([name, child]) => [
          name,
          valueFromSchema(child, request, name),
        ]),
      );
    }
    case 'array':
      return [
        valueFromSchema(
          (schema['items'] ?? { type: 'string' }) as Record<string, unknown>,
          request,
          key,
        ),
      ];
    case 'number':
    case 'integer': {
      const found = request.match(/-?\d+(\.\d+)?/);
      if (found) return Number(found[0]);
      return typeof schema['minimum'] === 'number' ? schema['minimum'] : 0;
    }
    case 'boolean':
      return /\b(yes|true|enable|show|on|relevant|needed|required)\b/.test(
        lower,
      );
    default: {
      if (key === 'reason' || key === 'explanation') {
        const movie = getRecommended(request);
        return `${movie.title} fits this request: ${movie.description}`;
      }
      return request.trim().split(/\s+/).slice(0, 8).join(' ') || 'simulated';
    }
  }
}

function getRecommended(request: string) {
  const lower = request.toLowerCase();
  return (
    movies.find((movie) => lower.includes(movie.title.toLowerCase())) ??
    movies.find(
      (movie) => movie.id === fixtureRecommendation(request).movieId,
    ) ??
    movies[0]
  );
}

interface Turn {
  role: 'system' | 'user' | 'assistant';
  text: string;
  tokens: number;
  /** Seeded through initialPrompts (e.g. a few-shot example), not asked by the viewer. */
  initial?: boolean;
}

function promptTurns(
  input: PromptInput,
  fallbackRole: Turn['role'] = 'user',
): Turn[] {
  if (typeof input === 'string')
    return [{ role: fallbackRole, text: input, tokens: estimateTokens(input) }];
  return input.map((message) => {
    const text = contentText(message.content);
    return {
      role: message.role as Turn['role'],
      text,
      tokens: estimateTokens(text) + (hasImage([message]) ? 256 : 0),
    };
  });
}

class SimulatedLanguageModel extends EventTarget {
  private turns: Turn[] = [];
  private destroyed = false;
  readonly contextWindow = config.contextWindow;
  oncontextoverflow: ((event: Event) => void) | null = null;
  onquotaoverflow: ((event: Event) => void) | null = null;
  readonly topK = 3;
  readonly temperature = 1;

  static async availability(
    options?: LanguageModelCreateCoreOptions,
  ): Promise<Availability> {
    const wantsAudio = [...(options?.expectedInputs ?? [])].some(
      (input) => input.type === 'audio',
    );
    return wantsAudio ? 'unavailable' : currentAvailability();
  }

  static async create(
    options?: LanguageModelCreateOptions,
  ): Promise<SimulatedLanguageModel> {
    await simulateCreate(options);
    const model = new SimulatedLanguageModel();
    if (options?.initialPrompts)
      model.turns.push(
        ...promptTurns(options.initialPrompts).map((turn) => ({
          ...turn,
          initial: true,
        })),
      );
    return model;
  }

  static async params() {
    return {
      defaultTopK: 3,
      maxTopK: 8,
      defaultTemperature: 1,
      maxTemperature: 2,
    };
  }

  get contextUsage(): number {
    return this.turns.reduce((sum, turn) => sum + turn.tokens, 0);
  }
  get inputUsage(): number {
    return this.contextUsage;
  }
  get inputQuota(): number {
    return this.contextWindow;
  }

  async prompt(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions,
  ): Promise<string> {
    const answer = this.begin(input, options);
    await wait(config.latencyMs, options?.signal);
    this.remember(input, answer);
    return answer;
  }

  promptStreaming(
    input: PromptInput,
    options?: LanguageModelPromptOptions,
  ): ReadableStream<string> {
    const answer = this.begin(input, options);
    return streamWords(answer, options?.signal, () =>
      this.remember(input, answer),
    );
  }

  async append(
    input: PromptInput,
    options?: LanguageModelAppendOptions,
  ): Promise<undefined> {
    this.assertUsable(options?.signal);
    this.add(promptTurns(input));
    return undefined;
  }

  async measureContextUsage(
    input: PromptInput,
    options?: LanguageModelPromptOptions,
  ): Promise<number> {
    this.assertUsable(options?.signal);
    return promptTurns(input).reduce((sum, turn) => sum + turn.tokens, 0);
  }

  measureInputUsage(
    input: PromptInput,
    options?: LanguageModelPromptOptions,
  ): Promise<number> {
    return this.measureContextUsage(input, options);
  }

  async clone(
    options?: LanguageModelCloneOptions,
  ): Promise<SimulatedLanguageModel> {
    this.assertUsable(options?.signal);
    const copy = new SimulatedLanguageModel();
    copy.turns = this.turns.map((turn) => ({ ...turn }));
    return copy;
  }

  destroy(): undefined {
    this.destroyed = true;
    this.turns = [];
    return undefined;
  }

  private assertUsable(signal?: AbortSignal) {
    if (this.destroyed)
      throw new DOMException(
        'The session has been destroyed.',
        'InvalidStateError',
      );
    if (signal?.aborted) throw abortError(signal);
  }

  private begin(
    input: PromptInput,
    options?: LanguageModelPromptOptions,
  ): string {
    this.assertUsable(options?.signal);
    const size = promptTurns(input).reduce((sum, turn) => sum + turn.tokens, 0);
    if (size > this.contextWindow)
      throw new DOMException(
        `The input is too large: ${size} tokens for a ${this.contextWindow}-token context window (simulated).`,
        'QuotaExceededError',
      );
    return this.answer(input, options);
  }

  private remember(input: PromptInput, answer: string) {
    if (this.destroyed) return;
    this.add([
      ...promptTurns(input),
      { role: 'assistant', text: answer, tokens: estimateTokens(answer) },
    ]);
  }

  // When the window is full, the oldest non-system turns are evicted and
  // contextoverflow fires, like the browser's behavior for long conversations.
  private add(turns: Turn[]) {
    this.turns.push(...turns);
    let evicted = false;
    while (this.contextUsage > this.contextWindow) {
      const index = this.turns.findIndex((turn) => turn.role !== 'system');
      if (index < 0) break;
      this.turns.splice(index, 1);
      evicted = true;
    }
    if (evicted) {
      const event = new Event('contextoverflow');
      this.dispatchEvent(event);
      this.oncontextoverflow?.(event);
    }
  }

  private answer(
    input: PromptInput,
    options?: LanguageModelPromptOptions,
  ): string {
    const text = promptText(input);
    if (options?.responseConstraint)
      return JSON.stringify(valueFromSchema(options.responseConstraint, text));
    if (hasImage(input))
      return 'Simulated description: the frame shows a scene with a central subject, a background and lighting that sets the mood. No model looked at your image.';
    const lower = text.toLowerCase();
    if (/summar|compact|recap/.test(lower)) {
      const userTurns = this.turns.filter((turn) => turn.role === 'user');
      return userTurns.length
        ? `Summary: the viewer asked about ${userTurns.map((turn) => `"${turn.text.slice(0, 60)}"`).join(', ')}.`
        : 'Summary: nothing has been discussed yet.';
    }
    const previous = [...this.turns]
      .reverse()
      .find((turn) => turn.role === 'user' && !turn.initial);
    const grounded = this.turns.some(
      (turn) =>
        turn.role === 'system' && /catalogue|movie|film/i.test(turn.text),
    );
    const memory = previous
      ? ` Earlier you asked: "${previous.text.slice(0, 80)}".`
      : '';
    if (grounded) {
      const movie = getRecommended(text);
      return `I would suggest ${movie.title} (${movie.genre}, ${movie.year}). ${movie.description}${memory}`;
    }
    return `Simulated answer to: "${text.slice(0, 120)}".${memory} A real on-device model would write a proper reply here.`;
  }
}

function sentences(text: string): string[] {
  return (
    text
      .replace(/\s+/g, ' ')
      .match(/[^.!?]+[.!?]*/g)
      ?.map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

class SimulatedSummarizer {
  readonly inputQuota = config.inputQuota;
  readonly expectedInputLanguages?: ReadonlyArray<string>;
  readonly expectedContextLanguages?: ReadonlyArray<string>;
  readonly outputLanguage?: string;
  readonly sharedContext: string;
  readonly type: SummarizerType;
  readonly format: SummarizerFormat;
  readonly length: SummarizerLength;
  private destroyed = false;

  private constructor(options: SummarizerCreateOptions = {}) {
    this.sharedContext = options.sharedContext ?? '';
    this.type = options.type ?? 'key-points';
    this.format = options.format ?? 'markdown';
    this.length = options.length ?? 'short';
    this.outputLanguage = options.outputLanguage;
    this.expectedInputLanguages = options.expectedInputLanguages;
  }

  static async availability(
    options?: SummarizerCreateCoreOptions,
  ): Promise<Availability> {
    const languages = [
      ...(options?.expectedInputLanguages ?? []),
      options?.outputLanguage ?? 'en',
    ];
    return languages.every((language) => ['en', 'es', 'ja'].includes(language))
      ? currentAvailability()
      : 'unavailable';
  }

  static async create(
    options?: SummarizerCreateOptions,
  ): Promise<SimulatedSummarizer> {
    await simulateCreate(options);
    return new SimulatedSummarizer(options);
  }

  async measureInputUsage(input: string): Promise<number> {
    return estimateTokens(input);
  }

  async summarize(
    input: string,
    options?: SummarizerSummarizeOptions,
  ): Promise<string> {
    const result = this.produce(input, options);
    await wait(config.latencyMs, options?.signal);
    return result;
  }

  summarizeStreaming(
    input: string,
    options?: SummarizerSummarizeOptions,
  ): ReadableStream<string> {
    return streamWords(this.produce(input, options), options?.signal);
  }

  destroy() {
    this.destroyed = true;
  }

  private produce(input: string, options?: SummarizerSummarizeOptions): string {
    if (this.destroyed)
      throw new DOMException(
        'The summarizer has been destroyed.',
        'InvalidStateError',
      );
    if (options?.signal?.aborted) throw abortError(options.signal);
    const size = estimateTokens(input);
    if (size > this.inputQuota)
      throw new DOMException(
        `The input is too large: ${size} tokens for a ${this.inputQuota}-token quota (simulated).`,
        'QuotaExceededError',
      );
    const all = sentences(input);
    const count =
      { short: 1, medium: 2, long: 3 }[this.length] *
      (this.type === 'key-points' ? 3 : 1);
    switch (this.type) {
      case 'headline':
        return (all[0] ?? '')
          .split(' ')
          .slice(0, 10)
          .join(' ')
          .replace(/[.,;:]$/, '');
      case 'key-points': {
        const bullet = this.format === 'markdown' ? '- ' : '• ';
        return all
          .slice(0, count)
          .map((sentence) => bullet + sentence)
          .join('\n');
      }
      case 'teaser':
        return `${all.slice(0, count).join(' ')} …`;
      default:
        return all.slice(0, count).join(' ');
    }
  }
}

const translatable = ['en', 'pl', 'de', 'es', 'fr'];

class SimulatedTranslator {
  readonly inputQuota = config.inputQuota;
  private constructor(
    readonly sourceLanguage: string,
    readonly targetLanguage: string,
  ) {}

  static async availability(
    options: TranslatorCreateCoreOptions,
  ): Promise<Availability> {
    const { sourceLanguage, targetLanguage } = options;
    return translatable.includes(sourceLanguage) &&
      translatable.includes(targetLanguage)
      ? currentAvailability()
      : 'unavailable';
  }

  static async create(
    options: TranslatorCreateOptions,
  ): Promise<SimulatedTranslator> {
    if ((await SimulatedTranslator.availability(options)) === 'unavailable')
      throw new DOMException(
        'Unsupported language pair (simulated).',
        'NotSupportedError',
      );
    await simulateCreate(options);
    return new SimulatedTranslator(
      options.sourceLanguage,
      options.targetLanguage,
    );
  }

  async measureInputUsage(input: string): Promise<number> {
    return estimateTokens(input);
  }

  // Real dialogue cues use the same Polish fixtures as the cinema; other text is tagged.
  async translate(
    input: string,
    options?: TranslatorTranslateOptions,
  ): Promise<string> {
    await wait(config.latencyMs / 5, options?.signal);
    if (this.sourceLanguage === 'en' && this.targetLanguage === 'pl')
      for (const movie of movies) {
        const index = movie.captions.findIndex((cue) => cue.text === input);
        if (index >= 0) return fixtureCaptions(movie, 'pl')[index] ?? input;
      }
    return `[${this.targetLanguage}] ${input}`;
  }

  translateStreaming(
    input: string,
    options?: TranslatorTranslateOptions,
  ): ReadableStream<string> {
    return streamWords(`[${this.targetLanguage}] ${input}`, options?.signal);
  }

  destroy() {
    /* nothing to release */
  }
}

class SimulatedLanguageDetector {
  readonly inputQuota = config.inputQuota;
  static async availability(): Promise<Availability> {
    return currentAvailability();
  }
  static async create(
    options?: LanguageDetectorCreateOptions,
  ): Promise<SimulatedLanguageDetector> {
    await simulateCreate(options);
    return new SimulatedLanguageDetector();
  }
  async measureInputUsage(input: string): Promise<number> {
    return estimateTokens(input);
  }
  async detect(
    input: string,
    options?: LanguageDetectorDetectOptions,
  ): Promise<LanguageDetectionResult[]> {
    await wait(config.latencyMs / 5, options?.signal);
    const best = fixtureLanguage(input);
    const rest = best.language === 'en' ? 'de' : 'en';
    return [
      { detectedLanguage: best.language, confidence: best.confidence },
      {
        detectedLanguage: rest,
        confidence: Number((1 - best.confidence).toFixed(2)),
      },
    ];
  }
  destroy() {
    /* nothing to release */
  }
}

class SimulatedWriter {
  readonly inputQuota = config.inputQuota;
  constructor(readonly sharedContext = '') {}
  static async availability(): Promise<Availability> {
    return currentAvailability();
  }
  static async create(options?: WriterCreateOptions): Promise<SimulatedWriter> {
    await simulateCreate(options);
    return new SimulatedWriter(options?.sharedContext);
  }
  async measureInputUsage(input: string): Promise<number> {
    return estimateTokens(input);
  }
  private text(input: string) {
    const notes = input.trim().replace(/\s+/g, ' ');
    return `${notes.charAt(0).toUpperCase()}${notes.slice(1)}${/[.!?]$/.test(notes) ? '' : '.'} I would happily watch it again and recommend it to friends who enjoy open movies.`;
  }
  async write(input: string, options?: WriterWriteOptions): Promise<string> {
    await wait(config.latencyMs, options?.signal);
    return this.text(input);
  }
  writeStreaming(
    input: string,
    options?: WriterWriteOptions,
  ): ReadableStream<string> {
    return streamWords(this.text(input), options?.signal);
  }
  destroy() {
    /* nothing to release */
  }
}

class SimulatedRewriter {
  readonly inputQuota = config.inputQuota;
  constructor(
    readonly tone: RewriterTone = 'as-is',
    readonly sharedContext = '',
  ) {}
  static async availability(): Promise<Availability> {
    return currentAvailability();
  }
  static async create(
    options?: RewriterCreateOptions,
  ): Promise<SimulatedRewriter> {
    await simulateCreate(options);
    return new SimulatedRewriter(options?.tone, options?.sharedContext);
  }
  async measureInputUsage(input: string): Promise<number> {
    return estimateTokens(input);
  }
  private text(input: string, tone: RewriterTone) {
    if (tone === 'more-formal')
      return input
        .replace(/\bcan't\b/gi, 'cannot')
        .replace(/\bdon't\b/gi, 'do not')
        .replace(/\bit's\b/gi, 'it is')
        .replace(/\bawesome\b/gi, 'remarkable');
    if (tone === 'more-casual')
      return `Honestly? ${input.replace(/\bremarkable\b/gi, 'awesome')}`;
    return input;
  }
  async rewrite(
    input: string,
    options?: RewriterRewriteOptions,
  ): Promise<string> {
    await wait(config.latencyMs, options?.signal);
    return this.text(input, this.tone);
  }
  rewriteStreaming(
    input: string,
    options?: RewriterRewriteOptions,
  ): ReadableStream<string> {
    return streamWords(this.text(input, this.tone), options?.signal);
  }
  destroy() {
    /* nothing to release */
  }
}

const typos: Record<string, string> = {
  teh: 'the',
  realy: 'really',
  recieve: 'receive',
  alot: 'a lot',
  definately: 'definitely',
  wich: 'which',
  beautifull: 'beautiful',
  dragn: 'dragon',
};

class SimulatedProofreader {
  static async availability(): Promise<Availability> {
    return currentAvailability();
  }
  static async create(
    options?: ProofreaderCreateOptions,
  ): Promise<SimulatedProofreader> {
    await simulateCreate(options);
    return new SimulatedProofreader();
  }
  async proofread(
    input: string,
    options?: ProofreaderProofreadOptions,
  ): Promise<ProofreadResult> {
    await wait(config.latencyMs, options?.signal);
    const corrections: ProofreadCorrection[] = [];
    const correctedInput = input.replace(
      /\b[A-Za-z]+\b/g,
      (word, offset: number) => {
        const fix = typos[word.toLowerCase()];
        if (!fix) return word;
        corrections.push({
          startIndex: offset,
          endIndex: offset + word.length,
          correction: fix,
        } as ProofreadCorrection);
        return fix;
      },
    );
    return { correctedInput, corrections } as ProofreadResult;
  }
  destroy() {
    /* nothing to release */
  }
}

// ---------------------------------------------------------------------------
// WebMCP: a small stand-in for document.modelContext. It supports imperative
// registerTool/getTools/executeTool and declarative <form toolname> tools, so the
// WebMCP exercises can be tried before chrome://flags/#enable-webmcp-testing works.
// ---------------------------------------------------------------------------

export interface SimulatedTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, boolean>;
  execute: (
    args: Record<string, unknown>,
    context?: { signal: AbortSignal },
  ) => unknown;
}

interface DiscoveredDescriptor {
  name: string;
  description?: string;
  inputSchema?: string;
  annotations?: Record<string, boolean>;
}

export class SimulatedModelContext extends EventTarget {
  private readonly tools = new Map<string, SimulatedTool>();

  registerTool(tool: SimulatedTool, options?: { signal?: AbortSignal }): void {
    if (
      !tool?.name ||
      !tool.description ||
      !tool.inputSchema ||
      typeof tool.execute !== 'function'
    )
      throw new TypeError(
        'A tool needs name, description, inputSchema and execute (simulated).',
      );
    if (this.tools.has(tool.name))
      throw new DOMException(
        `A tool named "${tool.name}" is already registered.`,
        'InvalidStateError',
      );
    if (options?.signal?.aborted) return;
    this.tools.set(tool.name, tool);
    options?.signal?.addEventListener(
      'abort',
      () => this.unregisterTool(tool.name),
      { once: true },
    );
    this.dispatchEvent(new Event('toolchange'));
  }

  unregisterTool(name: string): void {
    if (this.tools.delete(name)) this.dispatchEvent(new Event('toolchange'));
  }

  async getTools(): Promise<DiscoveredDescriptor[]> {
    const imperative = [...this.tools.values()].map(
      ({ name, description, inputSchema, annotations }) => ({
        name,
        description,
        inputSchema: JSON.stringify(inputSchema),
        annotations,
      }),
    );
    const declarative = declarativeForms().map(
      ({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema: JSON.stringify(inputSchema),
      }),
    );
    return [...imperative, ...declarative].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async executeTool(
    tool: { name: string },
    args: Record<string, unknown> | string = {},
    options?: { signal?: AbortSignal },
  ): Promise<unknown> {
    const input =
      typeof args === 'string'
        ? (JSON.parse(args) as Record<string, unknown>)
        : args;
    const imperative = this.tools.get(tool.name);
    if (imperative)
      return imperative.execute(input, {
        signal: options?.signal ?? new AbortController().signal,
      });
    const form = declarativeForms().find(
      (candidate) => candidate.name === tool.name,
    );
    if (!form)
      throw new DOMException(`Unknown tool "${tool.name}".`, 'NotFoundError');
    return form.invoke(input);
  }
}

function fieldDescription(field: HTMLElement): string {
  return (
    field.getAttribute('toolparamdescription') ??
    (field.id
      ? document.querySelector(`label[for="${field.id}"]`)?.textContent?.trim()
      : undefined) ??
    field.getAttribute('aria-description') ??
    ''
  );
}

function declarativeForms() {
  if (typeof document === 'undefined') return [];
  return [
    ...document.querySelectorAll<HTMLFormElement>(
      'form[toolname][tooldescription]',
    ),
  ].map((form) => {
    const fields = [...form.elements].filter(
      (
        element,
      ): element is
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement =>
        'name' in element &&
        !!(element as HTMLInputElement).name &&
        element.tagName !== 'BUTTON',
    );
    const properties: Record<string, Record<string, unknown>> = {};
    for (const field of fields) {
      const description = fieldDescription(field);
      if (field instanceof HTMLSelectElement)
        properties[field.name] = {
          type: 'string',
          enum: [...field.options].map((option) => option.value),
          description,
        };
      else if (field instanceof HTMLInputElement && field.type === 'number')
        properties[field.name] = {
          type: 'number',
          ...(field.min ? { minimum: Number(field.min) } : {}),
          ...(field.max ? { maximum: Number(field.max) } : {}),
          description,
        };
      else properties[field.name] = { type: 'string', description };
    }
    return {
      name: form.getAttribute('toolname') ?? '',
      description: form.getAttribute('tooldescription') ?? '',
      inputSchema: {
        type: 'object',
        properties,
        required: fields
          .filter((field) => field.required)
          .map((field) => field.name),
      },
      // Fill the fields like an agent would, then submit (toolautosubmit) or wait
      // for the human to press the submit button. The SubmitEvent is marked as
      // agent-invoked and offers respondWith(), mirroring the declarative API.
      invoke: (args: Record<string, unknown>) =>
        new Promise<unknown>((resolve) => {
          for (const field of fields)
            if (field.name in args) {
              field.value = String(args[field.name]);
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
            }
          const mark = (event: Event) => {
            let responded = false;
            Object.defineProperty(event, 'agentInvoked', { value: true });
            Object.defineProperty(event, 'respondWith', {
              value: (result: Promise<unknown>) => {
                responded = true;
                void Promise.resolve(result).then(resolve, (error: unknown) =>
                  resolve({ error: String(error) }),
                );
              },
            });
            queueMicrotask(() => {
              if (!responded) resolve(null);
            });
          };
          form.addEventListener('submit', mark, { capture: true, once: true });
          if (form.hasAttribute('toolautosubmit')) form.requestSubmit();
        }),
    };
  });
}

// ---------------------------------------------------------------------------
// Install / uninstall
// ---------------------------------------------------------------------------

const aiGlobals = {
  LanguageModel: SimulatedLanguageModel,
  Summarizer: SimulatedSummarizer,
  Translator: SimulatedTranslator,
  LanguageDetector: SimulatedLanguageDetector,
  Writer: SimulatedWriter,
  Rewriter: SimulatedRewriter,
  Proofreader: SimulatedProofreader,
} as const;

let saved: Map<string, PropertyDescriptor | undefined> | undefined;
let savedModelContext: { had: boolean; value: unknown } | undefined;

/** Replace the browser AI globals with simulations. Call uninstallSimulatedAi() to restore them. */
export function installSimulatedAi(
  overrides: Partial<SimulationConfig> = {},
): void {
  config = { ...defaultSimulationConfig, ...overrides };
  downloaded = false;
  const target = globalThis as Record<string, unknown>;
  if (!saved) {
    saved = new Map();
    for (const name of Object.keys(aiGlobals))
      saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }
  for (const [name, value] of Object.entries(aiGlobals))
    Object.defineProperty(target, name, {
      value,
      configurable: true,
      writable: true,
    });
  // Never hide a real WebMCP implementation: only fill the gap when it is missing.
  if (typeof document !== 'undefined' && !savedModelContext) {
    const doc = document as Document & { modelContext?: unknown };
    savedModelContext = { had: 'modelContext' in doc, value: doc.modelContext };
    if (!doc.modelContext)
      Object.defineProperty(doc, 'modelContext', {
        value: new SimulatedModelContext(),
        configurable: true,
        writable: true,
      });
  }
}

export function uninstallSimulatedAi(): void {
  if (saved) {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete (globalThis as Record<string, unknown>)[name];
    }
    saved = undefined;
  }
  if (savedModelContext && typeof document !== 'undefined') {
    const doc = document as Document & { modelContext?: unknown };
    if (doc.modelContext instanceof SimulatedModelContext) {
      if (savedModelContext.had)
        Object.defineProperty(doc, 'modelContext', {
          value: savedModelContext.value,
          configurable: true,
          writable: true,
        });
      else delete (doc as unknown as Record<string, unknown>)['modelContext'];
    }
    savedModelContext = undefined;
  }
}

export function isSimulatedAiInstalled(): boolean {
  return saved !== undefined;
}

/** Change simulation knobs (for example a tiny context window) without reinstalling. */
export function configureSimulation(
  overrides: Partial<SimulationConfig>,
): void {
  config = { ...config, ...overrides };
}
