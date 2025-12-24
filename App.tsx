
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Particle, FireworkProjectile, Blessing, Point } from './types';
import { QUOTES, COLORS, SUMI_COLORS, CONSTELLATIONS } from './constants';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [charging, setCharging] = useState(false);
  const [chargeLevel, setChargeLevel] = useState(0);
  const [blessings, setBlessings] = useState<Blessing[]>([]);
  const [combo, setCombo] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  
  const lastFireTime = useRef(0);
  const lastTitleClickTime = useRef(0);
  const particles = useRef<Particle[]>([]);
  const projectiles = useRef<FireworkProjectile[]>([]);
  const backgroundStars = useRef<{x: number, y: number, s: number, a: number, t: number, speed: number}[]>([]);
  const requestRef = useRef<number>();

  // 初始化背景元素
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 250; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        s: Math.random() * 1.5,
        a: Math.random(),
        t: Math.random() * 100,
        speed: 0.01 + Math.random() * 0.03
      });
    }
    backgroundStars.current = stars;
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string, power: number) => {
    const count = Math.floor(power * 50 + 40);
    const particlePool = isOffline ? SUMI_COLORS : COLORS;
    const finalColor = isOffline ? particlePool[Math.floor(Math.random() * particlePool.length)] : color;

    // 核心爆裂
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const speed = (Math.random() * 3 + 3) * power;
      
      const p: Particle = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: isOffline ? 2.5 : 1.2 + Math.random() * 0.8,
        color: finalColor,
        size: isOffline ? 4 + Math.random() * 4 : 2 + Math.random() * 1.5,
        friction: isOffline ? 0.93 : 0.96,
        gravity: isOffline ? 0.08 : 0.22,
        trail: []
      };
      particles.current.push(p);
    }

    // 次级尘埃
    if (power > 1.5 && !isOffline) {
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 * power;
        particles.current.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1, maxLife: 2.0, color: 'rgba(255,255,255,0.4)', size: 0.8,
          friction: 0.92, gravity: 0.05, trail: [], wobbleSpeed: 0.05, wobbleTheta: Math.random() * Math.PI * 2
        });
      }
    }

    // 随机星群
    if (Math.random() > 0.9 && !isOffline) {
      const constellation = CONSTELLATIONS[Math.floor(Math.random() * CONSTELLATIONS.length)];
      const scale = 25 * power;
      const rotation = Math.random() * Math.PI * 2;
      const cosR = Math.cos(rotation), sinR = Math.sin(rotation);

      constellation.points.forEach(([px, py]) => {
        particles.current.push({
          x: x + (px * cosR - py * sinR) * scale,
          y: y + (px * sinR + py * cosR) * scale,
          vx: 0, vy: 0, life: 1, maxLife: 4.0, color: '#FFFFFF', size: 2.5, friction: 0.99, gravity: 0, trail: []
        });
      });
    }

    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setBlessings(prev => [...prev.slice(-2), { text: quote, opacity: 1, y: y - 80, id: Date.now() }]);
    audioService.playPop(power);
  }, [isOffline]);

  const launchFirework = useCallback((x: number, y: number, power: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const color = isOffline ? '#000' : COLORS[Math.floor(Math.random() * COLORS.length)];
    const projectile: FireworkProjectile = {
      x: canvas.width / 2 + (Math.random() - 0.5) * 40,
      y: canvas.height + 20,
      targetY: y,
      vx: (x - canvas.width / 2) / 65,
      vy: -14 - power * 3,
      color, power, trail: [], active: true
    };
    projectiles.current.push(projectile);
    audioService.playLaunch();

    const now = Date.now();
    if (now - lastFireTime.current < 2500) {
      setCombo(c => c + 1);
    } else {
      setCombo(1);
    }
    lastFireTime.current = now;
  }, [isOffline]);

  const update = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    
    // 背景绘制
    if (isOffline) {
      ctx.fillStyle = '#f5f0e6'; // 宣纸色
      ctx.fillRect(0, 0, width, height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#020205'); // 极深蓝黑
      grad.addColorStop(1, '#08081a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 绘制流动的星空
      backgroundStars.current.forEach(star => {
        star.t += star.speed;
        const alpha = star.a * (0.3 + Math.sin(star.t) * 0.7);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 绘制烟火轨迹
    projectiles.current = projectiles.current.filter(p => p.active);
    projectiles.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.22;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 20) p.trail.shift();

      ctx.beginPath();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = isOffline ? 4 : 1.5;
      ctx.lineCap = 'round';
      p.trail.forEach((pos, idx) => {
        ctx.globalAlpha = idx / p.trail.length;
        if (idx === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (p.vy >= 0 || p.y <= p.targetY) {
        p.active = false;
        createParticles(p.x, p.y, p.color, p.power);
      }
    });

    // 绘制粒子
    particles.current = particles.current.filter(p => p.life > 0);
    particles.current.forEach(p => {
      p.vx *= p.friction; p.vy *= p.friction; p.vy += p.gravity;
      if (p.wobbleSpeed) {
        p.wobbleTheta! += p.wobbleSpeed;
        p.x += Math.sin(p.wobbleTheta!) * 0.3;
      }
      p.x += p.vx; p.y += p.vy;
      p.life -= 1 / (60 * p.maxLife);

      if (p.life > 0) {
        ctx.fillStyle = p.color;
        const alpha = isOffline ? p.life * 0.8 : Math.pow(p.life, 2);
        ctx.globalAlpha = alpha;
        
        ctx.beginPath();
        const size = Math.max(0.1, p.size * (isOffline ? p.life : p.life * 1.5));
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    requestRef.current = requestAnimationFrame(() => update(ctx));
  }, [createParticles, isOffline]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    resize();
    requestRef.current = requestAnimationFrame(() => update(ctx));
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [update]);

  // 蓄力逻辑
  useEffect(() => {
    let timer: number;
    if (charging) {
      timer = window.setInterval(() => setChargeLevel(p => Math.min(p + 0.04, 3)), 30);
    }
    return () => clearInterval(timer);
  }, [charging]);

  const handleTitleClick = () => {
    const now = Date.now();
    if (now - lastTitleClickTime.current < 350) {
      setIsOffline(!isOffline);
    }
    lastTitleClickTime.current = now;
  };

  const onPointerDown = () => setCharging(true);
  const onPointerUp = (e: React.PointerEvent) => {
    if (!charging) return;
    setCharging(false);
    launchFirework(e.clientX, e.clientY, chargeLevel);
    setChargeLevel(0);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setBlessings(prev => prev.map(b => ({
        ...b, y: b.y - 0.4, opacity: b.opacity - 0.003
      })).filter(b => b.opacity > 0));
    }, 16);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className={`relative w-full h-screen overflow-hidden transition-colors duration-1000 ${isOffline ? 'bg-[#f5f0e6]' : 'bg-[#020205]'}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair" />
      
      {/* 极简页眉 */}
      <div className="absolute top-16 left-0 right-0 pointer-events-none flex flex-col items-center select-none z-10">
        <h1 
          className={`text-2xl font-serif-elegant tracking-[0.6em] mb-2 transition-colors duration-1000 cursor-pointer pointer-events-auto ${isOffline ? 'text-black/70' : 'text-white/40'}`}
          onClick={handleTitleClick}
        >
          {isOffline ? '墨 · 染' : '星 愿 · 夜 穹'}
        </h1>
        <div className={`h-[1px] w-12 transition-colors duration-1000 ${isOffline ? 'bg-black/10' : 'bg-white/10'}`}></div>
      </div>

      {/* 极简蓄力条 */}
      <div className={`absolute bottom-24 left-1/2 -translate-x-1/2 w-40 flex flex-col items-center gap-2 z-20 transition-opacity duration-300 ${charging ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`h-[1px] w-full relative overflow-hidden ${isOffline ? 'bg-black/10' : 'bg-white/10'}`}>
          <div 
            className={`h-full absolute left-0 transition-all duration-75 ${isOffline ? 'bg-black/60' : 'bg-white/60'}`} 
            style={{ width: `${(chargeLevel / 3) * 100}%` }} 
          />
        </div>
      </div>

      {/* Combo 显示 */}
      {combo > 1 && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-10">
          <span className={`font-serif-elegant text-xs italic tracking-widest ${isOffline ? 'text-black/30' : 'text-white/20'}`}>
            {combo}x Harmony
          </span>
        </div>
      )}

      {/* 诗意寄语 */}
      {blessings.map(b => (
        <div 
          key={b.id}
          className="blessing-text absolute left-1/2 pointer-events-none font-serif-elegant text-xl whitespace-nowrap z-10"
          style={{ 
            top: `${b.y}px`, 
            opacity: b.opacity,
            color: isOffline ? '#000' : '#fff',
            textShadow: isOffline ? 'none' : '0 0 15px rgba(255,255,255,0.2)'
          }}
        >
          {b.text}
        </div>
      ))}

      {/* 底部状态 */}
      <div className={`absolute bottom-8 right-10 text-[9px] tracking-[0.3em] font-serif-elegant pointer-events-none z-10 uppercase ${isOffline ? 'text-black/20' : 'text-white/10'}`}>
        {isOffline ? 'Offline / Paper Mode' : 'Gilding The Night Sky'}
      </div>
    </div>
  );
};

export default App;
