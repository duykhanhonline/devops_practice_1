import type { StatusResponse } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

function requireApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set')
  }
  return API_BASE_URL
}

export async function submitJob(url: string): Promise<{ jobId: string }> {
  const response = await fetch(`${requireApiBaseUrl()}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!response.ok) {
    throw new Error(`Failed to submit job (${response.status})`)
  }
  return response.json()
}

export async function getJobStatus(jobId: string): Promise<StatusResponse> {
  const response = await fetch(`${requireApiBaseUrl()}/status/${jobId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch job status (${response.status})`)
  }
  return response.json()
}
