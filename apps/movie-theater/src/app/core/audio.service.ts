import { Injectable, signal, inject, DestroyRef } from '@angular/core';
import {
  AudioMix,
  audioPresets,
  validateAudioMix,
} from '@nano-cinema/catalogue';
@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly mix = signal<AudioMix>({ ...audioPresets.flat });
  readonly active = signal(false);
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: MediaElementAudioSourceNode;
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
  async connect(video: HTMLVideoElement) {
    if (!this.context) {
      this.context = new AudioContext();
      this.source = this.context.createMediaElementSource(video);
      this.bass = this.context.createBiquadFilter();
      this.bass.type = 'lowshelf';
      this.bass.frequency.value = 180;
      this.mid = this.context.createBiquadFilter();
      this.mid.type = 'peaking';
      this.mid.frequency.value = 1400;
      this.mid.Q.value = 0.8;
      this.treble = this.context.createBiquadFilter();
      this.treble.type = 'highshelf';
      this.treble.frequency.value = 4200;
      this.gain = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -6;
      this.source
        .connect(this.bass)
        .connect(this.mid)
        .connect(this.treble)
        .connect(this.gain)
        .connect(limiter)
        .connect(this.analyser)
        .connect(this.context.destination);
      this.apply(this.mix());
    }
    await this.context.resume();
    this.active.set(this.context.state === 'running');
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
}
