import { useEffect, useRef } from 'react';

interface StarsProps {
  count?: number;
  className?: string;
}

const Stars: React.FC<StarsProps> = ({
  count = 150,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    const stars: Array<{
      x: number;
      y: number;
      radius: number;
      opacity: number;
      fadeSpeed: number;
      fadeDirection: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random(),
        fadeSpeed: Math.random() * 0.01 + 0.005,
        fadeDirection: Math.random() > 0.5 ? 1 : -1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      stars.forEach((star) => {
        star.opacity += star.fadeSpeed * star.fadeDirection;
        
        if (star.opacity <= 0 || star.opacity >= 1) {
          star.fadeDirection *= -1;
        }
        
        star.opacity = Math.max(0, Math.min(1, star.opacity));

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.8})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full pointer-events-none ${className}`}
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
};

export default Stars;
