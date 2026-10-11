// The game's sound effects, synthesized: no files to ship or license. Each
// is a few tenths of a second of 16-bit mono WAV, built once at load and
// handed to `$.audio.play` as base64 (the hooks sandbox has no Buffer).

export type Effect = "coin" | "jump" | "crash";

const RATE = 22_050;
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const toBase64 = (bytes: Uint8Array) => {
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const count = Math.min(3, bytes.length - i);
    const n = (bytes[i] ?? 0) * 65_536 + (bytes[i + 1] ?? 0) * 256 + (bytes[i + 2] ?? 0);
    for (let k = 0; k < 4; k += 1) {
      out.push(k <= count ? (B64[Math.floor(n / 64 ** (3 - k)) % 64] ?? "=") : "=");
    }
  }
  return out.join("");
};

// A RIFF/WAVE file of `samples` in [-1, 1].
export const toWav = (samples: Float32Array) => {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => {
    for (const [i, ch] of [...value].entries()) {
      view.setUint8(at + i, ch.codePointAt(0) ?? 0);
    }
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (const [i, sample] of samples.entries()) {
    view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32_767), true);
  }
  return bytes;
};

// Renders `seconds` of sound from `voice(t)`, t in seconds.
const render = (seconds: number, voice: (t: number) => number) => {
  const samples = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = voice(i / RATE);
  }
  return samples;
};

const TAU = Math.PI * 2;
const tone = (frequency: number, t: number) => Math.sin(TAU * frequency * t);
const decay = (t: number, rate: number) => Math.exp(-t * rate);

// Seeded white noise, so every build sounds the same.
const noise = (() => {
  let seed = 1;
  return () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return (seed / 2_147_483_647) * 2 - 1;
  };
})();

// A swept sine: its phase is the integral of the frequency, so no clicks.
const sweep = (from: number, to: number, seconds: number) => {
  let phase = 0;
  let last = 0;
  return (t: number) => {
    const f = from + (to - from) * Math.min(1, t / seconds);
    phase += TAU * f * (t - last);
    last = t;
    return Math.sin(phase);
  };
};

const VOICES: Record<Effect, () => Float32Array> = {
  // Two bright pings a fourth apart, the classic pickup.
  coin: () =>
    render(0.22, (t) => {
      const note = t < 0.06 ? 988 : 1319;
      const start = t < 0.06 ? 0 : 0.06;
      const envelope = decay(t - start, 22) * Math.min(1, (t - start) * 800);
      return (tone(note, t) * 0.7 + tone(note * 2, t) * 0.2) * envelope * 0.55;
    }),
  // A clang: inharmonic partials ringing over a burst of noise and a boom.
  crash: () => {
    const boom = sweep(110, 40, 0.3);
    return render(0.5, (t) => {
      const clang = (tone(540, t) + tone(831, t) * 0.7 + tone(1273, t) * 0.5) * decay(t, 9);
      return (clang * 0.22 + noise() * decay(t, 14) * 0.4 + boom(t) * decay(t, 7) * 0.5) * 0.7;
    });
  },
  // A rising whoosh: breathy noise over a quick upward sweep.
  jump: () => {
    const rise = sweep(260, 760, 0.18);
    return render(0.2, (t) => {
      const envelope = Math.sin((Math.PI * t) / 0.2);
      return (rise(t) * 0.35 + noise() * 0.18) * envelope * 0.6;
    });
  },
};

// Every effect as base64 WAV, synthesized once.
export const synthesizeEffects = (): Record<Effect, string> => ({
  coin: toBase64(toWav(VOICES.coin())),
  crash: toBase64(toWav(VOICES.crash())),
  jump: toBase64(toWav(VOICES.jump())),
});
