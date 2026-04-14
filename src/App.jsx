import { useState } from 'react'
import InputPanel from './components/InputPanel'
import OutputPanel from './components/OutputPanel'

export default function App() {
  const [step, setStep] = useState('idle') // idle | loading | done | error
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [adPreview, setAdPreview] = useState(null)

  const addLog = (msg) => setLogs(prev => [...prev, { msg, ts: Date.now() }])

  const handleSubmit = async ({ adFile, adUrl, pageUrl }) => {
    setStep('loading')
    setLogs([])
    setResult(null)

    try {
      addLog('Initializing pipeline...')
      const formData = new FormData()
      if (adFile) {
        formData.append('adFile', adFile)
        setAdPreview(URL.createObjectURL(adFile))
      }
      if (adUrl) formData.append('adUrl', adUrl)
      formData.append('pageUrl', pageUrl)

      addLog('Step 1/5 → Scraping landing page HTML via Playwright...')

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || 'Server returned an error')
      }

      addLog('Step 2/5 → Analyzing ad creative with Llama Vision...')
      await new Promise(r => setTimeout(r, 400))

      addLog('Step 3/5 → Extracting page text elements & color palette...')
      await new Promise(r => setTimeout(r, 300))

      addLog('Step 4/5 → Generating CRO-optimized text replacements...')
      await new Promise(r => setTimeout(r, 300))

      addLog('Step 5/5 → Generating CSS overrides to match ad visual identity...')

      const data = await res.json()

      addLog(`✓ Complete — ${data.changesCount} text changes + full style overrides applied`)
      setResult(data)
      setStep('done')
    } catch (err) {
      addLog(`ERROR: ${err.message}`)
      setStep('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10,10,8,0.9)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{
            fontFamily: 'var(--display)',
            fontSize: 28,
            letterSpacing: 4,
            color: 'var(--amber)',
          }}>TROOPOD</span>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--text-dim)',
            letterSpacing: 2,
          }}>AD SYNC ENGINE v2.0</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: step === 'loading' ? 'var(--amber)' : step === 'done' ? 'var(--green)' : step === 'error' ? 'var(--red)' : 'var(--text-muted)',
            animation: step === 'loading' ? 'pulseGlow 1s infinite' : 'none',
            display: 'inline-block'
          }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1 }}>
            {step === 'idle' ? 'STANDBY' : step === 'loading' ? 'PROCESSING' : step === 'done' ? 'COMPLETE' : 'ERROR'}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: step === 'done' ? '380px 1fr' : '1fr',
        gridTemplateRows: step === 'done' ? '1fr' : 'auto 1fr',
        maxWidth: step === 'done' ? '100%' : 900,
        margin: step === 'done' ? 0 : '0 auto',
        width: '100%',
        transition: 'all 0.4s ease',
      }}>
        <InputPanel
          onSubmit={handleSubmit}
          step={step}
          logs={logs}
          adPreview={adPreview}
          compact={step === 'done'}
        />
        {(step === 'done' || step === 'loading') && (
          <OutputPanel result={result} step={step} />
        )}
      </div>
    </div>
  )
}