import { createOGImage, ogImageSize } from '@/lib/og-image';

export const alt = 'Get Started with BragDoc - Track Achievements in Minutes';
export const size = ogImageSize;
export const contentType = 'image/png';

const setupSteps = [
  { num: '1', text: 'Install CLI' },
  { num: '2', text: 'Configure LLM' },
  { num: '3', text: 'Extract' },
];

export default async function Image() {
  return createOGImage({
    title: 'Get Started with BragDoc',
    subtitle: 'Track Achievements in Minutes',
    children: (
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        {setupSteps.map((step) => (
          <div
            key={step.num}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                background: 'rgba(124, 58, 237, 0.3)',
                border: '3px solid rgba(124, 58, 237, 0.6)',
                borderRadius: '50%',
                fontSize: 48,
                fontWeight: 900,
                color: '#fff',
              }}
            >
              {step.num}
            </div>
            <div style={{ fontSize: 24, color: '#cbd5e1', display: 'flex' }}>
              {step.text}
            </div>
          </div>
        ))}
      </div>
    ),
  });
}
