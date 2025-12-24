
export interface Point {
  x: number;
  y: number;
}

export interface Particle {
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
  shape?: 'star' | 'circle' | 'heart' | 'gold-dust';
}

export interface FireworkProjectile {
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

export interface Blessing {
  text: string;
  opacity: number;
  y: number;
  id: number;
  scale?: number;
}

export interface HolidayConfig {
  id: string;
  name: string;
  match: (date: Date) => boolean;
  themeColor: string;
  specialColors: string[];
  specialQuotes: string[];
  firstLaunchEffect?: boolean;
}
