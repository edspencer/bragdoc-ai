import { createOGImage, ogImageSize } from '@/lib/og-image';

export const runtime = 'edge';
export const alt =
  'How BragDoc Works - Automated Achievement Tracking from Git';
export const size = ogImageSize;
export const contentType = 'image/png';

const steps = [
  'Git Commits',
  '→',
  'CLI',
  '→',
  'AI',
  '→',
  'Web App',
  '→',
  'Documents',
];

export default async function Image() {
  return createOGImage({
    title: 'How BragDoc Works',
    children: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {steps.map((step, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...(step === '→'
                  ? { fontSize: 40, color: '#7c3aed' }
                  : {
                      padding: '16px 32px',
                      background:
                        step === 'AI'
                          ? 'rgba(124, 58, 237, 0.3)'
                          : 'rgba(148, 163, 184, 0.1)',
                      border:
                        step === 'AI'
                          ? '2px solid rgba(124, 58, 237, 0.6)'
                          : '2px solid rgba(148, 163, 184, 0.3)',
                      borderRadius: '12px',
                      color: '#cbd5e1',
                      fontSize: 24,
                      fontWeight: step === 'AI' ? 700 : 500,
                    }),
              }}
            >
              {step}
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#94a3b8',
            marginTop: '64px',
            display: 'flex',
          }}
        >
          From Commits to Career Documents
        </div>
      </>
    ),
  });
}
