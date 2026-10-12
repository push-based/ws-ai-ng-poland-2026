import { Injectable, inject } from '@angular/core';
import { Movie } from '@nano-cinema/catalogue';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { SummaryOptions } from '../../ai/ai.types';
import { SummarizerApi } from '../../ai/summarizer/summarizer.api';
@Injectable({ providedIn: 'root' })
export class MovieSummaryService {
  private readonly runtime = inject(AiRuntime);
  private readonly summarizer = inject(SummarizerApi);

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
        return this.summarizer.summarize(
          summaries.join('\n\n'),
          options,
          signal,
        );
      },
    );
  }
}
