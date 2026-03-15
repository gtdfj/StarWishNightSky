
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Trash2, Send, Sparkles, Moon, Sun, Info } from 'lucide-react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [volume, setVolume] = useState(audioService.getVolume());
  const [wishText, setWishText] = useState('');
  const [showWishInput, setShowWishInput] = useState(false);
  const [activeFireworkType, setActiveFireworkType] = useState<'radial' | 'heart' | 'ring' | 'willow'>('radial');
  
  const lastFireTime = useRef(0);
  const particles = useRef<Particle[]>([]);
  const projectiles = useRef<FireworkProjectile[]>([]);
  const backgroundStars = useRef<{x: number, y: number, s: number, a: number, t: number, speed: number}[]>([]);
  const requestRef = useRef<number>();

  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        s: Math.random() * 1.5,
        a: Math.random(),
        t: Math.random() * 100,
        speed: 0.005 + Math.random() * 0.02
      });
    }
    backgroundStars.current = stars;
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string, power: number) => {
    const particlePool = isOffline ? SUMI_COLORS : COLORS;
    const baseColor = isOffline ? particlePool[Math.floor(Math.random() * particlePool.length)] : color;

    if (!isOffline) {
      particles.current.push({
        x, y, vx: 0, vy: 0, life: 1, maxLife: 0.1, 
        color: '#FFFFFF', size: power * 80 + 20, 
        friction: 1, gravity: 0, trail: [], 
        behavior: 'flash'
      });
    }

    const count = Math.floor(power * 100 + 50);
    const type = isOffline ? 'radial' : activeFireworkType;

    for (let i = 0; i < count; i++) {
      let angle = Math.random() * Math.PI * 2;
      let speedMult = 1;

      if (type === 'heart') {
        // 心形方程: x = 16sin^3(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        const t = Math.random() * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        angle = Math.atan2(hy, hx);
        speedMult = Math.sqrt(hx * hx + hy * hy) / 16;
      } else if (type === 'ring') {
        speedMult = 1;
      } else if (type === 'willow') {
        speedMult = Math.random() * 0.5 + 0.5;
      }

      const speedStr = (Math.random() * 0.5 + 0.5) * (isOffline ? 5 : 8) * power * speedMult;
      const speed = speedStr * (0.8 + Math.random() * 0.4);
      
      const p: Particle = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: isOffline ? 2.5 : (type === 'willow' ? 3.5 : 1.0 + Math.random() * 1.0),
        color: baseColor,
        size: isOffline ? 3 + Math.random() * 4 : 1.5 + Math.random() * 1.5,
        friction: type === 'willow' ? 0.98 : (isOffline ? 0.94 : 0.95),
        gravity: type === 'willow' ? 0.04 : (isOffline ? 0.08 : 0.12),
        trail: [],
        behavior: 'normal'
      };
      particles.current.push(p);
    }

    // Ring 模式额外增加一圈
    if (type === 'ring') {
      for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        const speed = 6 * power;
        particles.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1, maxLife: 1.5,
          color: '#FFFFFF', size: 2,
          friction: 0.96, gravity: 0.1, trail: [],
          behavior: 'normal'
        });
      }
    }

    if (!isOffline && power > 0.6) {
      const sparkleCount = Math.floor(power * 60);
      for (let i = 0; i < sparkleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 2 + 2) * power;
        particles.current.push({
          x, y, 
          vx: Math.cos(angle) * speed, 
          vy: Math.sin(angle) * speed,
          life: 1, maxLife: 1.5 + Math.random(), 
          color: '#ffffff', 
          size: 0.8 + Math.random() * 0.8,
          friction: 0.96, gravity: 0.08, trail: [],
          behavior: 'spark'
        });
      }
    }

    if (Math.random() > 0.85 && !isOffline) {
      const constellation = CONSTELLATIONS[Math.floor(Math.random() * CONSTELLATIONS.length)];
      const scale = 30 * power;
      const rotation = Math.random() * Math.PI * 2;
      const cosR = Math.cos(rotation), sinR = Math.sin(rotation);

      constellation.points.forEach(([px, py]) => {
        particles.current.push({
          x: x + (px * cosR - py * sinR) * scale,
          y: y + (px * sinR + py * cosR) * scale,
          vx: 0, vy: 0, life: 1, maxLife: 3.5, 
          color: '#FFFFFF', size: 2.5, friction: 0.99, gravity: 0, trail: [],
          behavior: 'normal'
        });
      });
    }

    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setBlessings(prev => [...prev.slice(-5), { 
      text: quote, 
      opacity: 1, 
      y: y - 80, 
      id: Date.now(),
      rotation: (Math.random() - 0.5) * 10
    }]);
    audioService.playPop(power);
  }, [isOffline, activeFireworkType]);

  const launchFirework = useCallback((x: number, y: number, power: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const color = isOffline ? '#000' : COLORS[Math.floor(Math.random() * COLORS.length)];
    const projectile: FireworkProjectile = {
      x: canvas.width / 2 + (Math.random() - 0.5) * 40,
      y: canvas.height + 20,
      targetY: y,
      vx: (x - canvas.width / 2) / 60,
      vy: -15 - power * 4,
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
    
    if (isOffline) {
      ctx.fillStyle = '#f5f0e6'; 
      ctx.fillRect(0, 0, width, height);
    } else {
      // 使用纯色背景代替渐变
      ctx.fillStyle = '#020205';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';
      backgroundStars.current.forEach(star => {
        star.t += star.speed;
        const alpha = star.a * (0.4 + Math.sin(star.t) * 0.6);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    }

    if (isOffline) {
      ctx.globalCompositeOperation = 'multiply';
    } else {
      ctx.globalCompositeOperation = 'lighter';
    }

    projectiles.current = projectiles.current.filter(p => p.active);
    projectiles.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.22;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 15) p.trail.shift();

      ctx.beginPath();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = isOffline ? 3 : 2;
      ctx.lineCap = 'round';
      
      if (p.trail.length > 0) {
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
      }
      ctx.stroke();

      if (p.vy >= 0 || p.y <= p.targetY) {
        p.active = false;
        createParticles(p.x, p.y, p.color, p.power);
      }
    });

    particles.current = particles.current.filter(p => p.life > 0);
    particles.current.forEach(p => {
      p.vx *= p.friction; 
      p.vy *= p.friction; 
      p.vy += p.gravity;
      
      if (p.wobbleSpeed) {
        p.wobbleTheta! += p.wobbleSpeed;
        p.x += Math.sin(p.wobbleTheta!) * 0.3;
      }
      p.x += p.vx; 
      p.y += p.vy;
      p.life -= 1 / (60 * p.maxLife);

      if (p.life > 0) {
        if (p.behavior === 'flash') {
            // 使用半透明纯色代替径向渐变
            ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.5})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        ctx.fillStyle = p.color;
        let alpha = p.life;
        if (!isOffline) {
             alpha = Math.pow(p.life, 1.5);
             if (p.behavior === 'spark') {
                 if (Math.random() > 0.8) alpha *= 1.5;
                 else if (Math.random() < 0.2) alpha *= 0.5;
             }
        }
        ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
        
        ctx.beginPath();
        const velocity = Math.hypot(p.vx, p.vy);

        if (!isOffline && velocity > 1.5 && p.behavior !== 'normal') {
            ctx.lineWidth = p.size;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
            ctx.stroke();
        } else {
            const size = p.size * (isOffline ? 1 : (p.life < 0.3 ? p.life * 3 : 1)); 
            ctx.arc(p.x, p.y, Math.max(0, size), 0, Math.PI * 2);
            ctx.fill();
        }
      }
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    requestRef.current = requestAnimationFrame(() => update(ctx));
  }, [createParticles, isOffline]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { 
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
    };
    window.addEventListener('resize', resize);
    resize();
    requestRef.current = requestAnimationFrame(() => update(ctx));
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [update]);

  useEffect(() => {
    let timer: number;
    if (charging) {
      timer = window.setInterval(() => setChargeLevel(p => Math.min(p + 0.05, 3)), 20);
    }
    return () => clearInterval(timer);
  }, [charging]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (isMenuOpen) return;
    setCharging(true);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!charging) return;
    setCharging(false);
    launchFirework(e.clientX, e.clientY, chargeLevel);
    setChargeLevel(0);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setBlessings(prev => prev.map(b => ({
        ...b, y: b.y - 0.5, opacity: b.opacity - 0.005
      })).filter(b => b.opacity > 0));
    }, 16);
    return () => clearInterval(timer);
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioService.setVolume(val);
  };

  const handleSendWish = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!wishText.trim()) return;
    
    setBlessings(prev => [...prev.slice(-5), {
      text: wishText,
      opacity: 1,
      y: window.innerHeight / 2,
      id: Date.now(),
      rotation: 0
    }]);
    setWishText('');
    setShowWishInput(false);
  };

  const clearBlessings = () => {
    setBlessings([]);
  };

  return (
    <div 
      className={`relative w-full h-screen overflow-hidden transition-colors duration-1000 ${isOffline ? 'bg-[#f5f0e6]' : 'bg-[#020205]'}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {/* 水墨模式纸张纹理 */}
      {isOffline && (
        <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
      )}

      <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair" />
      
      {/* 极简页眉 */}
      <div className="absolute top-12 left-0 right-0 pointer-events-none flex flex-col items-center select-none z-10">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-2xl font-serif-elegant tracking-[0.6em] mb-2 transition-colors duration-1000 cursor-pointer pointer-events-auto ${isOffline ? 'text-black/70' : 'text-white/40'} hover:scale-105 active:scale-95 transition-transform`}
          onClick={() => setIsMenuOpen(true)}
        >
          {isOffline ? '墨 · 染' : '星 愿 · 夜 穹'}
        </motion.h1>
        <div className={`h-[1px] w-12 transition-colors duration-1000 ${isOffline ? 'bg-black/10' : 'bg-white/10'}`}></div>
      </div>

      {/* 侧边工具栏 */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-30">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className={`p-3 rounded-full transition-all ${isOffline ? 'bg-black/5 hover:bg-black/10 text-black/40' : 'bg-white/5 hover:bg-white/10 text-white/30'}`}
          title="Settings"
        >
          <Settings size={18} />
        </button>
        <button 
          onClick={() => setShowWishInput(true)}
          className={`p-3 rounded-full transition-all ${isOffline ? 'bg-black/5 hover:bg-black/10 text-black/40' : 'bg-white/5 hover:bg-white/10 text-white/30'}`}
          title="Write a Wish"
        >
          <Send size={18} />
        </button>
        <button 
          onClick={clearBlessings}
          className={`p-3 rounded-full transition-all ${isOffline ? 'bg-black/5 hover:bg-black/10 text-black/40' : 'bg-white/5 hover:bg-white/10 text-white/30'}`}
          title="Clear Blessings"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* 烟火类型选择 (仅非水墨模式) */}
      {!isOffline && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
          {(['radial', 'heart', 'ring', 'willow'] as const).map(type => (
            <button
              key={type}
              onClick={() => setActiveFireworkType(type)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
                activeFireworkType === type 
                ? 'bg-white/20 border-white/40 text-white' 
                : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'
              }`}
              title={type.charAt(0).toUpperCase() + type.slice(1)}
            >
              {type === 'radial' && <Sparkles size={16} />}
              {type === 'heart' && <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>}
              {type === 'ring' && <div className="w-3 h-3 rounded-full border border-current" />}
              {type === 'willow' && <div className="w-3 h-3 flex flex-col items-center"><div className="w-1 h-1 bg-current rounded-full mb-0.5" /><div className="w-0.5 h-2 bg-current opacity-50" /></div>}
            </button>
          ))}
        </div>
      )}

      {/* 许愿输入框 */}
      <AnimatePresence>
        {showWishInput && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setShowWishInput(false)}
          >
            <form 
              onSubmit={handleSendWish}
              className={`w-80 p-8 rounded-3xl shadow-2xl flex flex-col gap-6 ${isOffline ? 'bg-[#f5f0e6]' : 'bg-[#0a0a1a] border border-white/10'}`}
              onClick={e => e.stopPropagation()}
            >
              <h3 className={`text-sm font-serif-elegant tracking-[0.3em] uppercase text-center opacity-60 ${isOffline ? 'text-black' : 'text-white'}`}>
                Write Your Wish
              </h3>
              <input 
                autoFocus
                type="text"
                value={wishText}
                onChange={e => setWishText(e.target.value)}
                placeholder="在此输入你的心愿..."
                className={`w-full bg-transparent border-b py-2 outline-none text-lg font-brush transition-colors ${
                  isOffline ? 'border-black/20 text-black placeholder:text-black/20' : 'border-white/20 text-white placeholder:text-white/20'
                }`}
              />
              <div className="flex justify-between items-center mt-2">
                <button 
                  type="button"
                  onClick={() => setShowWishInput(false)}
                  className={`text-[10px] tracking-[0.2em] uppercase opacity-40 hover:opacity-100 ${isOffline ? 'text-black' : 'text-white'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={`px-6 py-2 rounded-full text-[10px] tracking-[0.2em] uppercase transition-all ${
                    isOffline ? 'bg-black text-white hover:bg-black/80' : 'bg-white text-black hover:bg-white/80'
                  }`}
                >
                  Release
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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
          className="blessing-text absolute left-1/2 pointer-events-none font-brush text-2xl whitespace-nowrap z-10"
          style={{ 
            top: `${b.y}px`, 
            opacity: b.opacity,
            color: isOffline ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
            textShadow: isOffline ? 'none' : '0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(255,255,255,0.2)',
            transform: `translate(-50%, 0) rotate(${b.rotation || 0}deg)`
          }}
        >
          {b.text}
        </div>
      ))}

      {/* 底部状态 - 双击切换模式 */}
      <div 
        className={`absolute bottom-8 right-10 text-[9px] tracking-[0.3em] font-serif-elegant pointer-events-auto cursor-pointer z-10 uppercase transition-opacity hover:opacity-100 opacity-60 ${isOffline ? 'text-black/40' : 'text-white/30'}`}
        onDoubleClick={() => setIsOffline(!isOffline)}
        title="Double click to switch mode"
      >
        {isOffline ? 'Offline / Ink Mode' : 'Gilding The Night Sky'}
      </div>

      {/* 设置菜单 */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className={`w-72 p-8 rounded-2xl shadow-2xl flex flex-col gap-8 transition-colors duration-1000 ${isOffline ? 'bg-[#f5f0e6]/95 text-black' : 'bg-[#0a0a1a]/90 text-white border border-white/10'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h2 className="text-sm font-serif-elegant tracking-[0.4em] opacity-60 uppercase mb-4">Settings</h2>
              <div className={`h-[1px] w-8 mx-auto ${isOffline ? 'bg-black/20' : 'bg-white/20'}`}></div>
            </div>

            {/* 音量控制 */}
            <div className="flex flex-col gap-4">
              <label className="text-[10px] tracking-[0.3em] uppercase opacity-50 flex justify-between">
                <span>Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume} 
                onChange={handleVolumeChange}
                className={`w-full h-[2px] appearance-none cursor-pointer outline-none transition-colors ${isOffline ? 'bg-black/10 accent-black/60' : 'bg-white/10 accent-white/60'}`}
              />
            </div>

            {/* 模式切换 */}
            <div className="flex flex-col gap-4">
              <label className="text-[10px] tracking-[0.3em] uppercase opacity-50">Mode</label>
              <button 
                onClick={() => setIsOffline(!isOffline)}
                className={`w-full py-3 rounded-xl border flex items-center justify-center gap-3 transition-all ${
                  isOffline 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                }`}
              >
                {isOffline ? <Sun size={14} /> : <Moon size={14} />}
                <span className="text-[10px] tracking-[0.2em] uppercase">
                  {isOffline ? 'Switch to Night' : 'Switch to Ink'}
                </span>
              </button>
            </div>

            <button 
              onClick={() => setIsMenuOpen(false)}
              className="mt-4 text-[10px] tracking-[0.3em] opacity-30 hover:opacity-100 transition-opacity uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
