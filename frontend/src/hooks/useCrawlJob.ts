import { useEffect, useState } from 'react'
import { getJobStatus, submitJob } from '../api'
import type { CrawlJobState } from '../types'

const POLL_INTERVAL_MS = 1500
const MAX_RESULT_FETCH_RETRIES = 3

export function useCrawlJob(url: string | null): CrawlJobState {
  const [state, setState] = useState<CrawlJobState>({ phase: 'idle' })

  useEffect(() => {
    if (!url) {
      setState({ phase: 'idle' })
      return
    }

    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | undefined

    const fetchResultHtml = async (jobId: string, resultUrl: string, attempt: number): Promise<void> => {
      let response: Response
      try {
        response = await fetch(resultUrl)
      } catch {
        if (cancelled) return
        setState({ phase: 'error', message: 'Failed to fetch crawled result' })
        return
      }

      if (cancelled) return

      if (response.status === 403 && attempt < MAX_RESULT_FETCH_RETRIES) {
        // Presigned URL expired — re-poll status for a fresh one rather than failing.
        const fresh = await getJobStatus(jobId)
        if (cancelled) return
        if (fresh.status === 'done' && fresh.resultUrl) {
          await fetchResultHtml(jobId, fresh.resultUrl, attempt + 1)
        } else {
          setState({ phase: 'error', message: 'Result expired before it could be loaded' })
        }
        return
      }

      if (!response.ok) {
        setState({ phase: 'error', message: `Failed to fetch crawled result (${response.status})` })
        return
      }

      const html = await response.text()
      if (cancelled) return
      setState({ phase: 'done', jobId, html })
    }

    const poll = async (jobId: string): Promise<void> => {
      if (cancelled) return

      let status
      try {
        status = await getJobStatus(jobId)
      } catch {
        if (cancelled) return
        setState({ phase: 'error', message: 'Failed to check job status' })
        return
      }

      if (cancelled) return

      if (status.status === 'pending' || status.status === 'processing') {
        setState({ phase: 'polling', jobId, jobStatus: status.status })
        pollTimer = setTimeout(() => void poll(jobId), POLL_INTERVAL_MS)
        return
      }

      if (status.status === 'failed') {
        setState({ phase: 'error', message: status.error ?? 'Crawl failed' })
        return
      }

      if (status.status === 'done' && status.resultUrl) {
        setState({ phase: 'fetching', jobId })
        await fetchResultHtml(jobId, status.resultUrl, 0)
      }
    }

    const start = async (): Promise<void> => {
      setState({ phase: 'submitting' })
      let jobId: string
      try {
        ;({ jobId } = await submitJob(url))
      } catch {
        if (cancelled) return
        setState({ phase: 'error', message: 'Failed to submit job' })
        return
      }
      if (cancelled) return
      await poll(jobId)
    }

    void start()

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
    }
  }, [url])

  return state
}
