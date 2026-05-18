interface Props {
  width?: number;
  height?: number;
  glowing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function CardBack({ width = 112, height = 176, glowing = false, className = '', style }: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 112 176"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="cardBg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0a0a1a" />
        </radialGradient>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="40%">
          <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {glowing && (
          <filter id="outerGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* 底色 */}
      <rect x="2" y="2" width="108" height="172" rx="10" fill="url(#cardBg)" />

      {/* 外框 */}
      <rect
        x="2" y="2" width="108" height="172" rx="10"
        fill="none"
        stroke={glowing ? '#c9a84c' : '#7b5ea7'}
        strokeWidth={glowing ? '1.5' : '1'}
        filter={glowing ? 'url(#outerGlow)' : undefined}
      />

      {/* 內框裝飾 */}
      <rect x="8" y="8" width="96" height="160" rx="7" fill="none" stroke="#c9a84c" strokeWidth="0.5" strokeOpacity="0.4" />

      {/* 中央光暈 */}
      <ellipse cx="56" cy="88" rx="45" ry="60" fill="url(#centerGlow)" />

      {/* 角落裝飾 — 左上 */}
      <g opacity="0.7">
        <line x1="14" y1="14" x2="24" y2="14" stroke="#c9a84c" strokeWidth="0.8" />
        <line x1="14" y1="14" x2="14" y2="24" stroke="#c9a84c" strokeWidth="0.8" />
        <circle cx="14" cy="14" r="1.5" fill="#c9a84c" />
      </g>
      {/* 角落裝飾 — 右上 */}
      <g opacity="0.7">
        <line x1="98" y1="14" x2="88" y2="14" stroke="#c9a84c" strokeWidth="0.8" />
        <line x1="98" y1="14" x2="98" y2="24" stroke="#c9a84c" strokeWidth="0.8" />
        <circle cx="98" cy="14" r="1.5" fill="#c9a84c" />
      </g>
      {/* 角落裝飾 — 左下 */}
      <g opacity="0.7">
        <line x1="14" y1="162" x2="24" y2="162" stroke="#c9a84c" strokeWidth="0.8" />
        <line x1="14" y1="162" x2="14" y2="152" stroke="#c9a84c" strokeWidth="0.8" />
        <circle cx="14" cy="162" r="1.5" fill="#c9a84c" />
      </g>
      {/* 角落裝飾 — 右下 */}
      <g opacity="0.7">
        <line x1="98" y1="162" x2="88" y2="162" stroke="#c9a84c" strokeWidth="0.8" />
        <line x1="98" y1="162" x2="98" y2="152" stroke="#c9a84c" strokeWidth="0.8" />
        <circle cx="98" cy="162" r="1.5" fill="#c9a84c" />
      </g>

      {/* 中央星形圖案 */}
      <g filter="url(#glow)" transform="translate(56,88)">
        {/* 外圈 */}
        <circle cx="0" cy="0" r="28" fill="none" stroke="#c9a84c" strokeWidth="0.6" strokeOpacity="0.5" strokeDasharray="3 4" />
        <circle cx="0" cy="0" r="20" fill="none" stroke="#7b5ea7" strokeWidth="0.5" strokeOpacity="0.6" />

        {/* 八角星 */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
          const r = Math.PI / 180 * deg;
          const x1 = Math.sin(r) * 20;
          const y1 = -Math.cos(r) * 20;
          return <line key={i} x1="0" y1="0" x2={x1} y2={y1} stroke="#c9a84c" strokeWidth="0.5" strokeOpacity="0.4" />;
        })}

        {/* 中心星 */}
        <path
          d="M0,-16 L3.8,-5.2 L15.2,-4.9 L6.2,1.9 L9.4,13.1 L0,6.8 L-9.4,13.1 L-6.2,1.9 L-15.2,-4.9 L-3.8,-5.2 Z"
          fill="none"
          stroke="#c9a84c"
          strokeWidth="0.8"
          strokeOpacity="0.7"
        />

        {/* 中心點 */}
        <circle cx="0" cy="0" r="3" fill="#c9a84c" fillOpacity="0.6" />
        <circle cx="0" cy="0" r="1.5" fill="#e8d48b" />
      </g>

      {/* 上下裝飾線 */}
      <line x1="20" y1="42" x2="92" y2="42" stroke="#c9a84c" strokeWidth="0.4" strokeOpacity="0.3" />
      <line x1="20" y1="134" x2="92" y2="134" stroke="#c9a84c" strokeWidth="0.4" strokeOpacity="0.3" />

      {/* 小菱形裝飾 */}
      <g opacity="0.5">
        <path d="M56,30 L59,36 L56,42 L53,36 Z" fill="none" stroke="#c9a84c" strokeWidth="0.6" />
        <path d="M56,134 L59,140 L56,146 L53,140 Z" fill="none" stroke="#c9a84c" strokeWidth="0.6" />
      </g>
    </svg>
  );
}
