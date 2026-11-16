# Exercises

All exercises of the **AI at Zero Token Cost** workshop, in agenda order. Each one has:

- a ready-made page at `http://127.0.0.1:4200/lab/<id>`,
- **one participant file** (two for 4.1 and 4.3) with `todo()` steps,
- a short guide in `workshop/exercises/`, with every step's skeleton and solution behind collapsible reveals,
- the finished code in `workshop/solutions/<id>/`,
- an automatic check: `pnpm lab:check <id>`.

New here? Read [README.md](README.md) first: it covers setup, how the lab works and the helper commands.

## Overview

| #   | Exercise                                                                          | Sub-block                            | Time    | Level |
| --- | --------------------------------------------------------------------------------- | ------------------------------------ | ------- | ----- |
| 1.1 | [Local, cloud or hybrid from measured cost](exercises/1-1-cloud-vs-local.md)      | From cloud AI to browser AI          | ~20 min | core  |
| 1.2 | [Feature and capability detection](exercises/1-2-feature-detection.md)            | Browser built-in AI                  | ~15 min | core  |
| 1.3 | [Downloading and initializing a model](exercises/1-3-model-download.md)           | Browser built-in AI                  | ~15 min | core  |
| 1.4 | [Progressive enhancement](exercises/1-4-progressive-enhancement.md)               | Browser built-in AI                  | ~15 min | core  |
| 2.1 | [Sessions and system prompts](exercises/2-1-sessions.md)                          | Sessions, system and initial prompts | ~20 min | core  |
| 2.2 | [Streaming responses](exercises/2-2-streaming.md)                                 | Streaming responses                  | ~15 min | core  |
| 2.3 | [Structured output](exercises/2-3-structured-output.md)                           | Generating structured output         | ~15 min | core  |
| 2.4 | [Managing the context window](exercises/2-4-context-window.md)                    | Managing context windows             | ~20 min | core  |
| 2.5 | [Multimodal prompts with text and images](exercises/2-5-multimodal.md)            | Exploring multimodal possibilities   | ~15 min | core  |
| 3.1 | [The Summarizer API](exercises/3-1-summarizer.md)                                 | Summarizer API                       | ~15 min | core  |
| 3.2 | [Streaming summaries](exercises/3-2-streaming-summaries.md)                       | Summarizer API                       | ~10 min | core  |
| 3.3 | [Summarizing documents larger than the context](exercises/3-3-large-documents.md) | Summarizer API                       | ~20 min | core  |
| 3.4 | [Translating subtitles](exercises/3-4-translation.md)                             | Bonus: more task APIs                | ~20 min | bonus |
| 3.5 | [Writing assistance with human review](exercises/3-5-writing-assistance.md)       | Bonus: more task APIs                | ~20 min | bonus |
| 4.1 | [Exposing catalogue data from an MCP server](exercises/4-1-cinema-mcp-server.md)  | Model Context Protocol (MCP)         | ~20 min | core  |
| 4.2 | [Writing an MCP client](exercises/4-2-mcp-client.md)                              | Model Context Protocol (MCP)         | ~15 min | core  |
| 4.3 | [Declarative WebMCP](exercises/4-3-declarative-webmcp.md)                         | WebMCP                               | ~20 min | core  |
| 4.4 | [Imperative WebMCP](exercises/4-4-imperative-webmcp.md)                           | WebMCP                               | ~25 min | core  |
| 4.5 | [A local agent at zero token cost](exercises/4-5-local-agent.md)                  | WebMCP                               | ~25 min | bonus |

Times are estimates for the hands-on part only. Block 2's five core exercises (~85 min) are longer than its slot, so 2.4 or 2.5 may be shown as a live demo for you to finish after the workshop. Bonus exercises are for fast finishers or for after the workshop. Exercise 4.5 builds on your 4.4 tools: finish 4.4 first, or run `pnpm lab:solve 4-4`.

---

## Block 1 · The AI-native browser

_10:15–11:20._ From cloud AI to browser AI, then the browser's built-in models: capabilities, detection, download and progressive enhancement.

| #   | Agenda topic                                                                                      |
| --- | ------------------------------------------------------------------------------------------------- |
| 1.1 | Tokens, context windows, latency and API costs; local-first, cloud-first and hybrid architectures |
| 1.2 | Models, capabilities and feature detection; capability detection                                  |
| 1.3 | Downloading and initializing browser models                                                       |
| 1.4 | Capability detection and progressive enhancement                                                  |

## Block 2 · Prompt API

_11:35–12:50._ The browser's built-in language model: sessions, prompts, streaming, structured output, context windows and multimodal input.

| #   | Agenda topic                                               |
| --- | ---------------------------------------------------------- |
| 2.1 | Creating and managing sessions; system and initial prompts |
| 2.2 | Streaming responses                                        |
| 2.3 | Generating structured output                               |
| 2.4 | Managing context windows                                   |
| 2.5 | Exploring multimodal possibilities                         |

## Block 3 · Task-specific browser AI APIs

_13:35–14:35._ Why a specialized API can beat generic prompting, with the Summarizer as the main example. Bonus: Language Detector, Translator, Writer, Rewriter and Proofreader.

| #   | Agenda topic                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Why specialized APIs can be preferable to generic prompting; summarizing application content; types, formats, lengths |
| 3.2 | Streaming summaries                                                                                                   |
| 3.3 | Summarizing large documents with small context windows                                                                |
| 3.4 | Bonus: Language Detector and Translator                                                                               |
| 3.5 | Bonus: Writer, Rewriter and Proofreader                                                                               |

## Block 4 · Model Context Protocol and WebMCP

_14:50–16:40._ Why agents need tools and not only prompts, MCP servers and clients, then WebMCP: tools that live inside the web page.

| #   | Agenda topic                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Why agents need tools and not just prompts; resources, tools and structured interfaces; MCP clients and servers       |
| 4.2 | MCP clients and servers; connecting applications and developer tooling to agents; where MCP fits in web architectures |
| 4.3 | WebMCP in web apps; how it differs from traditional MCP; declarative WebMCP with HTML forms                           |
| 4.4 | Exposing application functionality to browser agents; imperative WebMCP with JavaScript                               |
| 4.5 | Bonus: a browser agent on the on-device model (with the Prompt API from Block 2)                                      |
