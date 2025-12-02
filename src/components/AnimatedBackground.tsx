import { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      hue: number;
      alpha: number;
      pulse: number;
    }

    interface Wave {
      y: number;
      amplitude: number;
      frequency: number;
      speed: number;
      hue: number;
    }

    const particles: Particle[] = [];
    const waves: Wave[] = [];
    const particleCount = 80;
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let time = 0;

    // Create particles with RGB hues
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 3 + 1,
        color: '',
        hue: Math.random() * 360,
        alpha: Math.random() * 0.5 + 0.3,
        pulse: Math.random() * Math.PI * 2
      });
    }

    // Create waves
    for (let i = 0; i < 5; i++) {
      waves.push({
        y: canvas.height * (0.3 + i * 0.15),
        amplitude: 30 + i * 10,
        frequency: 0.01 + i * 0.003,
        speed: 0.02 + i * 0.005,
        hue: i * 60
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      time += 0.01;
      
      // Create gradient background
      const gradient = ctx.createRadialGradient(
        mouseX, mouseY, 0,
        mouseX, mouseY, canvas.width * 0.8
      );
      gradient.addColorStop(0, 'rgba(26, 10, 46, 0.1)');
      gradient.addColorStop(1, 'rgba(26, 10, 46, 0.05)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw animated waves
      waves.forEach((wave, index) => {
        ctx.beginPath();
        const waveHue = (wave.hue + time * 30) % 360;
        ctx.strokeStyle = `hsla(${waveHue}, 100%, 60%, 0.15)`;
        ctx.lineWidth = 2;
        
        for (let x = 0; x < canvas.width; x += 5) {
          const y = wave.y + Math.sin(x * wave.frequency + time * wave.speed * 60) * wave.amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Update and draw particles
      particles.forEach((particle, i) => {
        // Update hue for RGB cycling
        particle.hue = (particle.hue + 0.5) % 360;
        particle.pulse += 0.05;
        
        // Mouse attraction
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          particle.vx += dx * 0.00005;
          particle.vy += dy * 0.00005;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Pulsing radius
        const pulseRadius = particle.radius + Math.sin(particle.pulse) * 1;
        
        // Draw particle with glow
        const glowGradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, pulseRadius * 4
        );
        glowGradient.addColorStop(0, `hsla(${particle.hue}, 100%, 60%, ${particle.alpha})`);
        glowGradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 50%, ${particle.alpha * 0.3})`);
        glowGradient.addColorStop(1, `hsla(${particle.hue}, 100%, 40%, 0)`);

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, pulseRadius * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Core particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 100%, 70%, ${particle.alpha + 0.2})`;
        ctx.fill();

        // Draw connections with gradient
        particles.slice(i + 1).forEach(p2 => {
          const dx = particle.x - p2.x;
          const dy = particle.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const lineGradient = ctx.createLinearGradient(
              particle.x, particle.y, p2.x, p2.y
            );
            lineGradient.addColorStop(0, `hsla(${particle.hue}, 100%, 60%, ${0.3 * (1 - distance / 150)})`);
            lineGradient.addColorStop(1, `hsla(${p2.hue}, 100%, 60%, ${0.3 * (1 - distance / 150)})`);
            
            ctx.beginPath();
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 1;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      // Draw central glow near mouse
      const centerGlow = ctx.createRadialGradient(
        mouseX, mouseY, 0,
        mouseX, mouseY, 150
      );
      const glowHue = (time * 50) % 360;
      centerGlow.addColorStop(0, `hsla(${glowHue}, 100%, 60%, 0.1)`);
      centerGlow.addColorStop(0.5, `hsla(${(glowHue + 60) % 360}, 100%, 50%, 0.05)`);
      centerGlow.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 150, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen', opacity: 0.6 }}
    />
  );
};

export default AnimatedBackground;
