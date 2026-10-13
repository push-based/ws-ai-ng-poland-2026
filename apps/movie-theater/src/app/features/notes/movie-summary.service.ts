import { Injectable, inject } from '@angular/core';
import { Movie } from '@nano-cinema/catalogue';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { SummaryOptions } from '../../ai/ai.types';
import { SummarizerApi } from '../../ai/summarizer/summarizer.api';
@Injectable({ providedIn: 'root' })
export class MovieSummaryService {
  private readonly runtime = inject(AiRuntime);
  private readonly summarizer = inject(SummarizerApi);

  // Two demonstrations share the same native Summarizer adapter: summarize one
  // source directly, or summarize each notes section and then summarize the results.
  // The second pipeline demonstrates composition; our tiny notes do not require it
  // to fit a model limit, and each stage can lose facts.
  summarize(
    movie: Movie,
    options: SummaryOptions,
    chunked: boolean,
  ): Promise<string> {
    return this.runtime.run(
      'Summarizer',
      chunked ? 'summary of summaries' : 'summarizeStreaming()',
      async (signal) => {
        if (this.runtime.mode() === 'fixture') {
          const text =
            options.type === 'headline'
              ? `${movie.title}: an open-movie experience`
              : options.type === 'key-points'
                ? `• ${movie.description}\n• Directed by ${movie.director}, released in ${movie.year}.\n• Created with Blender and shared under ${movie.license}.`
                : movie.description +
                  (options.length === 'short'
                    ? ''
                    : ` Directed by ${movie.director}. The excerpt uses sourced dialogue subtitles when speech is present.`);
          this.runtime.setStreamed(text);
          return (
            text +
            (chunked
              ? '\n\nFixture: section summaries combined. Compare against the original notes.'
              : '')
          );
        }
        // A teaser receives only the spoiler-free synopsis. Other direct styles receive
        // all programme notes. Source selection matters: changing output style cannot
        // guarantee no spoilers if the input already contains an ending.
        if (!chunked)
          return this.summarizer.summarize(
            options.type === 'teaser'
              ? movie.description
              : movie.notes.join('\n\n'),
            options,
            signal,
          );
        // Sections are semantic boundaries; preserve the source notes so the user can check lost facts.
        const summaries: string[] = [];
        for (const [index, note] of movie.notes.entries()) {
          summaries.push(
            await this.summarizer.summarize(
              note,
              {
                type: 'key-points',
                length: 'short',
                format: 'plain-text',
                preference: options.preference,
              },
              signal,
            ),
          );
          this.runtime.trace(
            'Summarizer',
            `section ${index + 1}`,
            summaries[index],
          );
        }
        // The final model call sees section summaries, not the original notes. Compare
        // it with those notes to notice omissions or distortions introduced by either stage.
        return this.summarizer.summarize(
          summaries.join('\n\n'),
          options,
          signal,
        );
      },
    );
  }
}
