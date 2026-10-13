import { Injectable, signal, inject, DestroyRef } from '@angular/core';
import {
  AudioMix,
  audioPresets,
  validateAudioMix,
} from '@nano-cinema/catalogue';

/** One audio graph, with a source node for each routed player element. */
@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly mix = signal<AudioMix>({ ...audioPresets.flat });
  readonly active = signal(false);
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: MediaElementAudioSourceNode;
  private video?: HTMLVideoElement;
  private readonly sources = new WeakMap<
    HTMLVideoElement,
    MediaElementAudioSourceNode
  >();
  private bass?: BiquadFilterNode;
  private mid?: BiquadFilterNode;
  private treble?: BiquadFilterNode;
  private gain?: GainNode;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.source?.disconnect();
      void this.context?.close();
    });
  }

  /** User gestures unlock audio. Route changes replace the source, without duplicating the filter graph. */
  async connect(video: HTMLVideoElement) {
    if (!this.context) this.createGraph();
    const context = this.context;
    const bass = this.bass;
    if (!context || !bass)
      throw new Error('Audio graph could not be initialized.');

    if (this.video !== video) {
      this.source?.disconnect();
      // Web Audio permits only one MediaElementAudioSourceNode per media element.
      // Cache it, then reconnect that source when needed. Routing can create a new
      // video element while keeping the filters and mix settings alive.
      let source = this.sources.get(video);
      if (!source) {
        source = context.createMediaElementSource(video);
        this.sources.set(video, source);
      }
      source.connect(bass);
      this.source = source;
      this.video = video;
    }
    await context.resume();
    this.active.set(this.video === video && context.state === 'running');
  }

  /** A destroyed player must not keep routing sound from a detached DOM element. */
  detach() {
    this.source?.disconnect();
    this.source = undefined;
    this.video = undefined;
    this.active.set(false);
  }

  // Human faders and WebMCP calls meet at this boundary. Validate the entire mix
  // before changing any filter so invalid agent input cannot partially alter sound.
  // Filter gains use decibels; master volume is a linear 0-to-1 gain.
  apply(value: unknown) {
    const mix = validateAudioMix(value);
    this.mix.set(mix);
    if (this.context && this.gain && this.bass && this.mid && this.treble) {
      const time = this.context.currentTime;
      // Smooth each parameter toward its target over a short time constant instead
      // of jumping instantly. Sudden gain changes can produce audible clicks.
      this.bass.gain.setTargetAtTime(mix.bass, time, 0.03);
      this.mid.gain.setTargetAtTime(mix.mid, time, 0.03);
      this.treble.gain.setTargetAtTime(mix.treble, time, 0.03);
      this.gain.gain.setTargetAtTime(mix.volume, time, 0.03);
    }
  }

  preset(name: keyof typeof audioPresets) {
    this.apply(audioPresets[name]);
  }

  spectrum(): Uint8Array {
    const data = new Uint8Array(this.analyser?.frequencyBinCount ?? 128);
    this.analyser?.getByteFrequencyData(data);
    return data;
  }

  // Signal flow: video source → bass → mid → treble → master gain → compressor
  // → analyser → speakers. These are actual audio processing nodes. The low/high
  // shelves affect frequencies below/above a cutoff; the peaking filter targets mids.
  // The compressor reduces peaks, and the analyser measures the processed signal.
  private createGraph() {
    const context = new AudioContext();
    this.context = context;
    this.bass = context.createBiquadFilter();
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 180;
    this.mid = context.createBiquadFilter();
    this.mid.type = 'peaking';
    this.mid.frequency.value = 1400;
    this.mid.Q.value = 0.8;
    this.treble = context.createBiquadFilter();
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 4200;
    this.gain = context.createGain();
    this.analyser = context.createAnalyser();
    // The analyser uses a 256-sample FFT, giving 128 frequency bins. The booth's
    // bars visualize these measured magnitudes, not a fabricated music animation.
    this.analyser.fftSize = 256;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -6;
    this.bass
      .connect(this.mid)
      .connect(this.treble)
      .connect(this.gain)
      .connect(limiter)
      .connect(this.analyser)
      .connect(context.destination);
    this.apply(this.mix());
  }
}
