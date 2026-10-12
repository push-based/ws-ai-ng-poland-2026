import {
  Component,
  inject,
  viewChild,
  ElementRef,
  afterNextRender,
  DestroyRef,
  signal,
} from '@angular/core';
import {
  LucideAudioLines,
  LucideRadio,
  LucideTerminal,
  LucideRotateCcw,
} from '@lucide/angular';
import { AudioMix, audioPresets } from '@nano-cinema/catalogue';
import { boothCommand, BoothExample } from './booth.examples';
import { CinemaService } from '../../core/cinema.service';
import { WebmcpService } from '../../core/webmcp/webmcp.service';
@Component({
  selector: 'app-cinema-booth',
  imports: [LucideAudioLines, LucideRadio, LucideTerminal, LucideRotateCcw],
  templateUrl: './booth.html',
  styleUrl: './booth.css',
})
export class Booth {
  readonly cinema = inject(CinemaService);
  readonly tools = inject(WebmcpService);
  readonly feedback = signal('');
  readonly native = signal(false);
  readonly spectrum =
    viewChild.required<ElementRef<HTMLCanvasElement>>('spectrum');
  readonly bands: {
    key: 'bass' | 'mid' | 'treble';
    label: string;
    frequency: string;
  }[] = [
    { key: 'bass', label: 'BASS', frequency: '180 HZ · LOW SHELF' },
    { key: 'mid', label: 'MID', frequency: '1.4 KHZ · PEAK' },
    { key: 'treble', label: 'TREBLE', frequency: '4.2 KHZ · HIGH SHELF' },
  ];
  readonly presets: { key: keyof typeof audioPresets; label: string }[] = [
    { key: 'flat', label: 'Flat' },
    { key: 'dialogue', label: 'Dialogue' },
    { key: 'cinema', label: 'Cinema' },
    { key: 'night', label: 'Night' },
  ];
  private frame = 0;

  constructor() {
    afterNextRender(() => this.draw());
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }

  volume() {
    return Math.round(this.cinema.audio.mix().volume * 100);
  }

  mix(key: keyof AudioMix, event: Event) {
    this.cinema.audio.apply({
      ...this.cinema.audio.mix(),
      [key]: Number((event.target as HTMLInputElement).value),
    });
  }

  async example(kind: BoothExample) {
    try {
      const command = boothCommand(kind);
      if (this.native())
        await this.tools.invokeNative(command.name, command.args);
      else await this.tools.invoke(command.name, command.args);
      this.feedback.set(
        kind === 'state'
          ? 'Screening state read. See the tool log.'
          : 'Applied to the audio graph. See the controls and tool log.',
      );
    } catch (error) {
      this.feedback.set(error instanceof Error ? error.message : String(error));
    }
  }

  private draw() {
    const canvas = this.spectrum().nativeElement;
    const context = canvas.getContext('2d');
    if (context && canvas.offsetParent !== null && !document.hidden) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const data = this.cinema.audio.spectrum();
      const count = 64;
      const gap = 4;
      const width = (canvas.width - gap * (count - 1)) / count;
      for (let i = 0; i < count; i++) {
        const value = data[i * 2] / 255;
        const height = Math.max(2, value * 130);
        context.fillStyle = value > 0.6 ? '#f5cf80' : '#b28b48';
        context.globalAlpha = value > 0 ? 0.65 + value * 0.35 : 0.2;
        context.fillRect(
          i * (width + gap),
          canvas.height - height,
          width,
          height,
        );
      }
      context.globalAlpha = 1;
    }
    this.frame = requestAnimationFrame(() => this.draw());
  }
}
