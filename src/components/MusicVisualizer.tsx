import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';

interface MusicVisualizerProps {
  mode?: 'bars' | 'circular' | 'wave';
  className?: string;
}

const MusicVisualizer = ({ mode = 'bars', className = '' }: MusicVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const animationRef = useRef<number>();
  const { isPlaying } = usePlayer();

  useEffect(() => {
    // Initialize audio context and analyser
    const audio = document.querySelector('audio');
    if (!audio || !isPlaying) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;

    const source = ctx.createMediaElementSource(audio);
    source.connect(analyserNode);
    analyserNode.connect(ctx.destination);

    setAudioContext(ctx);
    setAnalyser(analyserNode);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mode === 'bars') {
        drawBars(ctx, dataArray, canvas.width, canvas.height);
      } else if (mode === 'circular') {
        drawCircular(ctx, dataArray, canvas.width, canvas.height);
      } else if (mode === 'wave') {
        drawWave(ctx, dataArray, canvas.width, canvas.height);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, mode]);

  const drawBars = (ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number) => {
    const barWidth = (width / data.length) * 2.5;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / 255) * height;

      const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, 'hsl(193, 100%, 50%)');
      gradient.addColorStop(0.5, 'hsl(85, 100%, 50%)');
      gradient.addColorStop(1, 'hsl(320, 100%, 60%)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  };

  const drawCircular = (ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 212, 170, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < data.length; i++) {
      const angle = (i / data.length) * Math.PI * 2;
      const barHeight = (data[i] / 255) * (radius * 0.8);

      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);

      const hue = (i / data.length) * 120 + 160;
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };

  const drawWave = (ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'hsl(193, 100%, 50%)';
    ctx.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 255.0;
      const y = v * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      className={`w-full h-full ${className}`}
    />
  );
};

export default MusicVisualizer;
