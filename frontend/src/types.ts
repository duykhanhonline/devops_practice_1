export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface StatusResponse {
  status: JobStatus
  resultUrl?: string
  error?: string
}

export type CrawlJobState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'polling'; jobId: string; jobStatus: 'pending' | 'processing' }
  | { phase: 'fetching'; jobId: string }
  | { phase: 'done'; jobId: string; html: string }
  | { phase: 'error'; message: string }
