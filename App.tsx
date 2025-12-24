
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Particle, FireworkProjectile, Blessing, Point, HolidayConfig } from './types';
import { QUOTES, ANCIENT_QUOTES, COLORS, SUMI_COLORS, CONSTELLATIONS, HOLIDAYS } from './constants';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [charging, setCharging] = useState(false);
  const [chargeLevel, setChargeLevel] = useState(0);
  const [blessings, setBlessings] = useState<Blessing[]>([]);
  const [combo, setCombo] = useState(0);
  const [activeHoliday, setActiveHoliday] = useState<HolidayConfig | null>(null);
  const [showHolidaySplash, setShowHolidaySplash] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const lastFireTime = useRef(0);
  const particles = useRef<Particle[]>([]);
  const projectiles = useRef<FireworkProjectile[]>([]);
  const backgroundStars = useRef<{x: number, y: number, s: number, a: number, t: number, speed: number}[]>([]);
  const auroraWaves = useRef<{offset: number, speed: number, color: string}[]>([]);
  const requestRef = useRef<number>();

  // Online/Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for Holiday on Mount
  useEffect(() => {
    const now = new Date();
    const holiday = HOLIDAYS.find(h => h.match(now));
    if (holiday) {
      setActiveHoliday(holiday);
      const storageKey = `holiday_splash_${holiday.id}_${now.getFullYear()}`;
      if (holiday.firstLaunchEffect && !localStorage.getItem(storageKey)) {
        setShowHolidaySplash(true);
        localStorage.setItem(storageKey, 'true');
        setTimeout(() => setShowHolidaySplash(false), 5000);
      }
    }
  }, []);

  // Initialize Elements
  useEffect(() => {
    // Stars
    const stars = [];
    for (let i = 0; i < 250; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight * 0.8,
        s: Math.random() * 1.5,
        a: Math.random(),
        t: Math.random() * 100,
        speed: 0.01 + Math.random() * 0.02
      });
    }
    backgroundStars.current = stars;

    // Aurora Config
    auroraWaves.current = [
      { offset: 0, speed: 0.0004, color: 'rgba(0, 255, 150, 0.04)' },
      { offset: Math.PI / 2, speed: 0.0003, color: 'rgba(100, 0, 255, 0.03)' },
      { offset: Math.PI, speed: 0.0005, color: 'rgba(0, 200, 255, 0.03)' }
    ];
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string, power: number) => {
    const count = Math.floor(power * 50 + 30);
    const layers = power > 2.2 ? 3 : (power > 1.2 ? 2 : 1);

    let particleColor: string;
    if (isOffline) {
      particleColor = SUMI_COLORS[Math.floor(Math.random() * SUMI_COLORS.length)];
    } else {
      const finalColors = (activeHoliday && Math.random() > 0.4) ? activeHoliday.specialColors : [color];
      particleColor = finalColors[Math.floor(Math.random() * finalColors.length)];
    }

    // Layer 1: Elegant Petal Burst
    const isSpecial = Math.random() > 0.85;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const speed = (Math.random() * 2.5 + 2.5) * power;
      const p: Particle = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: isOffline ? 1.8 : 1.2 + Math.random() * 0.8,
        color: particleColor,
        size: isOffline ? 3 + Math.random() * 5 : 1.5 + Math.random() * 1.5,
        friction: isOffline ? 0.93 : 0.965,
        gravity: isOffline ? 0.07 : 0.04,
        trail: [],
        shape: isSpecial ? (Math.random() > 0.5 ? 'star' : 'heart') : 'circle'
      };
      particles.current.push(p);
    }

    // Layer 2: Shimmering Dust
    if (layers >= 2) {
      const subCount = Math.floor(count * 0.6);
      for (let i = 0; i < subCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 4 + 2) * power;
        const p: Particle = {
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 1.5,
          color: isOffline ? '#555555' : '#FFD700',
          size: 0.8,
          friction: 0.95,
          gravity: 0.06,
          trail: []
        };
        particles.current.push(p);
      }
    }

    // Surprise Constellation
    if (!isOffline && Math.random() > 0.92) {
      const constellation = CONSTELLATIONS[Math.floor(Math.random() * CONSTELLATIONS.length)];
      const scale = 25 * power;
      const rotation = Math.random() * Math.PI * 2;
      constellation.points.forEach(([px, py]) => {
        const cosR = Math.cos(rotation), sinR = Math.sin(rotation);
        const rx = px * cosR - py * sinR;
        const ry = px * sinR + py * cosR;
        particles.current.push({
          x: x + rx * scale, y: y + ry * scale,
          vx: (Math.random() - 0.5) * 0.1, vy: (Math.random() - 0.5) * 0.1,
          life: 1, maxLife: 4, color: '#FFFFFF', size: 2.2, friction: 0.98, gravity: 0, trail: []
        });
      });
    }

    // Quotes Logic
    const quotePool = isOffline ? ANCIENT_QUOTES : (activeHoliday ? activeHoliday.specialQuotes : QUOTES);
    const quote = quotePool[Math.floor(Math.random() * quotePool.length)];
    setBlessings(prev => [...prev.slice(-2), { text: quote, opacity: 1, y: y - 80, id: Date.now(), scale: 1 }]);

    audioService.playPop(power);
  }, [activeHoliday, isOffline]);

  const triggerGalaxyFall = useCallback((customColor?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    for (let i = 0; i < 120; i++) {
      setTimeout(() => {
        const x = Math.random() * canvas.width;
        particles.current.push({
          x: x, y: -20, vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 3 + 1.5,
          life: 1, maxLife: 5, color: customColor || (isOffline ? '#222222' : '#FFFFFF'),
          size: 1.2, friction: 0.995, gravity: 0.005, trail: []
        });
      }, i * 15);
    }
  }, [isOffline]);

  const launchFirework = useCallback((x: number, y: number, power: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let color = isOffline ? '#000000' : COLORS[Math.floor(Math.random() * COLORS.length)];
    if (!isOffline && activeHoliday) color = activeHoliday.specialColors[0];

    projectiles.current.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 80,
      y: canvas.height + 20,
      targetY: y,
      vx: (x - canvas.width / 2) / 75,
      vy: -13 - power * 1.8,
      color, power, trail: [], active: true
    });
    
    audioService.playLaunch();
    const now = Date.now();
    if (now - lastFireTime.current < 2500) {
      setCombo(c => {
        const next = c + 1;
        if (next === 5) triggerGalaxyFall(activeHoliday?.specialColors[1]);
        return next;
      });
    } else setCombo(1);
    lastFireTime.current = now;
  }, [triggerGalaxyFall, activeHoliday, isOffline]);

  const update = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);

    if (isOffline) {
      ctx.fillStyle = '#f8f5f0'; // Aged silk parchment
      ctx.fillRect(0, 0, width, height);
      // Subtle paper texture
      ctx.fillStyle = 'rgba(0,0,0,0.015)';
      for(let i=0; i<300; i++) ctx.fillRect(Math.random()*width, Math.random()*height, 1, 1);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#010105');
      bgGrad.addColorStop(1, '#08081a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Aurora Silky Waves
      const now = Date.now();
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      auroraWaves.current.forEach(wave => {
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.5, wave.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(0, height * 0.4);
        for (let x = 0; x <= width; x += 40) {
          const y = height * 0.25 + Math.sin(x * 0.0015 + now * wave.speed + wave.offset) * 80;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fill();
      });
      ctx.restore();

      // Stars
      backgroundStars.current.forEach(s => {
        s.t += s.speed;
        const opacity = s.a * (0.3 + Math.sin(s.t) * 0.7);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
        ctx.fill();
        // Cross glow for bright stars
        if (s.s > 1.2 && opacity > 0.8) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.2})`;
          ctx.beginPath();
          ctx.moveTo(s.x - 3, s.y); ctx.lineTo(s.x + 3, s.y);
          ctx.moveTo(s.x, s.y - 3); ctx.lineTo(s.x, s.y + 3);
          ctx.stroke();
        }
      });
    }

    // Parallax Mountains
    const drawMountain = (h: number, c: string, parallax: number) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 100) {
        const yOffset = Math.sin(x * 0.001 * parallax) * 40;
        ctx.lineTo(x, height - h + yOffset);
      }
      ctx.lineTo(width, height);
      ctx.fill();
    };

    if (isOffline) {
      drawMountain(120, '#d1ccc0', 0.5);
      drawMountain(80, '#b8b3a9', 1.2);
    } else {
      drawMountain(150, '#010108', 0.5);
      drawMountain(100, '#030312', 1.1);
    }

    // Projectiles
    projectiles.current = projectiles.current.filter(p => p.active);
    projectiles.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 25) p.trail.shift();

      ctx.beginPath();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = isOffline ? 3 : 1.5;
      ctx.lineCap = 'round';
      p.trail.forEach((pos, i) => {
        ctx.globalAlpha = i / p.trail.length;
        if (i === 0) ctx.moveTo(pos.x, pos.y); else ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (p.vy >= 0 || p.y <= p.targetY) {
        p.active = false;
        createParticles(p.x, p.y, p.color, p.power);
      }
    });

    // Particles
    particles.current = particles.current.filter(p => p.life > 0);
    particles.current.forEach(p => {
      p.vx *= p.friction; p.vy *= p.friction; p.vy += p.gravity;
      p.x += p.vx; p.y += p.vy;
      p.life -= 1 / (60 * p.maxLife);

      if (p.life > 0) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = isOffline ? p.life * 0.7 : p.life;
        const s = Math.max(0.2, p.size * p.life);
        
        if (p.shape === 'star' && !isOffline) {
          ctx.beginPath();
          for(let i=0; i<5; i++) {
            const a = (Math.PI*2/5)*i - Math.PI/2;
            ctx.lineTo(p.x + Math.cos(a)*s*2, p.y + Math.sin(a)*s*2);
            ctx.lineTo(p.x + Math.cos(a + Math.PI/5)*s, p.y + Math.sin(a + Math.PI/5)*s);
          }
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'heart' && !isOffline) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.bezierCurveTo(p.x - s*2, p.y - s*3, p.x - s*4, p.y + s, p.x, p.y + s*4);
          ctx.bezierCurveTo(p.x + s*4, p.y + s, p.x + s*2, p.y - s*3, p.x, p.y);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
          ctx.fill();
        }
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
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); window.removeEventListener('resize', resize); };
  }, [update]);

  // Charging Animation
  useEffect(() => {
    let timer: number;
    if (charging) timer = window.setInterval(() => setChargeLevel(p => Math.min(p + 0.04, 3)), 30);
    return () => clearInterval(timer);
  }, [charging]);

  const handleStart = (e: any) => { e.preventDefault(); setCharging(true); setChargeLevel(0.4); };
  const handleEnd = (e: any) => {
    if (!charging) return;
    e.preventDefault();
    setCharging(false);
    const pos = (e.touches ? e.changedTouches[0] : e);
    launchFirework(pos.clientX, pos.clientY, chargeLevel);
    setChargeLevel(0);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setBlessings(prev => prev.map(b => ({
        ...b, y: b.y - (isOffline ? 0.2 : 0.4), opacity: b.opacity - 0.003
      })).filter(b => b.opacity > 0));
    }, 16);
    return () => clearInterval(timer);
  }, [isOffline]);

  return (
    <div 
      className={`relative w-full h-screen overflow-hidden touch-none transition-all duration-1000 ${isOffline ? 'bg-[#f8f5f0]' : 'bg-[#020205]'}`}
      onMouseDown={handleStart} onMouseUp={handleEnd} onTouchStart={handleStart} onTouchEnd={handleEnd}
    >
      <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair" />

      {/* Holiday Splash Overlay */}
      {showHolidaySplash && !isOffline && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#4a0000]/90 transition-opacity duration-1000 animate-pulse pointer-events-none">
          <div className="text-center">
            <h2 className="text-[#D4AF37] font-poetic text-8xl drop-shadow-2xl animate-poetic-entry">春节快乐</h2>
            <div className="mt-8 text-white/40 font-serif-elegant text-xl tracking-[0.5em] uppercase">Spring Festival Bliss</div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="absolute top-12 left-0 right-0 pointer-events-none flex flex-col items-center select-none">
        <h1 className={`text-2xl font-serif-elegant tracking-[0.4em] opacity-40 mb-1 transition-colors duration-1000 ${isOffline ? 'text-[#0a0a0a]' : 'text-white'}`}>
          {isOffline ? '墨 · 染' : '星 愿 · 夜 穹'}
        </h1>
        <div className={`h-[1px] w-12 transition-colors duration-1000 ${isOffline ? 'bg-black/10' : 'bg-white/10'}`}></div>
      </div>

      {/* Charge Indicator */}
      {charging && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-40 flex flex-col items-center gap-2">
          <div className={`h-[1px] w-full relative overflow-hidden transition-colors ${isOffline ? 'bg-black/5' : 'bg-white/5'}`}>
            <div 
              className={`h-full absolute left-0 transition-all duration-75 ${isOffline ? 'bg-black' : 'bg-white'}`}
              style={{ width: `${(chargeLevel / 3) * 100}%` }}
            />
          </div>
          <span className={`text-[9px] tracking-[0.3em] font-serif-elegant uppercase ${isOffline ? 'text-black/40' : 'text-white/40'}`}>Charging Wish</span>
        </div>
      )}

      {/* Combo Indicator */}
      {combo > 1 && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className={`font-serif-elegant text-sm italic transition-colors ${isOffline ? 'text-[#8B0000]' : 'text-[#D4AF37]'}`}>
            {combo}x Sequence
          </span>
        </div>
      )}

      {/* Blessings */}
      {blessings.map(b => (
        <div 
          key={b.id}
          className={`absolute left-1/2 -translate-x-1/2 pointer-events-none font-serif-elegant text-xl whitespace-nowrap transition-all duration-1000`}
          style={{ 
            top: `${b.y}px`, 
            opacity: b.opacity,
            color: isOffline ? '#000000' : '#f0f0f0',
            letterSpacing: '0.4em',
            writingMode: isOffline ? 'vertical-rl' : 'horizontal-tb'
          }}
        >
          {b.text}
        </div>
      ))}

      {/* Footer Info */}
      <div className={`absolute bottom-6 right-8 text-[9px] tracking-[0.2em] font-serif-elegant pointer-events-none transition-colors duration-1000 uppercase ${isOffline ? 'text-black/20' : 'text-white/20'}`}>
        {isOffline ? 'Offline Mode' : (activeHoliday ? `Observed: ${activeHoliday.name}` : 'Midnight Serenade')}
      </div>
    </div>
  );
};

export default App;
