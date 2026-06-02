import { useTheme } from '../../../controllers/useTheme';

interface Props {
  width?: number;
  height?: number;
  glowing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function CardBack({ width = 112, height = 176, glowing = false, className = '', style }: Props) {
  const { theme, themeImageBase } = useTheme();

  // 淺色模式牌背跟背景色接近，需要更明顯的邊框和陰影
  const lightBorder = '1.5px solid rgba(90, 74, 62, 0.35)';
  const darkBorder = '1px solid var(--color-border)';
  const lightShadow = '0 2px 10px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(90,74,62,0.2)';
  const darkShadow = '0 2px 8px rgba(0,0,0,0.15)';
  const lightGlow = '0 0 15px 3px rgba(107,91,78,0.3), 0 0 30px 6px rgba(107,91,78,0.15)';
  const darkGlow = '0 0 15px 3px var(--shadow-glow-color, rgba(139,110,192,0.4)), 0 0 30px 6px var(--shadow-glow-color-dim, rgba(139,110,192,0.2))';

  const isLight = theme === 'light';

  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: glowing
          ? (isLight ? lightGlow : darkGlow)
          : (isLight ? lightShadow : darkShadow),
        border: glowing
          ? '1.5px solid var(--color-accent-gold)'
          : (isLight ? lightBorder : darkBorder),
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={`${themeImageBase}/card-back.png`}
        alt="牌背"
        width={width}
        height={height}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        draggable={false}
      />
    </div>
  );
}
