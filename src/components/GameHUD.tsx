import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  Magnet,
  Pause,
  Play,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CameraMode, GameHudState } from '../game/types';

interface GameHUDProps {
  hud: GameHudState;
  cameraMode: CameraMode;
  muted: boolean;
  onToggleMute: () => void;
  onCycleCamera: () => void;
  onTogglePause: () => void;
  onTouchInput: (key: 'left' | 'right' | 'boost' | 'brake', pressed: boolean) => void;
}

const CAMERA_LABELS: Record<CameraMode, string> = {
  chase: 'Chase',
  far: 'Far',
  hood: 'Hood',
};

export function GameHUD({
  hud,
  cameraMode,
  muted,
  onToggleMute,
  onCycleCamera,
  onTogglePause,
  onTouchInput,
}: GameHUDProps) {
  const isPlaying =
    hud.status === 'playing' ||
    hud.status === 'paused' ||
    hud.status === 'countdown';

  // SVG Tachometer Arc Math
  const radius = 26;
  const circumference = Math.PI * radius; // semicircle
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0.08, hud.rpmRatio)));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Subtle Cyan Edge Glow During Nitro Boost (non-blocking) */}
      {hud.status === 'playing' && hud.isBoosting && (
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            boxShadow: 'inset 0 0 90px rgba(6, 182, 212, 0.28)',
          }}
        />
      )}

      {/* Top Bar: Score/Armor Left · Utility Actions Right */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        {isPlaying ? (
          <div className="pointer-events-auto flex flex-col gap-2 rounded-xl border border-white/10 bg-[#0B0F17]/90 px-4 py-3 shadow-lg">
            <div className="flex items-baseline gap-4">
              <div>
                <div className="text-[11px] font-medium tracking-wide text-slate-400">
                  Score
                </div>
                <div className="font-telemetry text-2xl font-bold leading-none text-white sm:text-3xl">
                  {hud.score.toLocaleString()}
                </div>
              </div>

              <div className="h-7 w-px bg-white/10" />

              <div>
                <div className="text-[11px] font-medium tracking-wide text-slate-400">
                  Distance
                </div>
                <div className="font-telemetry text-base font-semibold leading-tight text-slate-200">
                  {hud.distanceKm.toFixed(2)} km
                </div>
              </div>

              {hud.comboMultiplier > 1 && (
                <>
                  <div className="h-7 w-px bg-white/10" />
                  <div>
                    <div className="text-[11px] font-medium tracking-wide text-amber-400">
                      Combo
                    </div>
                    <div className="font-telemetry text-base font-bold leading-tight text-amber-400">
                      {hud.comboMultiplier}x
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-0.5">
              <div className="flex items-center gap-1.5" aria-label={`Armor ${hud.armor} of ${hud.maxArmor}`}>
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <div className="flex gap-1">
                  {Array.from({ length: hud.maxArmor }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-2 w-6 rounded-sm transition-colors ${
                        idx < hud.armor ? 'bg-emerald-400' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-telemetry text-amber-300">{hud.coins} coins</span>
                <span aria-hidden="true">·</span>
                <span className="font-telemetry">CP {hud.nextCheckpointM}m</span>
                <span aria-hidden="true">·</span>
                <span className="font-telemetry">Best {hud.bestScore.toLocaleString()}</span>
              </div>
            </div>

            {hud.magnetRemaining > 0 && (
              <div className="flex items-center gap-2 border-t border-white/10 pt-1.5 text-xs text-purple-300">
                <Magnet className="h-3.5 w-3.5 text-purple-400" />
                <span>Coin Magnet Active</span>
                <span className="font-telemetry font-semibold text-purple-200">
                  {hud.magnetRemaining.toFixed(1)}s
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="pointer-events-auto rounded-xl border border-white/10 bg-[#0B0F17]/90 px-4 py-2.5">
            <span className="font-display text-lg font-bold tracking-wide text-white">
              Apex Velocity
            </span>
          </div>
        )}

        {/* Top-Right Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCycleCamera}
            className="flex min-h-[40px] items-center gap-2 rounded-lg border border-white/10 bg-[#0B0F17]/90 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
            title="Switch Camera (C)"
          >
            <Camera className="h-4 w-4 text-cyan-400" />
            <span>{CAMERA_LABELS[cameraMode]}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-white/10 bg-[#0B0F17]/90 px-2.5 py-2 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-slate-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            )}
          </button>

          {(hud.status === 'playing' || hud.status === 'paused') && (
            <button
              type="button"
              onClick={onTogglePause}
              className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0F17]/90 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
              title="Pause (P / Esc)"
            >
              {hud.status === 'paused' ? (
                <>
                  <Play className="h-4 w-4 text-emerald-400" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 text-amber-400" />
                  <span>Pause</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Center Countdown or Event Banner */}
      <div className="pointer-events-none relative z-10 flex flex-col items-center justify-center">
        {hud.status === 'countdown' && hud.countdownValue > 0 && (
          <div className="rounded-2xl border border-white/15 bg-[#0B0F17]/85 px-8 py-4 text-center shadow-2xl">
            <div className="text-xs font-semibold tracking-widest text-slate-400">
              Get Ready
            </div>
            <div className="font-display text-6xl font-bold text-amber-400 sm:text-7xl">
              {hud.countdownValue}
            </div>
          </div>
        )}

        {hud.status === 'playing' && hud.eventBanner && (
          <div className="rounded-lg border border-amber-400/35 bg-[#0B0F17]/92 px-4 py-1.5 font-display text-sm font-bold tracking-wider text-amber-300 shadow-lg">
            {hud.eventBanner}
          </div>
        )}
      </div>

      {/* Bottom Speedometer & Touch Controls */}
      {isPlaying && (
        <div className="relative z-10 flex flex-col items-center gap-3">
          {/* Touch Controls Row for Mobile / Pointer */}
          <div className="pointer-events-auto flex w-full max-w-2xl items-center justify-between gap-3 md:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={() => onTouchInput('left', true)}
                onPointerUp={() => onTouchInput('left', false)}
                onPointerLeave={() => onTouchInput('left', false)}
                onPointerCancel={() => onTouchInput('left', false)}
                className="flex h-14 w-16 items-center justify-center rounded-xl border border-white/15 bg-[#0B0F17]/90 text-white active:bg-slate-700"
                aria-label="Steer Left"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onPointerDown={() => onTouchInput('right', true)}
                onPointerUp={() => onTouchInput('right', false)}
                onPointerLeave={() => onTouchInput('right', false)}
                onPointerCancel={() => onTouchInput('right', false)}
                className="flex h-14 w-16 items-center justify-center rounded-xl border border-white/15 bg-[#0B0F17]/90 text-white active:bg-slate-700"
                aria-label="Steer Right"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={() => onTouchInput('brake', true)}
                onPointerUp={() => onTouchInput('brake', false)}
                onPointerLeave={() => onTouchInput('brake', false)}
                onPointerCancel={() => onTouchInput('brake', false)}
                className="flex h-14 items-center justify-center rounded-xl border border-rose-500/30 bg-[#0B0F17]/90 px-4 text-xs font-semibold text-rose-300 active:bg-rose-950"
              >
                Brake
              </button>
              <button
                type="button"
                onPointerDown={() => onTouchInput('boost', true)}
                onPointerUp={() => onTouchInput('boost', false)}
                onPointerLeave={() => onTouchInput('boost', false)}
                onPointerCancel={() => onTouchInput('boost', false)}
                className="flex h-14 items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-4 text-xs font-bold text-cyan-200 active:bg-cyan-500/40"
              >
                <Flame className="h-4 w-4 text-cyan-300" />
                <span>Nitro</span>
              </button>
            </div>
          </div>

          {/* Unified Bottom Telemetry Dock with RPM Arc */}
          <div className="pointer-events-auto flex w-full max-w-lg items-center justify-between gap-5 rounded-xl border border-white/10 bg-[#0B0F17]/90 px-5 py-3 shadow-xl">
            <div className="flex items-center gap-3">
              {/* Semicircle RPM Gauge */}
              <svg width="64" height="38" viewBox="0 0 64 38" className="shrink-0">
                <path
                  d="M 6 32 A 26 26 0 0 1 58 32"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 6 32 A 26 26 0 0 1 58 32"
                  fill="none"
                  stroke={hud.isBoosting ? '#22D3EE' : hud.rpmRatio > 0.85 ? '#F43F5E' : '#F59E0B'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
                <text
                  x="32"
                  y="32"
                  textAnchor="middle"
                  className="fill-amber-400 font-telemetry text-[11px] font-bold"
                >
                  G{hud.gear}
                </text>
              </svg>

              <div className="flex items-baseline gap-1.5">
                <span
                  className={`font-display text-3xl font-bold leading-none sm:text-4xl ${
                    hud.isBoosting ? 'text-cyan-400' : 'text-white'
                  }`}
                >
                  {hud.speedKmh}
                </span>
                <span className="text-xs font-medium text-slate-400">km/h</span>
              </div>
            </div>

            {/* Nitro Gauge */}
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span className="flex items-center gap-1 text-slate-300">
                  <Flame className="h-3.5 w-3.5 text-cyan-400" />
                  Nitro
                </span>
                <span className="font-telemetry text-cyan-300">{hud.nitro}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-[width] duration-75 ${
                    hud.isBoosting ? 'bg-cyan-300' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${hud.nitro}%` }}
                />
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-slate-300/80 md:flex">
            <span>A / D or Left / Right to Steer</span>
            <span aria-hidden="true">·</span>
            <span>Space / W for Nitro</span>
            <span aria-hidden="true">·</span>
            <span>S to Brake</span>
            <span aria-hidden="true">·</span>
            <span>C Camera</span>
          </div>
        </div>
      )}
    </div>
  );
}
