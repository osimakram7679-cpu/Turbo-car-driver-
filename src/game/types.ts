export type GameStatus = 'menu' | 'countdown' | 'playing' | 'paused' | 'gameover';

export type CameraMode = 'chase' | 'far' | 'hood';

export type TrackThemeId = 'sunset' | 'midnight' | 'coastal';

export type CarId = 'crimson' | 'cobalt' | 'amber' | 'phantom';

export interface UpgradeLevels {
  engine: number;   // 0..3
  handling: number; // 0..3
  nitro: number;    // 0..3
}

export interface CarSpec {
  id: CarId;
  name: string;
  subtitle: string;
  bodyColor: string;
  accentColor: string;
  hexBody: number;
  hexAccent: number;
  topSpeedKmh: number;
  handling: number;
  nitroCapacity: number;
}

export interface PaintSwatch {
  id: string;
  name: string;
  css: string;
  hex: number;
}

export interface TrackTheme {
  id: TrackThemeId;
  name: string;
  skyTop: string;
  skyHorizon: string;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  groundColor: number;
  asphaltTint: string;
  streetLightsOn: boolean;
  sunOrbColor: number;
}

export interface GameHudState {
  status: GameStatus;
  countdownValue: number; // 3, 2, 1, 0 (GO)
  score: number;
  bestScore: number;
  distanceKm: number;
  nextCheckpointM: number;
  speedKmh: number;
  gear: number;
  rpmRatio: number; // 0..1 for tachometer arc
  nitro: number; // 0 to 100
  isBoosting: boolean;
  armor: number;
  maxArmor: number;
  coins: number;
  totalCoins: number;
  nearMisses: number;
  comboMultiplier: number;
  magnetRemaining: number; // seconds left
  topSpeedReached: number;
  eventBanner: string | null;
}

export const PAINT_SWATCHES: PaintSwatch[] = [
  { id: 'crimson', name: 'Crimson', css: '#E11D48', hex: 0xe11d48 },
  { id: 'cobalt', name: 'Cobalt', css: '#0284C7', hex: 0x0284c7 },
  { id: 'amber', name: 'Solar', css: '#D97706', hex: 0xd97706 },
  { id: 'emerald', name: 'Emerald', css: '#10B981', hex: 0x10b981 },
  { id: 'obsidian', name: 'Obsidian', css: '#334155', hex: 0x334155 },
  { id: 'pearl', name: 'Pearl', css: '#F1F5F9', hex: 0xf1f5f9 },
];

export const CAR_SPECS: CarSpec[] = [
  {
    id: 'crimson',
    name: 'Apex GT',
    subtitle: 'Balanced Aero Coupe',
    bodyColor: '#E11D48',
    accentColor: '#FDA4AF',
    hexBody: 0xe11d48,
    hexAccent: 0x111827,
    topSpeedKmh: 285,
    handling: 1.06,
    nitroCapacity: 1.0,
  },
  {
    id: 'cobalt',
    name: 'Veloce RS',
    subtitle: 'Precision Track Edition',
    bodyColor: '#0284C7',
    accentColor: '#38BDF8',
    hexBody: 0x0284c7,
    hexAccent: 0x0f172a,
    topSpeedKmh: 278,
    handling: 1.24,
    nitroCapacity: 1.1,
  },
  {
    id: 'amber',
    name: 'Titan V8',
    subtitle: 'Twin-Turbo Muscle',
    bodyColor: '#D97706',
    accentColor: '#FCD34D',
    hexBody: 0xd97706,
    hexAccent: 0x18181b,
    topSpeedKmh: 306,
    handling: 0.96,
    nitroCapacity: 1.2,
  },
  {
    id: 'phantom',
    name: 'Phantom X',
    subtitle: 'Prototype Hypercar',
    bodyColor: '#10B981',
    accentColor: '#6EE7B7',
    hexBody: 0x10b981,
    hexAccent: 0x090d16,
    topSpeedKmh: 320,
    handling: 1.18,
    nitroCapacity: 1.28,
  },
];

export const TRACK_THEMES: TrackTheme[] = [
  {
    id: 'sunset',
    name: 'Sunset Canyon',
    skyTop: '#1A1330',
    skyHorizon: '#D96B43',
    fogColor: 0x9b4d44,
    fogDensity: 0.0042,
    sunColor: 0xffb37b,
    sunIntensity: 2.35,
    hemiSky: 0xff9e7d,
    hemiGround: 0x3b2621,
    hemiIntensity: 0.85,
    groundColor: 0x4b2f24,
    asphaltTint: '#1E2028',
    streetLightsOn: true,
    sunOrbColor: 0xff8c42,
  },
  {
    id: 'midnight',
    name: 'Midnight Express',
    skyTop: '#040711',
    skyHorizon: '#142038',
    fogColor: 0x0d1526,
    fogDensity: 0.0046,
    sunColor: 0x8ab4f8,
    sunIntensity: 1.4,
    hemiSky: 0x334e7d,
    hemiGround: 0x0b0f19,
    hemiIntensity: 0.78,
    groundColor: 0x101726,
    asphaltTint: '#161922',
    streetLightsOn: true,
    sunOrbColor: 0xdbeafe,
  },
  {
    id: 'coastal',
    name: 'Coastal Daylight',
    skyTop: '#1D6FA5',
    skyHorizon: '#98D4EC',
    fogColor: 0x8bc8e2,
    fogDensity: 0.0035,
    sunColor: 0xfff5db,
    sunIntensity: 2.45,
    hemiSky: 0xbfe6ff,
    hemiGround: 0x4b5c43,
    hemiIntensity: 0.95,
    groundColor: 0x3f5438,
    asphaltTint: '#252932',
    streetLightsOn: false,
    sunOrbColor: 0xfef08a,
  },
];

export const UPGRADE_COSTS = [10, 25, 45];
