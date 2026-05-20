interface Props {
  width?: number;
  height?: number;
  glowing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function CardBack({ width = 112, height = 176, glowing = false, className = '', style }: Props) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: glowing
          ? '0 0 15px 3px rgba(201, 168, 76, 0.4), 0 0 30px 6px rgba(201, 168, 76, 0.2)'
          : '0 2px 8px rgba(0,0,0,0.4)',
        border: glowing ? '1.5px solid #c9a84c' : '1px solid rgba(123, 94, 167, 0.5)',
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src="/images/theme/card-back.png"
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
