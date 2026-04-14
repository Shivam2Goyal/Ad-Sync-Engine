import { useState, useRef } from 'react'

export default function InputPanel({ onSubmit, step, logs, adPreview, compact }) {
  const [adFile, setAdFile] = useState(null)
  const [adUrl, setAdUrl] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setAdFile(file)
  }

  const handleSubmit = () => {
    if (!pageUrl) return
    if (!adFile && !adUrl) return
    onSubmit({ adFile, adUrl, pageUrl })
  }

  const inputStyle = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'var(--mono)',
    fontSize: 12,
    padding: '10px 14px',
    width: '100%',
    outline: 'none',
    letterSpacing: 0.5,
    transition: 'border-color 0.2s',
  }

  const labelStyle = {
    fontFamily: 'var(--mono)',
    fontSize: 10,
    color: 'var(--amber)',
    letterSpacing: 3,
    marginBottom: 6,
    display: 'block',
  }

  return (
    <div style={{
      borderRight: compact ? '1px solid var(--border)' : 'none',
      padding: compact ? '24px 20px' : '48px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    }}>
      {!compact && (
        <div className="fade-up">
          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: 64,
            lineHeight: 0.9,
            letterSpacing: 6,
            color: 'var(--text)',
            marginBottom: 12,
          }}>
            AD<br />
            <span style={{ color: 'var(--amber)' }}>SYNC</span><br />
            ENGINE
          </h1>
          <p style={{
            fontFamily: 'var(--body)',
            fontSize: 14,
            color: 'var(--text-dim)',
            fontWeight: 300,
            lineHeight: 1.6,
            maxWidth: 400,
          }}>
            Feed it your ad creative. Feed it your landing page.
            Watch it personalize the page to match — automatically.
          </p>
        </div>
      )}

      {compact && (
        <div style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: 3, color: 'var(--amber)' }}>
          INPUTS
        </div>
      )}

      {/* Ad Upload Zone */}
      <div>
        <span style={labelStyle}>[ AD CREATIVE ]</span>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
          style={{
            border: `1px dashed ${dragOver ? 'var(--amber)' : adFile ? 'var(--green)' : 'var(--border)'}`,
            background: dragOver ? 'var(--amber-glow)' : 'var(--bg2)',
            padding: compact ? '12px' : '20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {adPreview ? (
            <img src={adPreview} alt="Ad preview" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              {adFile ? `✓ ${adFile.name}` : 'DROP IMAGE / VIDEO HERE'}
            </span>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={e => setAdFile(e.target.files[0])} />
        </div>

        <div style={{ margin: '10px 0', textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>— OR —</span>
        </div>

        <input
          style={inputStyle}
          placeholder="paste ad image/video URL..."
          value={adUrl}
          onChange={e => setAdUrl(e.target.value)}
          onFocus={e => e.target.style.borderColor = 'var(--amber)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Landing page URL */}
      <div>
        <span style={labelStyle}>[ LANDING PAGE URL ]</span>
        <input
          style={inputStyle}
          placeholder="https://yourpage.com/landing"
          value={pageUrl}
          onChange={e => setPageUrl(e.target.value)}
          onFocus={e => e.target.style.borderColor = 'var(--amber)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={step === 'loading' || (!adFile && !adUrl) || !pageUrl}
        style={{
          background: step === 'loading' ? 'transparent' : 'var(--amber)',
          border: '1px solid var(--amber)',
          color: step === 'loading' ? 'var(--amber)' : 'var(--bg)',
          fontFamily: 'var(--display)',
          fontSize: 18,
          letterSpacing: 4,
          padding: '14px 24px',
          cursor: step === 'loading' ? 'not-allowed' : 'pointer',
          width: '100%',
          transition: 'all 0.2s',
          opacity: (!adFile && !adUrl) || !pageUrl ? 0.4 : 1,
        }}
      >
        {step === 'loading' ? 'PROCESSING...' : 'SYNC AD TO PAGE →'}
      </button>

      {/* Terminal logs */}
      {logs.length > 0 && (
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          padding: '12px 14px',
          maxHeight: 160,
          overflowY: 'auto',
        }}>
          {logs.map((log, i) => (
            <div key={log.ts} style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: log.msg.startsWith('ERROR') ? 'var(--red)' : log.msg.startsWith('Output') ? 'var(--green)' : 'var(--text-dim)',
              lineHeight: 2,
              display: 'flex',
              gap: 8,
            }}>
              <span style={{ color: 'var(--amber-dim)' }}>{'>'}</span>
              <span>{log.msg}</span>
              {i === logs.length - 1 && step === 'loading' && (
                <span className="blink" style={{ color: 'var(--amber)' }}>█</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}