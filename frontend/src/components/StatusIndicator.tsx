import type { CrawlJobState } from '../types'

interface StatusIndicatorProps {
  state: CrawlJobState
}

export function StatusIndicator({ state }: StatusIndicatorProps) {
  switch (state.phase) {
    case 'idle':
      return null
    case 'submitting':
      return <p>Submitting…</p>
    case 'polling':
      return <p>{state.jobStatus === 'pending' ? 'Queued…' : 'Crawling…'}</p>
    case 'fetching':
      return <p>Crawling…</p>
    case 'done':
      return <p>Done</p>
    case 'error':
      return <p role="alert">Failed: {state.message}</p>
  }
}
