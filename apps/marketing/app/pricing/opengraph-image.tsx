import { createOGImage, ogImageSize } from '@/lib/og-image';

export const alt = 'BragDoc Pricing - Free & Cloud AI Plans';
export const size = ogImageSize;
export const contentType = 'image/png';

export default async function Image() {
  return createOGImage({
    title: 'BragDoc Pricing',
    children: (
      <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
        {/* Free Plan */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px',
            background: 'rgba(148, 163, 184, 0.1)',
            border: '2px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '24px',
            minWidth: '320px',
          }}
        >
          <div
            style={{
              fontSize: 32,
              color: '#cbd5e1',
              marginBottom: '16px',
              display: 'flex',
            }}
          >
            Free Plan
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: '#fff',
              marginBottom: '16px',
              display: 'flex',
            }}
          >
            $0
          </div>
          <div style={{ fontSize: 20, color: '#94a3b8', display: 'flex' }}>
            Your own LLM
          </div>
        </div>

        {/* Cloud AI Plan */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px',
            background: 'rgba(124, 58, 237, 0.2)',
            border: '2px solid rgba(124, 58, 237, 0.5)',
            borderRadius: '24px',
            minWidth: '320px',
          }}
        >
          <div
            style={{
              fontSize: 32,
              color: '#cbd5e1',
              marginBottom: '16px',
              display: 'flex',
            }}
          >
            Cloud AI
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: '#fff',
              marginBottom: '16px',
              display: 'flex',
            }}
          >
            $4.99
          </div>
          <div style={{ fontSize: 20, color: '#94a3b8', display: 'flex' }}>
            per month
          </div>
        </div>
      </div>
    ),
  });
}
