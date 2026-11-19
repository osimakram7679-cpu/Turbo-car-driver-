import { Coins, Flame, Gauge, Play, RotateCcw, Trophy, Zap } from 'lucide-react';
import {
  CAR_SPECS,
  CarId,
  GameHudState,
  PAINT_SWATCHES,
  TRACK_THEMES,
  TrackThemeId,
  UPGRADE_COSTS,
  UpgradeLevels,
} from '../game/types';

interface MenuOverlayProps {
  hud: GameHudState;
  selectedCar: CarId;
  selectedPaintHex: number | null;
  selectedTheme: TrackThemeId;
  upgrades: UpgradeLevels;
  onSelectCar: (id: CarId) => void;
  onSelectPaint: (hex: number) => void;
  onSelectTheme: (id: TrackThemeId) => void;
  onPurchaseUpgrade: (kind: keyof UpgradeLevels, cost: number) => void;
  onStartRace: () => void;
  onResume: () => void;
  onReturnToMenu: () => void;
}

export function MenuOverlay({
  hud,
  selectedCar,
  selectedPaintHex,
  selectedTheme,
  upgrades,
  onSelectCar,
  onSelectPaint,
  onSelectTheme,
  onPurchaseUpgrade,
  onStartRace,
  onResume,
  onReturnToMenu,
}: MenuOverlayProps) {
  if (hud.status === 'playing' || hud.status === 'countdown') return null;

  if (hud.status === 'paused') {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/55 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0B0F17]/95 p-6 shadow-2xl">
          <h2 className="font-display text-2xl font-bold text-white">Race Paused</h2>
          <p className="mt-1 text-sm text-slate-400">
            Take a breather or jump straight back onto the highway.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 whitespace-nowrap"
            >
              <Play className="h-4 w-4" />
              <span>Resume Race</span>
            </button>
            <button
              type="button"
              onClick={onStartRace}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700 whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Restart</span>
            </button>
            <button
              type="button"
              onClick={onReturnToMenu}
              className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-white whitespace-nowrap"
            >
              Back to Garage
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hud.status === 'gameover') {
    const isNewRecord = hud.score > 0 && hud.score >= hud.bestScore;
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0B0F17]/95 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                {isNewRecord ? 'New High Score' : 'Run Complete'}
              </h2>
              <p className="mt-0.5 text-sm text-slate-400">
                {isNewRecord
                  ? 'You set a new personal best on the highway.'
                  : 'Your armor gave out after heavy traffic contact.'}
              </p>
            </div>
            <Trophy
              className={`h-8 w-8 shrink-0 ${
                isNewRecord ? 'text-amber-400' : 'text-slate-500'
              }`}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <div>
              <div className="text-xs text-slate-400">Final Score</div>
              <div className="font-telemetry text-2xl font-bold text-white">
                {hud.score.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Best Score</div>
              <div className="font-telemetry text-2xl font-bold text-amber-400">
                {hud.bestScore.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Distance</div>
              <div className="font-telemetry text-base font-semibold text-slate-200">
                {hud.distanceKm.toFixed(2)} km
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Top Speed</div>
              <div className="font-telemetry text-base font-semibold text-cyan-300">
                {hud.topSpeedReached} km/h
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Near Misses</div>
              <div className="font-telemetry text-base font-semibold text-slate-200">
                {hud.nearMisses}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Coins Earned</div>
              <div className="font-telemetry text-base font-semibold text-amber-300">
                +{hud.coins} ({hud.totalCoins} bank)
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onStartRace}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Race Again</span>
            </button>
            <button
              type="button"
              onClick={onReturnToMenu}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 whitespace-nowrap"
            >
              Garage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === START / GARAGE MENU ===
  const upgradeItems: Array<{
    key: keyof UpgradeLevels;
    label: string;
    bonusText: string;
    icon: typeof Gauge;
  }> = [
    { key: 'engine', label: 'Twin-Turbo Engine', bonusText: '+14 km/h', icon: Gauge },
    { key: 'handling', label: 'Aero Suspension', bonusText: '+9% steer', icon: Zap },
    { key: 'nitro', label: 'Nitro Reserve', bonusText: '+14% tank', icon: Flame },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-center p-4 sm:items-center sm:p-6">
      <div className="pointer-events-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0B0F17]/92 p-5 shadow-2xl sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Apex Velocity
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Weave through traffic, chain near-misses, and upgrade your ride.
            </p>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-[11px] text-slate-400">Coin Bank</div>
              <div className="flex items-center justify-end gap-1 font-telemetry text-base font-bold text-amber-300">
                <Coins className="h-4 w-4 text-amber-400" />
                <span>{hud.totalCoins}</span>
              </div>
            </div>
            {hud.bestScore > 0 && (
              <>
                <div className="h-7 w-px bg-white/10" />
                <div>
                  <div className="text-[11px] text-slate-400">Best Score</div>
                  <div className="font-telemetry text-base font-bold text-white">
                    {hud.bestScore.toLocaleString()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Select Car */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-slate-400">
              Select Vehicle
            </span>
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-[11px] text-slate-400">Paint</span>
              {PAINT_SWATCHES.map((swatch) => {
                const isSelected = selectedPaintHex === swatch.hex;
                return (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => onSelectPaint(swatch.hex)}
                    title={swatch.name}
                    aria-label={`Paint ${swatch.name}`}
                    className={`h-4 w-4 rounded-full border transition-transform ${
                      isSelected
                        ? 'scale-125 border-white'
                        : 'border-white/30 hover:scale-110'
                    }`}
                    style={{ backgroundColor: swatch.css }}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {CAR_SPECS.map((car) => {
              const active = selectedCar === car.id;
              return (
                <button
                  key={car.id}
                  type="button"
                  onClick={() => onSelectCar(car.id)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? 'border-white/55 bg-slate-800/95 text-white'
                      : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/25 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-white">
                      {car.name}
                    </span>
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-white/30"
                      style={{ backgroundColor: car.bodyColor }}
                    />
                  </div>
                  <span className="mt-0.5 text-[11px] text-slate-400">
                    {car.subtitle}
                  </span>
                  <div className="mt-2 flex items-center gap-1.5 font-telemetry text-[11px] text-slate-300">
                    <span>{car.topSpeedKmh + upgrades.engine * 14} km/h</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Performance Upgrades */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-400">
            Garage Upgrades
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {upgradeItems.map((item) => {
              const level = upgrades[item.key];
              const isMax = level >= 3;
              const cost = isMax ? 0 : UPGRADE_COSTS[level];
              const canAfford = !isMax && hud.totalCoins >= cost;
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/65 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((pip) => (
                          <span
                            key={pip}
                            className={`h-1.5 w-4 rounded-sm ${
                              pip < level ? 'bg-cyan-400' : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-telemetry text-[10px] text-slate-400">
                        {item.bonusText}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isMax || !canAfford}
                    onClick={() => onPurchaseUpgrade(item.key, cost)}
                    className={`shrink-0 rounded-md px-2.5 py-1.5 font-telemetry text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      isMax
                        ? 'bg-slate-800 text-emerald-400'
                        : canAfford
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isMax ? 'MAX' : `${cost}c`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Select Track Atmosphere */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-400">
            Track Atmosphere
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TRACK_THEMES.map((theme) => {
              const active = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelectTheme(theme.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'border-cyan-400/70 bg-cyan-950/50 text-white'
                      : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm border border-white/20"
                    style={{
                      background: `linear-gradient(180deg, ${theme.skyTop}, ${theme.skyHorizon})`,
                    }}
                  />
                  <span className="truncate">{theme.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary CTA + Controls Summary */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span>Steer: A/D or Arrows</span>
            <span aria-hidden="true">·</span>
            <span>Nitro: Space / W</span>
            <span aria-hidden="true">·</span>
            <span>Brake: S</span>
          </div>

          <button
            type="button"
            onClick={onStartRace}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 whitespace-nowrap shrink-0"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Start Race</span>
          </button>
        </div>
      </div>
    </div>
  );
}
