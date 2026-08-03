import { useState } from 'react'

interface ResultViewerProps {
  jobId: string
  html: string
}

export function ResultViewer({ jobId, html }: ResultViewerProps) {
  const [tab, setTab] = useState<'text' | 'preview'>('text')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `${jobId}.html`
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <section>
      <div role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'text'} onClick={() => setTab('text')}>
          Text
        </button>
        <button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}>
          Preview
        </button>
      </div>

      <div>
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
        <button type="button" onClick={handleDownload}>
          Download .html
        </button>
      </div>

      {tab === 'text' ? (
        <pre>
          <code>{html}</code>
        </pre>
      ) : (
        // sandbox deliberately omits allow-scripts: crawled HTML is untrusted content.
        <iframe title="Crawled page preview" sandbox="allow-same-origin" srcDoc={html} />
      )}
    </section>
  )
}
