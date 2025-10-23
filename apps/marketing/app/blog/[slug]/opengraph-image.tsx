import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/lib/blog';
import { ogImageSize } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = ogImageSize;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return new ImageResponse(
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 48, color: '#cbd5e1', display: 'flex' }}>
          BragDoc Blog
        </div>
      </div>,
      { ...size },
    );
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '80px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: '48px' }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 900,
            background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
          }}
        >
          BragDoc Blog
        </div>
      </div>

      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.2,
          marginBottom: '32px',
          display: 'flex',
          flexWrap: 'wrap',
          maxWidth: '100%',
        }}
      >
        {post.title}
      </div>

      {post.description && (
        <div
          style={{
            fontSize: 28,
            color: '#cbd5e1',
            lineHeight: 1.4,
            marginBottom: '40px',
            display: 'flex',
            maxWidth: '100%',
          }}
        >
          {post.description}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 'auto',
          gap: '32px',
          fontSize: 20,
          color: '#94a3b8',
        }}
      >
        {post.author && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#7c3aed',
                marginRight: '12px',
              }}
            />
            {post.author}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#7c3aed',
              marginRight: '12px',
            }}
          />
          {formattedDate}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
