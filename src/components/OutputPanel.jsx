import { useState, useRef, useEffect } from 'react'

export default function OutputPanel({ result, step }) {
  const [view, setView] = useState('preview')
  const iframeRef = useRef(null)

  if (step === 'loading') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, padding: 48,
      }}>
        <div style={{
          width: 48, height: 48,
          border: '2px solid var(--border)',
          borderTop: '2px solid var(--amber)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 2 }}>
          RENDERING OUTPUT
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!result) return null

  const openPreview = () => {
    const blob = new Blob([result.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const tabStyle = (active) => ({
    fontFamily: 'var(--mono)',
    fontSize: 10,
    letterSpacing: 2,
    padding: '8px 16px',
    border: '1px solid var(--border)',
    borderBottom: active ? '1px solid var(--bg)' : '1px solid var(--border)',
    background: active ? 'var(--bg)' : 'var(--bg2)',
    color: active ? 'var(--amber)' : 'var(--text-dim)',
    cursor: 'pointer',
    marginBottom: -1,
  })

  const colorSwatch = (color, label) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <div style={{
        width: 16, height: 16, borderRadius: 2,
        background: color || '#333',
        border: '1px solid rgba(255,255,255,0.15)',
        flexShrink: 0,
      }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)' }}>
        {label}: {color || 'N/A'}
      </span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        padding: '16px 24px 0',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 4,
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['preview', 'diff', 'code'].map(v => (
            <button key={v} style={tabStyle(view === v)} onClick={() => setView(v)}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            {result.changesCount} TEXT + STYLE CHANGES
          </span>
          <button
            onClick={openPreview}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: 2,
              padding: '6px 14px',
              background: 'var(--amber)',
              color: 'var(--bg)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ↗ OPEN IN NEW TAB
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* PREVIEW VIEW — live iframe */}
        {view === 'preview' && (
          <div style={{ height: '100%', minHeight: '70vh', position: 'relative' }}>
            <iframe
              ref={iframeRef}
              srcDoc={result.html}
              title="Personalized Landing Page Preview"
              style={{
                width: '100%',
                height: '100%',
                minHeight: '70vh',
                border: 'none',
                background: '#fff',
              }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}

        {/* DIFF VIEW — show what changed */}
        {view === 'diff' && (
          <div style={{ padding: 24 }}>

            {/* Ad analysis summary */}
            {result.adAnalysis && (
              <div style={{
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--amber)',
                padding: '16px 20px',
                marginBottom: 24,
                background: 'rgba(245,158,11,0.04)',
              }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--amber)', letterSpacing: 3, marginBottom: 12 }}>
                  ◆ AD ANALYSIS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 4 }}>OFFER</div>
                    <div style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--text-dim)' }}>{result.adAnalysis.offer}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 4 }}>AUDIENCE</div>
                    <div style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--text-dim)' }}>{result.adAnalysis.audience}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 4 }}>TONE</div>
                    <div style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--text-dim)' }}>{result.adAnalysis.tone}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 4 }}>MOOD</div>
                    <div style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--text-dim)' }}>{result.adAnalysis.mood}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 6 }}>COLOR PALETTE EXTRACTED</div>
                  {colorSwatch(result.adAnalysis.primary_color, 'Primary')}
                  {colorSwatch(result.adAnalysis.secondary_color, 'Secondary')}
                  {colorSwatch(result.adAnalysis.accent_color, 'Accent')}
                  {colorSwatch(result.adAnalysis.background_color, 'Background')}
                  {colorSwatch(result.adAnalysis.text_color, 'Text')}
                </div>
              </div>
            )}

            {/* Summary card */}
            <div style={{
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--green)',
              padding: '16px 20px',
              marginBottom: 24,
              background: 'rgba(34,197,94,0.04)',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)', letterSpacing: 3, marginBottom: 8 }}>
                ✓ PERSONALIZATION COMPLETE
              </div>
              <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                The landing page has been enhanced with <strong style={{ color: 'var(--text)' }}>{result.changesCount} targeted text changes</strong> and <strong style={{ color: 'var(--text)' }}>comprehensive CSS overrides</strong> to match the ad's visual identity. Click <strong style={{ color: 'var(--amber)' }}>PREVIEW</strong> tab or <strong style={{ color: 'var(--amber)' }}>OPEN IN NEW TAB</strong> to see the full result.
              </div>
            </div>

            {/* Text changes list */}
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--amber-dim)', letterSpacing: 3, marginBottom: 12 }}>
              TEXT CHANGES
            </div>
            {result.changes?.map((change, i) => (
              <div key={i} style={{
                marginBottom: 16,
                padding: '14px 18px',
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--amber)',
                background: 'var(--bg2)',
              }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 10,
                  color: 'var(--amber)', letterSpacing: 2, marginBottom: 10,
                }}>
                  {String(i + 1).padStart(2, '0')} — {change.element?.toUpperCase()}
                </div>
                <div style={{
                  fontFamily: 'var(--body)', fontSize: 13,
                  color: 'var(--red)', marginBottom: 6,
                  textDecoration: 'line-through', opacity: 0.7,
                }}>
                  {change.before}
                </div>
                <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
                  → {change.after}
                </div>
              </div>
            ))}

            {/* CSS overrides preview */}
            {result.cssOverrides && (
              <>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--amber-dim)', letterSpacing: 3, marginBottom: 12, marginTop: 24 }}>
                  STYLE OVERRIDES
                </div>
                <pre style={{
                  padding: 16,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  maxHeight: 300,
                  overflow: 'auto',
                }}>
                  {result.cssOverrides}
                </pre>
              </>
            )}
          </div>
        )}

        {/* CODE VIEW */}
        {view === 'code' && (
          <pre style={{
            padding: 24,
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--text-dim)',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {result.html}
          </pre>
        )}
      </div>
    </div>
  )
}