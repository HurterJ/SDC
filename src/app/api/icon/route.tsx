import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const size = parseInt(searchParams.get('size') ?? '192', 10)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: size * 0.2,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: size * 0.04,
          }}
        >
          <div
            style={{
              width: size * 0.55,
              height: size * 0.28,
              background: '#fbbf24',
              borderRadius: `${size * 0.28}px ${size * 0.28}px 0 0`,
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: size * 0.68,
                height: size * 0.07,
                background: '#f59e0b',
                borderRadius: size * 0.02,
                marginBottom: -size * 0.035,
              }}
            />
          </div>
          <div
            style={{
              color: 'white',
              fontSize: size * 0.14,
              fontWeight: 700,
              letterSpacing: '-0.5px',
              marginTop: size * 0.04,
            }}
          >
            SiteSuivi
          </div>
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
