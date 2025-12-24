import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// --- Types ---
interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  friction: number;
  gravity: number;
  trail: Point[];
  shape?: 'star' | 'circle' | 'heart';
  behavior?: 'normal' | 'spark' | 'flash';
  wobbleSpeed?: number;
  wobbleTheta?: number;
}

interface FireworkProjectile {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  power: number;
  trail: Point[];
  active: boolean;
}

interface Blessing {
  text: string;
  opacity: number;
  y: number;
  id: number;
}

// --- Constants ---
const QUOTES = [
  "醉后不知天在水，满船清梦压星河",
  "星河滚烫，你是人间理想",
  "愿你遍历山河，觉得人间值得",
  "今夜星轨，为你绕行三圈",
  "风起时，好运正穿过山海奔向你",
  "且听风吟，静待花开",
  "以渺小启程，以伟大结束",
  "万事胜意，喜乐长安",
  "保持热爱，奔赴山海",
  "满眼星辰，尽是未来",
  "在这孤独的宇宙里，总有人为你亮灯",
  "愿所有美好，都不期而遇",
  "心之所向，便是光亮",
  "温柔半两，从容一生",
  "知足且上进，温柔而坚定"
];

const COLORS = [
  '#E0C097', '#D4AF37', '#A3B18A', '#A8D8EA', '#AA96DA', 
  '#E6BEBB', '#95A5A6', '#F4EAD5', '#B85C38', '#E0F0FF',
];

const SUMI_COLORS = [
  '#1a1a1a', '#4a4a4a', '#8a8a8a', '#d4af37',
];

const CONSTELLATIONS = [
  {
    name: "Big Dipper",
    points: [[0,0], [1,0.2], [2,0.5], [3,0.3], [3.5,-0.2], [4.5,-0.5], [5,-1]]
  },
  {
    name: "Cassiopeia",
    points: [[0,0], [0.5,1], [1,0], [1.5,1], [2,0]]
  }
];

// --- Audio Service ---
class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private comboCount: number = 0;
  private volume: number = 0.5;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(value: number) {
    this.volume = value;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
    }
  }

  getVolume() {
    return this.volume;
  }

  playLaunch() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playPop(power: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(power > 1 ? 2000 : 800, this.ctx.currentTime);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3 * (power/2), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start();

    if (Math.random() > 0.7) {
      this.playChime();
    }
    
    this.comboCount++;
    if (this.comboCount % 10 === 0) {
      this.playWhaleSong();
    }
  }

  private playChime() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880 + Math.random() * 440, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 2);
  }

  private playWhaleSong() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 4);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 1);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 4);
  }
}

const audioService = new AudioService();

// --- Main App Component ---
const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [charging, setCharging] = useState(false);
  const [chargeLevel, setChargeLevel] = useState(0);
  const [blessings, setBlessings] = useState<Blessing[]>([]);
  const [combo, setCombo] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [volume, setVolume] = useState(audioService.getVolume());
  
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
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speedStr = (Math.random() * 0.5 + 0.5) * (isOffline ? 5 : 8) * power;
      const speed = speedStr * (0.8 + Math.random() * 0.4);
      
      const p: Particle = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: isOffline ? 2.5 : 1.0 + Math.random() * 1.0,
        color: baseColor,
        size: isOffline ? 3 + Math.random() * 4 : 1.5 + Math.random() * 1.5,
        friction: isOffline ? 0.94 : 0.95,
        gravity: isOffline ? 0.08 : 0.12,
        trail: [],
        behavior: 'normal'
      };
      particles.current.push(p);
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
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#020205'); 
      grad.addColorStop(1, '#08081a');
      ctx.fillStyle = grad;
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
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, `rgba(255,255,255,${p.life})`);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
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
          className={`text-2xl font-serif-elegant tracking-[0.6em] mb-2 transition-colors duration-1000 cursor-pointer pointer-events-auto ${isOffline ? 'text-black/70' : 'text-white/40'} hover:scale-105 active:scale-95 transition-transform`}
          onClick={() => setIsMenuOpen(true)}
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
        <span className={`text-[8px] tracking-[0.4em] font-serif-elegant uppercase ${isOffline ? 'text-black/20' : 'text-white/20'}`}>
          凝神
        </span>
      </div>

      {/* Combo 显示 */}
      {combo > 1 && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-10">
          <span className={`font-serif-elegant text-xs italic tracking-widest ${isOffline ? 'text-black/30' : 'text-white/20'}`}>
            {combo}x 重奏
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
            textShadow: isOffline ? 'none' : '0 0 15px rgba(255,255,255,0.4)'
          }}
        >
          {b.text}
        </div>
      ))}

      {/* 底部状态 - 双击切换模式 */}
      <div 
        className={`absolute bottom-8 right-10 text-[9px] tracking-[0.3em] font-serif-elegant pointer-events-auto cursor-pointer z-10 uppercase transition-opacity hover:opacity-100 opacity-60 ${isOffline ? 'text-black/40' : 'text-white/30'}`}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsOffline(!isOffline);
        }}
        title="双击切换模式"
      >
        {isOffline ? '墨染 / 水墨模式' : '流金 / 星空模式'}
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
              <h2 className="text-sm font-serif-elegant tracking-[0.4em] opacity-60 uppercase mb-4">设置</h2>
              <div className={`h-[1px] w-8 mx-auto ${isOffline ? 'bg-black/20' : 'bg-white/20'}`}></div>
            </div>

            {/* 音量控制 */}
            <div className="flex flex-col gap-4">
              <label className="text-[10px] tracking-[0.3em] uppercase opacity-50 flex justify-between">
                <span>音量</span>
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

            <button 
              onClick={() => setIsMenuOpen(false)}
              className="mt-4 text-[10px] tracking-[0.3em] opacity-30 hover:opacity-100 transition-opacity uppercase"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);