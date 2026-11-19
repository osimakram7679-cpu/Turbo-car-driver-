import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { MenuOverlay } from './components/MenuOverlay';
import { soundEngine } from './game/audio';
import { HighwayEngine } from './game/HighwayEngine';
import {
  CameraMode,
  CarId,
  CAR_SPECS,
  GameHudState,
  TrackThemeId,
  UpgradeLevels,
} from './game/types';

const INITIAL_HUD: GameHudState = {
  status: 'menu',
  countdownValue: 3,
  score: 0,
  bestScore: 0,
  distanceKm: 0,
  nextCheckpointM: 500,
  speedKmh: 122,
  gear: 3,
  rpmRatio: 0.45,
  nitro: 100,
  isBoosting: false,
  armor: 3,
  maxArmor: 3,
  coins: 0,
  totalCoins: 0,
  nearMisses: 0,
  comboMultiplier: 1,
  magnetRemaining: 0,
  topSpeedReached: 0,
  eventBanner: null,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<HighwayEngine | null>(null);

  const [hud, setHud] = useState<GameHudState>(INITIAL_HUD);
  const [selectedCar, setSelectedCar] = useState<CarId>('crimson');
  const [selectedPaintHex, setSelectedPaintHex] = useState<number | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<TrackThemeId>('sunset');
  const [upgrades, setUpgrades] = useState<UpgradeLevels>({
    engine: 0,
    handling: 0,
    nitro: 0,
  });
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [muted, setMuted] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const engine = new HighwayEngine(
      el,
      (nextHud) => setHud(nextHud),
      (lost) => setContextLost(lost),
    );
    engineRef.current = engine;
    setUpgrades(engine.getUpgrades());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    soundEngine.unlock();
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleCycleCamera = useCallback(() => {
    if (!engineRef.current) return;
    setCameraMode(engineRef.current.cycleCamera());
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleStartRace = useCallback(() => {
    engineRef.current?.startRace();
  }, []);

  const handleReturnToMenu = useCallback(() => {
    engineRef.current?.returnToMenu();
  }, []);

  const handleSelectCar = useCallback((id: CarId) => {
    setSelectedCar(id);
    const spec = CAR_SPECS.find((c) => c.id === id);
    if (spec) {
      setSelectedPaintHex(spec.hexBody);
      engineRef.current?.setPaint(null);
    }
    engineRef.current?.setCar(id);
  }, []);

  const handleSelectPaint = useCallback((hex: number) => {
    setSelectedPaintHex(hex);
    engineRef.current?.setPaint(hex);
  }, []);

  const handleSelectTheme = useCallback((id: TrackThemeId) => {
    setSelectedTheme(id);
    engineRef.current?.setTheme(id);
  }, []);

  const handlePurchaseUpgrade = useCallback((kind: keyof UpgradeLevels, cost: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.purchaseUpgrade(kind, cost)) {
      setUpgrades(engine.getUpgrades());
    }
  }, []);

  const handleTouchInput = useCallback(
    (key: 'left' | 'right' | 'boost' | 'brake', pressed: boolean) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.input[key] = pressed;
    },
    [],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') {
        engine.input.left = true;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        engine.input.right = true;
      } else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
        if (code === 'Space') e.preventDefault();
        engine.input.boost = true;
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        engine.input.brake = true;
      } else if (code === 'KeyC' && !e.repeat) {
        setCameraMode(engine.cycleCamera());
      } else if ((code === 'Escape' || code === 'KeyP') && !e.repeat) {
        engine.togglePause();
      } else if (code === 'KeyM' && !e.repeat) {
        handleToggleMute();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') {
        engine.input.left = false;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        engine.input.right = false;
      } else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
        engine.input.boost = false;
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        engine.input.brake = false;
      }
    };

    const onBlur = () => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.input.left = false;
      engine.input.right = false;
      engine.input.boost = false;
      engine.input.brake = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleToggleMute]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#080B12]">
      <div ref={mountRef} className="h-full w-full" />

      {contextLost && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#080B12]/95 p-6">
          <div className="max-w-sm rounded-xl border border-white/15 bg-slate-900 p-6 text-center">
            <h2 className="font-display text-xl font-bold text-white">
              Graphics Context Paused
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              WebGL rendering was interrupted by the browser. Reload or wait for recovery to continue racing.
            </p>
          </div>
        </div>
      )}

      <GameHUD
        hud={hud}
        cameraMode={cameraMode}
        muted={muted}
        onToggleMute={handleToggleMute}
        onCycleCamera={handleCycleCamera}
        onTogglePause={handleTogglePause}
        onTouchInput={handleTouchInput}
      />

      <MenuOverlay
        hud={hud}
        selectedCar={selectedCar}
        selectedPaintHex={selectedPaintHex}
        selectedTheme={selectedTheme}
        upgrades={upgrades}
        onSelectCar={handleSelectCar}
        onSelectPaint={handleSelectPaint}
        onSelectTheme={handleSelectTheme}
        onPurchaseUpgrade={handlePurchaseUpgrade}
        onStartRace={handleStartRace}
        onResume={handleTogglePause}
        onReturnToMenu={handleReturnToMenu}
      />
    </main>
  );
}
