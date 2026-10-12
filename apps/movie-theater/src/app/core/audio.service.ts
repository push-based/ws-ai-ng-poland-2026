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

  apply(value: unknown) {
    const mix = validateAudioMix(value);
    this.mix.set(mix);
    if (this.context && this.gain && this.bass && this.mid && this.treble) {
      const time = this.context.currentTime;
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
