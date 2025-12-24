
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
  '#E0C097', // 浅香槟金
  '#D4AF37', // 典型流金
  '#A3B18A', // 莫兰迪·鼠尾草绿
  '#A8D8EA', // 莫兰迪·冰川蓝
  '#AA96DA', // 莫兰迪·丁香紫
  '#E6BEBB', // 莫兰迪·灰粉
  '#95A5A6', // 莫兰迪·岩石灰
  '#F4EAD5', // 奶油星尘
  '#B85C38', // 陶土红
  '#E0F0FF', // 极寒星光
];

const SUMI_COLORS = [
  '#1a1a1a', // 焦墨
  '#4a4a4a', // 浓墨
  '#8a8a8a', // 淡墨
  '#d4af37', // 洒金
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
  private comboCount: number = 0;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playLaunch() {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playPop(power: number) {
    this.init();
    if (!this.ctx) return;

    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(power > 1.5 ? 2000 : 1000, this.ctx.currentTime);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2 * (power/2), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();

    if (Math.random() > 0.8) this.playChime();
    
    this.comboCount++;
    if (this.comboCount % 8 === 0) this.playAmbient();
  }

  private playChime() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880 + Math.random() * 440, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  private playAmbient() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 3);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 1);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 3);
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
  
  const lastFireTime = useRef(0);
  const lastTitleClickTime = useRef(0);
  const particles = useRef<Particle[]>([]);
  const projectiles = useRef<FireworkProjectile[]>([]);
  const backgroundStars = useRef<{x: number, y: number, s: number, a: number, t: number, speed: number}[]>([]);
  const requestRef = useRef<number>();

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
    const count = Math.floor(power * 55 + 35);
    const particlePool = isOffline ? SUMI_COLORS : COLORS;
    const finalColor = isOffline ? particlePool[Math.floor(Math.random() * particlePool.length)] : color;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const speed = (Math.random() * 3.5 + 3) * power;
      
      const p: Particle = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: isOffline ? 2.8 : 1.3 + Math.random() * 0.9,
        color: finalColor,
        size: isOffline ? 4 + Math.random() * 5 : 2 + Math.random() * 1.8,
        friction: isOffline ? 0.93 : 0.965,
        gravity: isOffline ? 0.09 : 0.24,
        trail: []
      };
      particles.current.push(p);
    }

    if (power > 1.8 && !isOffline) {
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.5 * power;
        particles.current.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1, maxLife: 2.2, color: 'rgba(255,255,255,0.35)', size: 0.9,
          friction: 0.92, gravity: 0.06, trail: [], wobbleSpeed: 0.04, wobbleTheta: Math.random() * Math.PI * 2
        });
      }
    }

    if (Math.random() > 0.92 && !isOffline) {
      const constellation = CONSTELLATIONS[Math.floor(Math.random() * CONSTELLATIONS.length)];
      const scale = 22 * power;
      const rotation = Math.random() * Math.PI * 2;
      const cosR = Math.cos(rotation), sinR = Math.sin(rotation);

      constellation.points.forEach(([px, py]) => {
        particles.current.push({
          x: x + (px * cosR - py * sinR) * scale,
          y: y + (px * sinR + py * cosR) * scale,
          vx: 0, vy: 0, life: 1, maxLife: 4.5, color: '#FFFFFF', size: 2.8, friction: 0.99, gravity: 0, trail: []
        });
      });
    }

    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setBlessings(prev => [...prev.slice(-2), { text: quote, opacity: 1, y: y - 100, id: Date.now() }]);
    audioService.playPop(power);
  }, [isOffline]);

  const launchFirework = useCallback((x: number, y: number, power: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const color = isOffline ? '#222' : COLORS[Math.floor(Math.random() * COLORS.length)];
    const projectile: FireworkProjectile = {
      x: canvas.width / 2 + (Math.random() - 0.5) * 60,
      y: canvas.height + 20,
      targetY: y,
      vx: (x - canvas.width / 2) / 68,
      vy: -15 - power * 3.5,
      color, power, trail: [], active: true
    };
    projectiles.current.push(projectile);
    audioService.playLaunch();

    const now = Date.now();
    if (now - lastFireTime.current < 2800) {
      setCombo(c => c + 1);
    } else {
      setCombo(1);
    }
    lastFireTime.current = now;
  }, [isOffline]);

  const update = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    
    if (isOffline) {
      ctx.fillStyle = '#f6f2e9';
      ctx.fillRect(0, 0, width, height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#010104');
      grad.addColorStop(1, '#050514');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      backgroundStars.current.forEach(star => {
        star.t += star.speed;
        const alpha = star.a * (0.25 + Math.sin(star.t) * 0.75);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    projectiles.current = projectiles.current.filter(p => p.active);
    projectiles.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.25;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 25) p.trail.shift();

      ctx.beginPath();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = isOffline ? 4.5 : 1.8;
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

    particles.current = particles.current.filter(p => p.life > 0);
    particles.current.forEach(p => {
      p.vx *= p.friction; p.vy *= p.friction; p.vy += p.gravity;
      if (p.wobbleSpeed) {
        p.wobbleTheta! += p.wobbleSpeed;
        p.x += Math.sin(p.wobbleTheta!) * 0.35;
      }
      p.x += p.vx; p.y += p.vy;
      p.life -= 1 / (60 * p.maxLife);

      if (p.life > 0) {
        ctx.fillStyle = p.color;
        const alpha = isOffline ? p.life * 0.85 : Math.pow(p.life, 2);
        ctx.globalAlpha = alpha;
        
        ctx.beginPath();
        const size = Math.max(0.1, p.size * (isOffline ? p.life : p.life * 1.6));
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

  useEffect(() => {
    let timer: number;
    if (charging) {
      timer = window.setInterval(() => setChargeLevel(p => Math.min(p + 0.045, 3)), 30);
    }
    return () => clearInterval(timer);
  }, [charging]);

  const handleTitleClick = () => {
    const now = Date.now();
    if (now - lastTitleClickTime.current < 400) {
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
        ...b, y: b.y - 0.45, opacity: b.opacity - 0.0035
      })).filter(b => b.opacity > 0));
    }, 16);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className={`relative w-full h-screen overflow-hidden transition-colors duration-1000 ${isOffline ? 'bg-[#f6f2e9]' : 'bg-[#010104]'}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair" />
      
      <div className="absolute top-16 left-0 right-0 pointer-events-none flex flex-col items-center select-none z-10">
        <h1 
          className={`text-2xl font-serif-elegant tracking-[0.6em] mb-2 transition-colors duration-1000 cursor-pointer pointer-events-auto ${isOffline ? 'text-black/75' : 'text-white/30'}`}
          onClick={handleTitleClick}
        >
          {isOffline ? '墨 · 染' : '星 愿 · 夜 穹'}
        </h1>
        <div className={`h-[1px] w-14 transition-colors duration-1000 ${isOffline ? 'bg-black/10' : 'bg-white/10'}`}></div>
      </div>

      <div className={`absolute bottom-24 left-1/2 -translate-x-1/2 w-44 flex flex-col items-center gap-2 z-20 transition-opacity duration-300 ${charging ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`h-[1px] w-full relative overflow-hidden ${isOffline ? 'bg-black/10' : 'bg-white/10'}`}>
          <div 
            className={`h-full absolute left-0 transition-all duration-75 ${isOffline ? 'bg-black/50' : 'bg-white/50'}`} 
            style={{ width: `${(chargeLevel / 3) * 100}%` }} 
          />
        </div>
        <span className={`text-[8px] tracking-[0.4em] font-serif-elegant uppercase ${isOffline ? 'text-black/20' : 'text-white/20'}`}>
          Focusing Intent
        </span>
      </div>

      {combo > 1 && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-10">
          <span className={`font-serif-elegant text-xs italic tracking-[0.3em] ${isOffline ? 'text-black/20' : 'text-white/15'}`}>
            {combo}x Resonance
          </span>
        </div>
      )}

      {blessings.map(b => (
        <div 
          key={b.id}
          className="blessing-text absolute left-1/2 pointer-events-none font-serif-elegant text-xl whitespace-nowrap z-10"
          style={{ 
            top: `${b.y}px`, 
            opacity: b.opacity,
            color: isOffline ? '#111' : '#eee',
            textShadow: isOffline ? 'none' : '0 0 20px rgba(255,255,255,0.15)'
          }}
        >
          {b.text}
        </div>
      ))}

      <div className={`absolute bottom-8 right-10 text-[8px] tracking-[0.4em] font-serif-elegant pointer-events-none z-10 uppercase ${isOffline ? 'text-black/15' : 'text-white/10'}`}>
        {isOffline ? 'Traditional Ink Mode' : 'Gilded Celestial Domain'}
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
