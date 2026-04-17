import { useEffect, useRef } from 'react';

interface ThreadsProps {
  amplitude?: number;
  distance?: number;
  enableMouseInteraction?: boolean;
  color?: string;
  className?: string;
}

const Threads: React.FC<ThreadsProps> = ({
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = true,
  color = '#22c55e',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    const threads: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      points: Array<{ x: number; y: number }>;
    }> = [];

    const numThreads = 15;
    const maxPoints = 50;

    for (let i = 0; i < numThreads; i++) {
      threads.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        points: []
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    if (enableMouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      threads.forEach((thread) => {
        if (enableMouseInteraction) {
          const dx = mouseRef.current.x - thread.x;
          const dy = mouseRef.current.y - thread.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 200) {
            const force = (200 - dist) / 200;
            thread.vx += (dx / dist) * force * 0.3;
            thread.vy += (dy / dist) * force * 0.3;
          }
        }

        thread.x += thread.vx * amplitude;
        thread.y += thread.vy * amplitude;

        thread.vx *= 0.98;
        thread.vy *= 0.98;

        if (thread.x < 0 || thread.x > canvas.offsetWidth) thread.vx *= -1;
        if (thread.y < 0 || thread.y > canvas.offsetHeight) thread.vy *= -1;

        thread.x = Math.max(0, Math.min(canvas.offsetWidth, thread.x));
        thread.y = Math.max(0, Math.min(canvas.offsetHeight, thread.y));

        thread.points.push({ x: thread.x, y: thread.y });
        if (thread.points.length > maxPoints) {
          thread.points.shift();
        }

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        thread.points.forEach((point, index) => {
          const opacity = (index / thread.points.length) * 0.6;
          ctx.globalAlpha = opacity;

          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });

        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      threads.forEach((thread, i) => {
        threads.slice(i + 1).forEach((otherThread) => {
          const dx = thread.x - otherThread.x;
          const dy = thread.y - otherThread.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100 + distance * 50) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = (1 - dist / (100 + distance * 50)) * 0.3;
            ctx.moveTo(thread.x, thread.y);
            ctx.lineTo(otherThread.x, otherThread.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      if (enableMouseInteraction) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [amplitude, distance, enableMouseInteraction, color]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full pointer-events-none ${className}`}
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
};

export default Threads;
