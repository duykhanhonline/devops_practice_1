import { useState } from 'react'
import { ResultViewer } from './components/ResultViewer'
import { StatusIndicator } from './components/StatusIndicator'
import { UrlForm } from './components/UrlForm'
import { useCrawlJob } from './hooks/useCrawlJob'
import './App.css'

function App() {
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null)
  const state = useCrawlJob(submittedUrl)

  const isBusy = state.phase === 'submitting' || state.phase === 'polling' || state.phase === 'fetching'

  return (
    <main>
      <h1>URL Crawler testing</h1>
      <UrlForm onSubmit={setSubmittedUrl} disabled={isBusy} />
      <StatusIndicator state={state} />
      {state.phase === 'done' && <ResultViewer jobId={state.jobId} html={state.html} />}
    </main>
  )
}

export default App
