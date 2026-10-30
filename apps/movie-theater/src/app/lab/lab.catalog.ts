import type { Type } from '@angular/core';

// One entry per workshop exercise. The id is used in the URL (/lab/2-1), in
// `pnpm lab:check 2-1`, and in the guide workshop/exercises/2-1-sessions.md.
export interface LabExercise {
  id: string;
  block: 1 | 2 | 3 | 4;
  /** Agenda sub-block this exercise belongs to. */
  topic: string;
  title: string;
  /** The exercise guide, relative to the repository root. */
  guide: string;
  summary: string;
  api: string;
  minutes: number;
  optional?: boolean;
  /** Files the participant edits, relative to the repository root. */
  files: string[];
  /** Terminal exercises list their commands instead of loading a page. */
  commands?: string[];
  load?: () => Promise<Type<unknown>>;
}

export const labBlocks: Record<LabExercise['block'], string> = {
  1: 'The AI-native browser',
  2: 'Prompt API',
  3: 'Task-specific browser AI APIs',
  4: 'Model Context Protocol and WebMCP',
};

const dir = 'apps/movie-theater/src/app/lab/exercises';

export const labExercises: LabExercise[] = [
  {
    id: '1-1',
    block: 1,
    topic: 'From cloud AI to browser AI',
    title: 'Local, cloud or hybrid from measured cost',
    guide: 'workshop/exercises/1-1-cloud-vs-local.md',
    summary:
      'Measure the tokens and latency of a local prompt, estimate what the same traffic would cost in the cloud, and decide between local, cloud and hybrid.',
    api: 'LanguageModel.measureContextUsage()',
    minutes: 20,
    files: [`${dir}/1-1-cloud-vs-local/exercise.ts`],
    load: () =>
      import('./exercises/1-1-cloud-vs-local/page').then(
        (m) => m.LabCloudVsLocal,
      ),
  },
  {
    id: '1-2',
    block: 1,
    topic: 'Browser built-in AI',
    title: 'Feature and capability detection',
    guide: 'workshop/exercises/1-2-feature-detection.md',
    summary:
      'Detect which built-in AI APIs exist and ask each one, with exact options, whether this device can run it.',
    api: 'availability()',
    minutes: 15,
    files: [`${dir}/1-2-feature-detection/exercise.ts`],
    load: () =>
      import('./exercises/1-2-feature-detection/page').then(
        (m) => m.LabFeatureDetection,
      ),
  },
  {
    id: '1-3',
    block: 1,
    topic: 'Browser built-in AI',
    title: 'Downloading and initializing a model',
    guide: 'workshop/exercises/1-3-model-download.md',
    summary:
      'Create a Prompt session from a click, show download progress, support Cancel and release the model afterwards.',
    api: 'LanguageModel.create({ monitor, signal })',
    minutes: 15,
    files: [`${dir}/1-3-model-download/exercise.ts`],
    load: () =>
      import('./exercises/1-3-model-download/page').then(
        (m) => m.LabModelDownload,
      ),
  },
  {
    id: '1-4',
    block: 1,
    topic: 'Browser built-in AI',
    title: 'Progressive enhancement',
    guide: 'workshop/exercises/1-4-progressive-enhancement.md',
    summary:
      'Offer an AI summary when the device supports it, and a plain non-AI excerpt when it does not. The feature never breaks.',
    api: 'Summarizer + fallback',
    minutes: 15,
    files: [`${dir}/1-4-progressive-enhancement/exercise.ts`],
    load: () =>
      import('./exercises/1-4-progressive-enhancement/page').then(
        (m) => m.LabProgressiveEnhancement,
      ),
  },
  {
    id: '2-1',
    block: 2,
    topic: 'Sessions, system and initial prompts',
    title: 'Sessions and system prompts',
    guide: 'workshop/exercises/2-1-sessions.md',
    summary:
      'Create a session grounded with the movie catalogue through a system prompt and a few-shot example, ask follow-ups, then destroy it.',
    api: 'LanguageModel.create({ initialPrompts }) · prompt()',
    minutes: 20,
    files: [`${dir}/2-1-sessions/exercise.ts`],
    load: () =>
      import('./exercises/2-1-sessions/page').then((m) => m.LabSessions),
  },
  {
    id: '2-2',
    block: 2,
    topic: 'Streaming responses',
    title: 'Streaming responses',
    guide: 'workshop/exercises/2-2-streaming.md',
    summary:
      'Read promptStreaming() chunk by chunk, show text as it arrives, and cancel cleanly with an AbortController.',
    api: 'promptStreaming() · AbortSignal',
    minutes: 15,
    files: [`${dir}/2-2-streaming/exercise.ts`],
    load: () =>
      import('./exercises/2-2-streaming/page').then((m) => m.LabStreaming),
  },
  {
    id: '2-3',
    block: 2,
    topic: 'Generating structured output',
    title: 'Structured output',
    guide: 'workshop/exercises/2-3-structured-output.md',
    summary:
      'Constrain the answer with a JSON schema whose movie IDs come from the catalogue, then validate it before the app acts on it.',
    api: 'prompt({ responseConstraint })',
    minutes: 15,
    files: [`${dir}/2-3-structured-output/exercise.ts`],
    load: () =>
      import('./exercises/2-3-structured-output/page').then(
        (m) => m.LabStructuredOutput,
      ),
  },
  {
    id: '2-4',
    block: 2,
    topic: 'Managing context windows',
    title: 'Managing the context window',
    guide: 'workshop/exercises/2-4-context-window.md',
    summary:
      'Show context usage, measure a message before sending it, fork a conversation with clone() and compact a long one.',
    api: 'contextUsage · measureContextUsage() · clone()',
    minutes: 20,
    files: [`${dir}/2-4-context-window/exercise.ts`],
    load: () =>
      import('./exercises/2-4-context-window/page').then(
        (m) => m.LabContextWindow,
      ),
  },
  {
    id: '2-5',
    block: 2,
    topic: 'Exploring multimodal possibilities',
    title: 'Multimodal prompts with text and images',
    guide: 'workshop/exercises/2-5-multimodal.md',
    summary:
      'Declare image input, send a captured video frame or your own picture to the local model and compare the answer with the image.',
    api: "expectedInputs: [{ type: 'image' }]",
    minutes: 15,
    files: [`${dir}/2-5-multimodal/exercise.ts`],
    load: () =>
      import('./exercises/2-5-multimodal/page').then((m) => m.LabMultimodal),
  },
  {
    id: '3-1',
    block: 3,
    topic: 'Summarizer API',
    title: 'The Summarizer API',
    guide: 'workshop/exercises/3-1-summarizer.md',
    summary:
      'Configure type, format, length and shared context, check availability with the same options, summarize and clean up.',
    api: 'Summarizer.create() · summarize()',
    minutes: 15,
    files: [`${dir}/3-1-summarizer/exercise.ts`],
    load: () =>
      import('./exercises/3-1-summarizer/page').then((m) => m.LabSummarizer),
  },
  {
    id: '3-2',
    block: 3,
    topic: 'Summarizer API',
    title: 'Streaming summaries',
    guide: 'workshop/exercises/3-2-streaming-summaries.md',
    summary:
      'Stream a summary into the page and compare time-to-first-text with the one-shot call.',
    api: 'summarizeStreaming()',
    minutes: 10,
    files: [`${dir}/3-2-streaming-summaries/exercise.ts`],
    load: () =>
      import('./exercises/3-2-streaming-summaries/page').then(
        (m) => m.LabStreamingSummaries,
      ),
  },
  {
    id: '3-3',
    block: 3,
    topic: 'Summarizer API',
    title: 'Summarizing documents larger than the context',
    guide: 'workshop/exercises/3-3-large-documents.md',
    summary:
      'Measure input against the quota, split a long document into chunks, summarize each and combine the results.',
    api: 'measureInputUsage() · inputQuota',
    minutes: 20,
    files: [`${dir}/3-3-large-documents/exercise.ts`],
    load: () =>
      import('./exercises/3-3-large-documents/page').then(
        (m) => m.LabLargeDocuments,
      ),
  },
  {
    id: '3-4',
    block: 3,
    topic: 'Bonus: more task APIs',
    title: 'Translating subtitles',
    guide: 'workshop/exercises/3-4-translation.md',
    summary:
      'Detect the language of a request and translate real dialogue cues while keeping their timing.',
    api: 'LanguageDetector · Translator',
    minutes: 20,
    optional: true,
    files: [`${dir}/3-4-translation/exercise.ts`],
    load: () =>
      import('./exercises/3-4-translation/page').then((m) => m.LabTranslation),
  },
  {
    id: '3-5',
    block: 3,
    topic: 'Bonus: more task APIs',
    title: 'Writing assistance with human review',
    guide: 'workshop/exercises/3-5-writing-assistance.md',
    summary:
      'Draft, rewrite and proofread a movie comment with Writer, Rewriter and Proofreader, keeping the human in control.',
    api: 'Writer · Rewriter · Proofreader',
    minutes: 20,
    optional: true,
    files: [`${dir}/3-5-writing-assistance/exercise.ts`],
    load: () =>
      import('./exercises/3-5-writing-assistance/page').then(
        (m) => m.LabWritingAssistance,
      ),
  },
  {
    id: '4-1',
    block: 4,
    topic: 'Model Context Protocol (MCP)',
    title: 'Exposing catalogue data from an MCP server',
    guide: 'workshop/exercises/4-1-cinema-mcp-server.md',
    summary:
      'Add a get_movie tool and a captions resource template to the TypeScript MCP server, then call them from a client.',
    api: 'McpServer.registerTool() · ResourceTemplate',
    minutes: 20,
    files: [
      'apps/cinema-mcp/src/tools/get-movie.ts',
      'apps/cinema-mcp/src/resources/movie-captions.ts',
    ],
    commands: [
      'pnpm nx build cinema-mcp',
      'pnpm lab:check 4-1',
      'npx @modelcontextprotocol/inspector node apps/cinema-mcp/dist/main.js',
    ],
  },
  {
    id: '4-2',
    block: 4,
    topic: 'Model Context Protocol (MCP)',
    title: 'Writing an MCP client',
    guide: 'workshop/exercises/4-2-mcp-client.md',
    summary:
      'Connect to the server over stdio, list its tools, resources and prompts, and call each one, then plug the server into a real MCP host.',
    api: 'Client · StdioClientTransport',
    minutes: 15,
    files: ['tools/lab/mcp-client.ts'],
    commands: [
      'pnpm nx build cinema-mcp',
      'pnpm lab:mcp-client',
      'pnpm lab:check 4-2',
    ],
  },
  {
    id: '4-3',
    block: 4,
    topic: 'WebMCP',
    title: 'Declarative WebMCP',
    guide: 'workshop/exercises/4-3-declarative-webmcp.md',
    summary:
      'Turn a normal seat-reservation form into a WebMCP tool with HTML attributes, and answer agent submissions with respondWith().',
    api: 'toolname · tooldescription · toolparamdescription',
    minutes: 20,
    files: [
      `${dir}/4-3-declarative-webmcp/exercise.html`,
      `${dir}/4-3-declarative-webmcp/exercise.ts`,
    ],
    load: () =>
      import('./exercises/4-3-declarative-webmcp/page').then(
        (m) => m.LabDeclarativeWebmcp,
      ),
  },
  {
    id: '4-4',
    block: 4,
    topic: 'WebMCP',
    title: 'Imperative WebMCP',
    guide: 'workshop/exercises/4-4-imperative-webmcp.md',
    summary:
      'Register JavaScript tools with input schemas, validate every argument in the handler, and unregister them on navigation.',
    api: 'document.modelContext.registerTool()',
    minutes: 25,
    files: [`${dir}/4-4-imperative-webmcp/exercise.ts`],
    load: () =>
      import('./exercises/4-4-imperative-webmcp/page').then(
        (m) => m.LabImperativeWebmcp,
      ),
  },
  {
    id: '4-5',
    block: 4,
    topic: 'WebMCP',
    title: 'A local agent at zero token cost',
    guide: 'workshop/exercises/4-5-local-agent.md',
    summary:
      'Let the on-device Prompt API pick a WebMCP tool and extract its arguments with structured output, then execute it once.',
    api: 'Prompt API + getTools() / executeTool()',
    minutes: 25,
    optional: true,
    files: [`${dir}/4-5-local-agent/exercise.ts`],
    load: () =>
      import('./exercises/4-5-local-agent/page').then((m) => m.LabLocalAgent),
  },
];

export function findExercise(id: string): LabExercise | undefined {
  return labExercises.find((exercise) => exercise.id === id);
}
