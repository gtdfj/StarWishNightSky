
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
      this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.1);
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
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playPop(power: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

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
    gain.connect(this.masterGain);
    
    noise.start();

    if (Math.random() > 0.8) this.playChime();
    
    this.comboCount++;
    if (this.comboCount % 8 === 0) this.playAmbient();
  }

  private playChime() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880 + Math.random() * 440, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  private playAmbient() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 3);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 1);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 3);
    osc.connect(gain);
    gain.connect(this.masterGain);
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [volume, setVolume] = useState(audioService.getVolume());
  
  const lastFireTime = useRef(0);
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
    const particlePool = isOffline ? SUMI_COLORS : COLORS;
    const finalColor = isOffline ? particlePool[Math.floor(Math.random() * particlePool.length)] : color;

    if (!isOffline) {
        particles.current.push({
          x, y, vx: 0, vy: 0, life: 1, maxLife: 0.1, 
          color: '#FFFFFF', size: power * 80 + 20, 
          friction: 1, gravity: 0, trail: [], 
          behavior: 'flash'
        });
    }

    const count = Math.floor(power * 100 + 40);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() * 0.2);
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
        gravity: isOffline ? 0.09 : 0.22,
        trail: [],
        behavior: 'normal'
      };
      particles.current.push(p);
    }

    if (!isOffline && power > 0.6) {
      const sparkleCount = Math.floor(power * 50);
      for (let i = 0; i < sparkleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 2.5 + 2) * power;
        particles.current.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1, maxLife: 1.5 + Math.random(), color: '#ffffff', size: 0.9,
          friction: 0.96, gravity: 0.08, trail: [], behavior: 'spark'
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
          vx: 0, vy: 0, life: 1, maxLife: 4.5, color: '#FFFFFF', size: 2.8, friction: 0.99, gravity: 0, trail: [], behavior: 'normal'
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
      vx: (x - canvas.width / 2) / 70,
      vy: -15 - power * 4,
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

      ctx.globalCompositeOperation = 'lighter';
      backgroundStars.current.forEach(star => {
        star.t += star.speed;
        const alpha = star.a * (0.25 + Math.sin(star.t) * 0.75);
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
      p.x += p.vx; p.y += p.vy; p.vy += 0.25;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 20) p.trail.shift();

      ctx.beginPath();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = isOffline ? 4.5 : 2;
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
        let alpha = isOffline ? p.life * 0.85 : Math.pow(p.life, 2);
        if (!isOffline && p.behavior === 'spark') {
            if (Math.random() > 0.8) alpha *= 1.4;
            else if (Math.random() < 0.2) alpha *= 0.6;
        }
        ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
        
        ctx.beginPath();
        const velocity = Math.hypot(p.vx, p.vy);

        if (!isOffline && velocity > 1.2 && p.behavior !== 'normal') {
            ctx.lineWidth = p.size;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
            ctx.stroke();
        } else {
            const size = Math.max(0.1, p.size * (isOffline ? p.life : p.life * 1.6));
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
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
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    resize();
    requestRef