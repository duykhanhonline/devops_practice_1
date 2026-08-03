import { useState } from 'react'
import type { SubmitEvent } from 'react'

interface UrlFormProps {
  onSubmit: (url: string) => void
  disabled: boolean
}

export function UrlForm({ onSubmit, disabled }: UrlFormProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      new URL(value)
    } catch {
      setError('Enter a valid URL, e.g. https://example.com')
      return
    }

    setError(null)
    onSubmit(value)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="url-input">URL to crawl</label>
      <input
        id="url-input"
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="https://example.com"
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || value.length === 0}>
        Submit
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
