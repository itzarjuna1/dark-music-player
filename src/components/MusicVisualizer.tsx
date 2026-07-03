import { useEffect, useRef } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';

interface MusicVisualizerProps {
  mode?: 'bars' | 'circular' | 'wave';
  className?: string;
}

// Module-level cache so we never call createMediaElementSource twice on the
// same <audio> element (that throws InvalidStateError).
let sharedCtx: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let sourceAttached = false;

const tryAttachAnalyser = (): AnalyserNode | null => {
  if (sharedAnalyser) return sharedAnalyser;
  const audio = document.querySelector('audio') as HTMLAudioElement | null;
  if (!audio) return null;
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return null;
    sharedCtx = sharedCtx ?? new Ctx();
    const analyser = sharedCtx.createAnalyser();
    analyser.fftSize = 256;
    if (!sourceAttached) {
      const src = sharedCtx.createMediaElementSource(audio);
      src.connect(analyser);
      analyser.connect(sharedCtx.destination);
      sourceAttached = true;
    }
    sharedAnalyser = analyser;
    return analyser;
  } catch {
    return null;
  }
};

const MusicVisualizer = ({ mode = 'bars', className = '' }: MusicVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const { isPlaying, currentTrack } = usePlayer();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to its display size for crisp rendering.
    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const analyser = tryAttachAnalyser();
    if (analyser && sharedCtx?.state === 'suspended') sharedCtx.resume().catch(() => {});

    const BINS = 64;
    const freq = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const fake = new Uint8Array(BINS);

    const fillFake = (t: number) => {
      const active = isPlaying ? 1 : 0.15;
      for (let i = 0; i < BINS; i++) {
        const base = Math.sin(t * 0.002 + i * 0.35) * 0.5 + 0.5;
        const wobble = Math.sin(t * 0.005 + i * 0.12) * 0.25 + 0.25;
        const rolloff = 1 - i / BINS * 0.6;
        fake[i] = Math.floor((base * 0.6 + wobble * 0.4) * 255 * rolloff * active);
      }
    };

    const draw = (t: number) => {
      let data: Uint8Array;
      if (analyser && freq) {
        analyser.getByteFrequencyData(freq);
        // If we got only zeros (e.g. YouTube iframe path), fall back to fake.
        let sum = 0;
        for (let i = 0; i < freq.length; i++) sum += freq[i];
        if (sum === 0) { fillFake(t); data = fake; }
        else data = freq;
      } else {
        fillFake(t);
        data = fake;
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      if (mode === 'bars') drawBars(ctx, data, w, h);
      else if (mode === 'circular') drawCircular(ctx, data, w, h);
      else drawWave(ctx, data, w, h);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [mode, isPlaying, currentTrack?.id]);

  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} />;
};

const barColor = (i: number, n: number) => {
  const shade = 40 + Math.floor((i / n) * 55);
  return `hsl(0 0% ${shade}%)`;
};

const drawBars = (ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number) => {
  const n = Math.min(data.length, 64);
  const gap = 2;
  const barW = (width - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const v = data[i] / 255;
    const barH = Math.max(2, v * height * 0.95);
    const x = i * (barW + gap);
    const y = height - barH;
    ctx.fillStyle = barColor(i, n);
    ctx.fillRect(x, y, barW, barH);
  }
};

const drawCircular = (ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number) => {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 3.2;
  ctx.strokeStyle = 'hsl(0 0% 30%)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const n = Math.min(data.length, 96);
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const v = data[i] / 255;
    const len = v * radius * 0.9;
    const x1 = cx + Math.cos(angle) * radius;
    const y1 = cy + Math.sin(angle) * radius;
    const x2 = cx + Math.cos(angle) * (radius + len);
    const y2 = cy + Math.sin(angle) * (radius + len);
    ctx.strokeStyle = barColor(i, n);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
};

const drawWave = (ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number) => {
  ctx.strokeStyle = 'hsl(0 0% 85%)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const n = data.length;
  const slice = width / (n - 1);
  for (let i = 0; i < n; i++) {
    const v = data[i] / 255;
    const y = height / 2 + (v - 0.5) * height * 0.9;
    const x = i * slice;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
};

export default MusicVisualizer;
