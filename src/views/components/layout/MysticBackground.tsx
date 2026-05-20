import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  pulse: number;
  type: 'dust' | 'ember' | 'sigil';
}

/**
 * 復古神秘學背景：金色塵埃 + 微光浮塵 + 偶爾出現的煉金術符號殘影。
 * 比原版更有氛圍感，粒子種類更豐富。
 */
export default function MysticBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Particle[] = [];
    const DUST_COUNT = 70;
    const EMBER_COUNT = 18;
    const SIGIL_COUNT = 5;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // 金色塵埃
    for (let i = 0; i < DUST_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.25,
        speedY: -Math.random() * 0.2 - 0.05,
        opacity: Math.random() * 0.5 + 0.15,
        pulse: Math.random() * Math.PI * 2,
        type: 'dust',
      });
    }

    // 微光浮塵（較大、較亮、緩慢上升）
    for (let i = 0; i < EMBER_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1.5,
        speedX: (Math.random() - 0.5) * 0.12,
        speedY: -Math.random() * 0.1 - 0.03,
        opacity: Math.random() * 0.25 + 0.08,
        pulse: Math.random() * Math.PI * 2,
        type: 'ember',
      });
    }

    // 符號殘影（極淡、極慢旋轉漂浮）
    for (let i = 0; i < SIGIL_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 20 + 15,
        speedX: (Math.random() - 0.5) * 0.05,
        speedY: (Math.random() - 0.5) * 0.03,
        opacity: Math.random() * 0.03 + 0.01,
        pulse: Math.random() * Math.PI * 2,
        type: 'sigil',
      });
    }

    const SIGIL_CHARS = ['☉', '☽', '⚹', '△'];

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += p.type === 'sigil' ? 0.008 : 0.02;

        // 環繞
        if (p.x < -20) p.x = canvas!.width + 20;
        if (p.x > canvas!.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas!.height + 20;
        if (p.y > canvas!.height + 20) p.y = -20;

        const currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));

        if (p.type === 'sigil') {
          ctx!.save();
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.pulse * 0.3);
          ctx!.font = `${p.size}px serif`;
          ctx!.textAlign = 'center';
          ctx!.textBaseline = 'middle';
          ctx!.fillStyle = `rgba(201, 168, 76, ${currentOpacity})`;
          ctx!.fillText(SIGIL_CHARS[Math.floor(p.size) % SIGIL_CHARS.length], 0, 0);
          ctx!.restore();
        } else if (p.type === 'ember') {
          // 溫暖的光暈
          const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          gradient.addColorStop(0, `rgba(201, 168, 76, ${currentOpacity})`);
          gradient.addColorStop(0.4, `rgba(201, 168, 76, ${currentOpacity * 0.3})`);
          gradient.addColorStop(1, 'rgba(201, 168, 76, 0)');
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx!.fillStyle = gradient;
          ctx!.fill();
        } else {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(201, 168, 76, ${currentOpacity})`;
          ctx!.fill();
        }
      }

      animationId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 1 }}
    />
  );
}
