'use client';

interface AvatarDisplayProps {
  avatar?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function AvatarDisplay({
  avatar = '🎭',
  size = 40,
  className = '',
  style = {},
}: AvatarDisplayProps) {
  const isImage = avatar?.startsWith('data:image') || avatar?.startsWith('http');

  if (isImage) {
    return (
      <img
        src={avatar}
        alt="Avatar"
        className={className}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'inline-block',
          verticalAlign: 'middle',
          ...style,
        }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        fontSize: Math.floor(size * 0.55),
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        verticalAlign: 'middle',
        userSelect: 'none',
        ...style,
      }}
    >
      {avatar || '🎭'}
    </span>
  );
}

