import { ImageResponse } from 'next/og';

export const ogImageSize = {
  width: 1200,
  height: 630,
};

const baseStyles = {
  container: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px',
    fontFamily: 'system-ui, sans-serif',
  },
  title: {
    fontWeight: 900,
    background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)',
    backgroundClip: 'text',
    color: 'transparent',
    display: 'flex',
  },
  subtitle: {
    color: '#cbd5e1',
    display: 'flex',
  },
  text: {
    color: '#94a3b8',
    display: 'flex',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    background: 'rgba(124, 58, 237, 0.15)',
    border: '2px solid rgba(124, 58, 237, 0.4)',
    borderRadius: '12px',
    color: '#cbd5e1',
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#7c3aed',
    marginRight: '12px',
  },
};

interface OGImageProps {
  title: string;
  subtitle?: string;
  badges?: string[];
  items?: Array<{ label: string; value?: string }>;
  children?: React.ReactNode;
}

export function createOGImage({
  title,
  subtitle,
  badges,
  items,
  children,
}: OGImageProps) {
  return new ImageResponse(
    <div style={baseStyles.container}>
      {/* Title */}
      <div
        style={{
          ...baseStyles.title,
          fontSize: title.length > 30 ? 64 : 80,
          marginBottom: subtitle || badges || items || children ? '32px' : '0',
          textAlign: 'center',
          maxWidth: '1000px',
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            ...baseStyles.subtitle,
            fontSize: 36,
            marginBottom: badges || items || children ? '48px' : '0',
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: badges.length > 4 ? '16px' : '32px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '1000px',
          }}
        >
          {badges.map((badge) => (
            <div
              key={badge}
              style={{
                ...baseStyles.badge,
                fontSize: badges.length > 4 ? 20 : 24,
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      )}

      {/* Items with bullets */}
      {items && items.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            width: '100%',
            maxWidth: '800px',
          }}
        >
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '20px 32px',
                background: 'rgba(124, 58, 237, 0.1)',
                border: '2px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '16px',
              }}
            >
              <div style={baseStyles.bullet} />
              <div
                style={{
                  fontSize: 32,
                  color: '#cbd5e1',
                  display: 'flex',
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom content */}
      {children}
    </div>,
    {
      ...ogImageSize,
    },
  );
}
