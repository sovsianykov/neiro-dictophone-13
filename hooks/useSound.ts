"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Global singleton ─────────────────────────────────────────────────────────

let globalAudioCtx: AudioContext | null = null;
let globalEnabled = true;
let globalAmbientNode: { stop: () => void } | null = null;
let globalAmbientRunning = false;
let listeners: Array<(enabled: boolean) => void> = [];

function getCtx(): AudioContext {
  if (!globalAudioCtx) {
    globalAudioCtx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
  }
  return globalAudioCtx;
}

function notifyListeners() {
  listeners.forEach((fn) => fn(globalEnabled));
}

// ─── Button click ─────────────────────────────────────────────────────────────

function playClick() {
  if (!globalEnabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch { /* noop */ }
}

// ─── Keyboard keystroke sound ─────────────────────────────────────────────────
// Very subtle: short noise burst, like a mechanical key press

let lastKeyTime = 0;

function playKeyStroke() {
  if (!globalEnabled) return;
  const now = performance.now();
  // Throttle: max one sound per 40 ms to avoid overlap spam
  if (now - lastKeyTime < 40) return;
  lastKeyTime = now;
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.025; // 25 ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 3200;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch { /* noop */ }
}

// ─── Intro / startup sound ────────────────────────────────────────────────────
// Short cinematic sting: low bass rise + brief high shimmer

function playIntroSound() {
  if (!globalEnabled) return;
  try {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.15);
    master.gain.setValueAtTime(0.18, ctx.currentTime + 0.8);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2);
    master.connect(ctx.destination);

    // Bass swell
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(55, ctx.currentTime);
    bass.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.5);
    bassGain.gain.setValueAtTime(0.6, ctx.currentTime);
    bass.connect(bassGain);
    bassGain.connect(master);
    bass.start(ctx.currentTime);
    bass.stop(ctx.currentTime + 2.2);

    // Mid tone
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    mid.type = "triangle";
    mid.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
    mid.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
    midGain.gain.setValueAtTime(0, ctx.currentTime);
    midGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.25);
    midGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
    mid.connect(midGain);
    midGain.connect(master);
    mid.start(ctx.currentTime + 0.1);
    mid.stop(ctx.currentTime + 2.0);

    // High shimmer
    const high = ctx.createOscillator();
    const highGain = ctx.createGain();
    high.type = "sine";
    high.frequency.setValueAtTime(2200, ctx.currentTime + 0.5);
    high.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 1.2);
    highGain.gain.setValueAtTime(0, ctx.currentTime + 0.5);
    highGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.65);
    highGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);
    high.connect(highGain);
    highGain.connect(master);
    high.start(ctx.currentTime + 0.5);
    high.stop(ctx.currentTime + 1.7);
  } catch { /* noop */ }
}

// ─── Ambient loop ─────────────────────────────────────────────────────────────

function startAmbient() {
  if (globalAmbientRunning || !globalEnabled) return;
  try {
    const ctx = getCtx();
    globalAmbientRunning = true;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 3);
    masterGain.connect(ctx.destination);

    const oscs: OscillatorNode[] = [];
    for (const freq of [55, 82.4, 110, 164.8]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      oscs.push(osc);
    }

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
    lfoGain.gain.setValueAtTime(0.01, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start();
    oscs.push(lfo);

    globalAmbientNode = {
      stop() {
        try {
          masterGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
          setTimeout(() => {
            oscs.forEach((o) => { try { o.stop(); } catch { /* noop */ } });
            globalAmbientRunning = false;
            globalAmbientNode = null;
          }, 1600);
        } catch {
          globalAmbientRunning = false;
          globalAmbientNode = null;
        }
      },
    };
  } catch {
    globalAmbientRunning = false;
  }
}

function stopAmbient() {
  if (globalAmbientNode) globalAmbientNode.stop();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSound() {
  const [enabled, setEnabled] = useState(globalEnabled);
  const mountedRef = useRef(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sound-enabled");
      if (stored !== null) {
        globalEnabled = stored !== "false";
        setEnabled(globalEnabled);
      }
    } catch { /* noop */ }

    const listener = (val: boolean) => {
      if (mountedRef.current) setEnabled(val);
    };
    listeners.push(listener);
    return () => {
      mountedRef.current = false;
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const toggle = useCallback(() => {
    globalEnabled = !globalEnabled;
    try { localStorage.setItem("sound-enabled", String(globalEnabled)); } catch { /* noop */ }
    if (!globalEnabled) stopAmbient();
    notifyListeners();
  }, []);

  const click = useCallback(() => playClick(), []);
  const keyStroke = useCallback(() => playKeyStroke(), []);
  const introSound = useCallback(() => playIntroSound(), []);
  const startAmbientSound = useCallback(() => startAmbient(), []);
  const stopAmbientSound = useCallback(() => stopAmbient(), []);

  return { enabled, toggle, click, keyStroke, introSound, startAmbientSound, stopAmbientSound };
}
