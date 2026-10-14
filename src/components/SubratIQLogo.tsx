/**
 * SUBRAT IQ Logo Component
 * High-fidelity vector recreation of the SUBRAT IQ brand identity:
 * - Golden solar crest with sacred Om (ॐ)
 * - 3D dynamic SP monogram with digital network nodes
 * - Meditating figure with golden inner flame in radiant blue lotus petals
 * - Modern typography: "SUBRAT IQ" + "Ideas • Apps • Innovation"
 */

import React from 'react';

interface SubratIQLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'full' | 'icon' | 'horizontal';
  showTagline?: boolean;
}

export const SubratIQLogo: React.FC<SubratIQLogoProps> = ({
  className = '',
  size = 48,
  variant = 'icon',
  showTagline = true,
}) => {
  // SVG Gradients & Definitions
  const defs = (
    <defs>
      {/* Gold Sun & Om Gradient */}
      <linearGradient id="goldSunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>

      {/* Royal Blue to Cyan 3D Ribbon */}
      <linearGradient id="blueRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0284C7" />
        <stop offset="50%" stopColor="#1D4ED8" />
        <stop offset="100%" stopColor="#1E3A8A" />
      </linearGradient>

      {/* Blue to Green Gradient for 'P' */}
      <linearGradient id="blueGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2563EB" />
        <stop offset="60%" stopColor="#0EA5E9" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>

      {/* Lotus Petal Deep Royal Blue */}
      <linearGradient id="lotusBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="40%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#0C4A6E" />
      </linearGradient>

      {/* Lotus Outer Wings */}
      <linearGradient id="lotusWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#1E3A8A" />
      </linearGradient>

      {/* Golden Flame Core */}
      <linearGradient id="goldenFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>

      {/* Network Node Cyan */}
      <linearGradient id="nodeCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>

      {/* Network Node Green */}
      <linearGradient id="nodeGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>

      {/* Drop Shadows */}
      <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0284C7" floodOpacity="0.25" />
      </filter>
    </defs>
  );

  // Icon Only (Emblem with Sun, Om, SP ribbon, Meditating Yogi, Lotus)
  const iconEmblem = (
    <svg
      viewBox="0 0 400 380"
      className={className}
      style={{ width: size, height: size }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {defs}

      {/* 1. Golden Sun Rays & Halo */}
      <g id="sun-crest">
        {/* Sun Rays */}
        <path d="M200 12 L200 38" stroke="url(#goldSunGrad)" strokeWidth="6" strokeLinecap="round" />
        <path d="M162 22 L172 44" stroke="url(#goldSunGrad)" strokeWidth="5" strokeLinecap="round" />
        <path d="M238 22 L228 44" stroke="url(#goldSunGrad)" strokeWidth="5" strokeLinecap="round" />
        <path d="M130 45 L148 62" stroke="url(#goldSunGrad)" strokeWidth="5" strokeLinecap="round" />
        <path d="M270 45 L252 62" stroke="url(#goldSunGrad)" strokeWidth="5" strokeLinecap="round" />
        <path d="M108 78 L130 88" stroke="url(#goldSunGrad)" strokeWidth="5" strokeLinecap="round" />
        <path d="M292 78 L270 88" stroke="url(#goldSunGrad)" strokeWidth="5" strokeLinecap="round" />

        {/* Arch Halo Ring */}
        <path
          d="M125 105 A 85 85 0 0 1 275 105"
          fill="none"
          stroke="url(#goldSunGrad)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Sacred Om Symbol (ॐ) in Gold */}
        <g transform="translate(180, 52) scale(0.72)">
          <text
            x="28"
            y="52"
            textAnchor="middle"
            fill="url(#goldSunGrad)"
            fontFamily="'Sanskrit Text', 'Nirmala UI', 'Mangal', 'Arial Unicode MS', serif"
            fontSize="56"
            fontWeight="bold"
            filter="url(#subtleGlow)"
          >
            ॐ
          </text>
        </g>
      </g>

      {/* 2. Digital Network Connected Nodes (Top right of P) */}
      <g id="network-nodes" transform="translate(245, 82)">
        <circle cx="10" cy="22" r="7" fill="url(#nodeGreenGrad)" />
        <line x1="16" y1="20" x2="30" y2="12" stroke="#0284C7" strokeWidth="3" />
        <line x1="16" y1="24" x2="30" y2="34" stroke="#0284C7" strokeWidth="3" />
        <rect x="28" y="2" width="16" height="16" rx="4" fill="url(#nodeCyanGrad)" />
        <rect x="28" y="24" width="16" height="16" rx="4" fill="#0284C7" />
        <rect x="48" y="16" width="12" height="12" rx="3" fill="url(#nodeGreenGrad)" />
        <line x1="44" y1="10" x2="48" y2="18" stroke="#10B981" strokeWidth="2.5" />
      </g>

      {/* 3. Stylized 3D SP Ribbon Monogram */}
      <g id="sp-ribbon">
        {/* 'S' Top Arch (Vibrant Royal Blue) */}
        <path
          d="M210 98 C160 98 128 120 135 155 C142 190 190 192 235 205 C265 214 278 230 265 250 C250 270 205 272 170 262 L160 278 C205 292 268 290 286 256 C302 226 278 198 230 188 C185 178 155 170 152 148 C149 126 178 116 215 116 C238 116 260 124 275 134 L285 115 C262 102 235 98 210 98 Z"
          fill="url(#blueRibbonGrad)"
        />

        {/* 'P' Loop blending into Green */}
        <path
          d="M210 132 C265 132 290 148 290 178 C290 208 260 225 215 225 L215 206 C245 206 268 196 268 178 C268 160 248 151 210 151 L195 151 L195 132 Z"
          fill="url(#blueGreenGrad)"
        />
      </g>

      {/* 4. Radiant Lotus Flower Base */}
      <g id="lotus-flower">
        {/* Left Outer Wing Petal */}
        <path
          d="M200 285 C145 285 100 255 75 205 C98 245 145 270 200 275 Z"
          fill="url(#lotusWingGrad)"
          stroke="#F59E0B"
          strokeWidth="1.5"
        />
        <path
          d="M200 285 C130 285 85 240 65 185 C95 235 150 265 200 272 Z"
          fill="url(#lotusBlueGrad)"
        />

        {/* Right Outer Wing Petal */}
        <path
          d="M200 285 C255 285 300 255 325 205 C302 245 255 270 200 275 Z"
          fill="url(#lotusWingGrad)"
          stroke="#F59E0B"
          strokeWidth="1.5"
        />
        <path
          d="M200 285 C270 285 315 240 335 185 C305 235 250 265 200 272 Z"
          fill="url(#lotusBlueGrad)"
        />

        {/* Lotus Core Cup & Middle Petals */}
        <path
          d="M200 290 C155 290 115 260 105 220 C130 255 165 275 200 280 C235 275 270 255 295 220 C285 260 245 290 200 290 Z"
          fill="url(#lotusBlueGrad)"
          stroke="#FBBF24"
          strokeWidth="1"
        />

        {/* Lowest Supporting Lotus Pedestal Petals */}
        <path
          d="M200 300 C165 300 135 285 120 265 C145 282 172 292 200 294 C228 292 255 282 280 265 C265 285 235 300 200 300 Z"
          fill="#0C4A6E"
        />
      </g>

      {/* 5. Meditating Silhouette Figure with Golden Inner Flame */}
      <g id="meditating-figure">
        {/* Head */}
        <circle cx="200" cy="192" r="10" fill="#0284C7" />
        <circle cx="200" cy="192" r="7" fill="#38BDF8" />

        {/* Shoulders & Torso Outline in Blue */}
        <path
          d="M192 204 C175 210 162 230 152 252 C168 250 185 244 192 234 Z"
          fill="#0284C7"
        />
        <path
          d="M208 204 C225 210 238 230 248 252 C232 250 215 244 208 234 Z"
          fill="#0284C7"
        />

        {/* Crossed Legs (Lotus Posture Padmasana) */}
        <path
          d="M200 265 C165 265 148 250 150 238 C165 240 185 248 200 256 C215 248 235 240 250 238 C252 250 235 265 200 265 Z"
          fill="#0C4A6E"
          stroke="#0284C7"
          strokeWidth="2"
        />

        {/* Golden Central Energy Flame / Kundalini Light */}
        <path
          d="M200 206 C195 214 192 224 196 232 C198 236 200 242 200 248 C200 242 202 236 204 232 C208 224 205 214 200 206 Z"
          fill="url(#goldenFlameGrad)"
          filter="url(#subtleGlow)"
        />
      </g>
    </svg>
  );

  if (variant === 'icon') {
    return iconEmblem;
  }

  // Full Stacked Logo (Emblem + "SUBRAT IQ" + "Ideas • Apps • Innovation")
  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
        {/* Emblem */}
        <div className="relative flex items-center justify-center">
          {iconEmblem}
        </div>

        {/* Typography: SUBRAT IQ */}
        <div className="mt-2 flex items-center justify-center tracking-tight">
          <span className="font-black text-2xl sm:text-3xl tracking-wider text-slate-900 uppercase font-sans">
            SUBRAT
          </span>
          <span className="ml-1.5 font-black text-2xl sm:text-3xl text-cyan-600">
            I
          </span>
          <span className="font-black text-2xl sm:text-3xl text-emerald-500">
            Q
          </span>
        </div>

        {/* Tagline: Ideas • Apps • Innovation */}
        {showTagline && (
          <div className="mt-1 w-full flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 tracking-wider">
              <span>Ideas</span>
              <span className="text-cyan-500 text-base">•</span>
              <span>Apps</span>
              <span className="text-emerald-500 text-base">•</span>
              <span>Innovation</span>
            </div>

            {/* Decorative Framing Rules & Central Diamond */}
            <div className="w-48 sm:w-56 flex items-center justify-center gap-2 mt-1">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-cyan-500" />
              <div className="w-2 h-2 rotate-45 bg-amber-500 shrink-0" />
              <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-500 to-transparent" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Horizontal Variant (Emblem on left, SUBRAT IQ on right)
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="shrink-0 flex items-center justify-center">
        {iconEmblem}
      </div>

      <div className="flex flex-col justify-center text-left">
        <div className="flex items-baseline tracking-tight leading-none">
          <span className="font-black text-lg sm:text-xl tracking-wider text-white uppercase font-sans">
            SUBRAT
          </span>
          <span className="ml-1 font-black text-lg sm:text-xl text-cyan-400">
            I
          </span>
          <span className="font-black text-lg sm:text-xl text-emerald-400">
            Q
          </span>
        </div>

        {showTagline && (
          <div className="text-[10px] sm:text-[11px] font-medium text-cyan-200/90 tracking-wide mt-0.5 flex items-center gap-1">
            <span>Ideas</span>
            <span className="text-cyan-400">•</span>
            <span>Apps</span>
            <span className="text-emerald-400">•</span>
            <span>Innovation</span>
          </div>
        )}
      </div>
    </div>
  );
};
