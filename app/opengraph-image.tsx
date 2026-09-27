import { ImageResponse } from 'next/og'
import { SITE_TITLE, SITE_URL } from '@/lib/site'

export const runtime = 'edge'
export const alt = SITE_TITLE
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Link preview card for iMessage, LinkedIn, Slack, etc. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 96px',
          background: 'radial-gradient(circle 420px at 20% 30%, #1f2937, #000 70%)',
          color: '#fff',
          fontFamily: 'Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ fontSize: 40, color: '#9ca3af', marginBottom: 16 }}>Hi, I&apos;m</div>
        <div style={{ fontSize: 96, fontWeight: 700, color: '#60a5fa', lineHeight: 1.05 }}>
          Patrick Woods
        </div>
        <div style={{ fontSize: 40, marginTop: 28, color: '#e5e7eb' }}>
          AI &amp; Data Engineer · Fayetteville PWC · co-founder of RFP-Pilot
        </div>
        <div style={{ fontSize: 28, marginTop: 56, color: '#6b7280' }}>{SITE_URL.replace('https://', '')}</div>
      </div>
    ),
    size
  )
}
