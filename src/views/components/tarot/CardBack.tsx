import { useTheme } from '../../../controllers/useTheme';

interface Props {
  width?: number;
  height?: number;
  glowing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function CardBack({ width = 112, height = 176, glowing = false, className = '', style }: Props) {
  const { themeImageBase } = useTheme();
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: glowing
          ? '0 0 15px 3px var(--shadow-glow-color, rgba(139,110,192,0.4)), 0 0 30px 6px var(--shadow-glow-color-dim, rgba(139,110,192,0.2))'
          : '0 2px 8px rgba(0,0,0,0.15)',
        border: glowing ? '1.5px solid var(--color-accent-gold)' : '1px solid var(--color-border)',
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
