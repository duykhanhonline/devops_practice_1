# URL Crawler App

Monorepo containing both halves of an async URL-crawling app: a React + TypeScript frontend and an AWS SAM-managed backend (API Gateway, Lambda, SQS, DynamoDB, S3).

## Working style

Work step by step, one step at a time. Before starting each step, state what you're about to do and wait for explicit confirmation before proceeding. Do not batch multiple steps together or continue to the next step on your own judgment — always stop and ask.

## Project structure

```
project-root/
  frontend/          # React + TypeScript SPA
  backend/           # SAM template + Lambda source
    template.yaml
    src/
      submit/
      crawler/
      status/
  CLAUDE.md
```

`frontend/` and `backend/` are deployed independently:
- `backend/` is a SAM app — `sam build && sam deploy` provisions API Gateway, the three Lambdas, DynamoDB table, SQS queue, and the results S3 bucket.
- `frontend/` builds to static assets (`npm run build`) and deploys separately to its own S3 + CloudFront hosting bucket — SAM does not manage frontend hosting.

Root `.gitignore` should cover both `frontend/node_modules/` and `backend/.aws-sam/`.

## What this app does

User submits a URL. Backend crawls it and returns the raw HTML. Because the crawl is async (queued, not instant), the frontend submits a job, then polls for status until the result is ready.

## Backend architecture (for context, not owned by this repo)

React SPA (S3 + CloudFront) → API Gateway → Submit Lambda → writes job to DynamoDB, enqueues to SQS → Crawler Lambda (SQS-triggered) → fetches URL, writes raw HTML to S3, updates DynamoDB status.

Client polls a Status Lambda via API Gateway. Once a job is `done`, the status response includes a presigned S3 GET URL (short expiry, ~5-15 min) rather than the HTML itself — the client fetches the HTML directly from S3, bypassing Lambda/API Gateway payload limits.

## Backend API contract

```
POST /jobs
  body: { url: string }
  response: { jobId: string }

GET /status/{jobId}
  response: {
    status: "pending" | "processing" | "done" | "failed",
    resultUrl?: string,   // presigned S3 URL, present when status === "done"
    error?: string        // present when status === "failed"
  }
```

Notes:
- `resultUrl` expires. If a fetch to it 403s, re-poll `/status/{jobId}` for a fresh one rather than treating it as a terminal failure.
- The S3 bucket has CORS enabled for `GET` from this app's origin — required for the browser to fetch `resultUrl` directly.

## Frontend structure

- `UrlForm` — URL input + submit button, client-side validation via the `URL` constructor before submit.
- `StatusIndicator` — shows `queued → crawling → done/failed`.
- `ResultViewer` — displays the crawled HTML.
- `useCrawlJob(url)` — hook owning the state machine and polling logic. Components stay presentational.

State machine: `idle → submitting → polling → done | error`.

Polling: interval-based (~1-2s) against `/status/{jobId}`, cleared on `done`, `failed`, or unmount.

Optional: persist recent jobs (URL + jobId + timestamp) to `localStorage` for a lightweight history list — not required for core functionality.

## Rendering the raw HTML — security rule

The HTML body comes from `resultUrl` is untrusted, crawled content — never render it with `dangerouslySetInnerHTML`. That executes any `<script>` tags on the crawled page in this app's origin.

- Default view: plain text in a `<pre>` / code-viewer block. Completely inert.
- Optional "preview" tab: sandboxed `<iframe sandbox="allow-same-origin">` (deliberately omit `allow-scripts`) using `srcDoc` or pointed at `resultUrl`.
- Nice-to-haves: copy-to-clipboard, download-as-`.html`.

## Tech stack / conventions

- React 18+, TypeScript strict mode, functional components + hooks only (no class components).
- Local component state via `useState`/`useEffect`; no external state library needed at this scale.
- Fetch via native `fetch`, no HTTP client library needed for two endpoints.
- Styling approach: not yet decided — pick one and note it here once chosen.

## Open decisions

- Styling library/approach.
- Error message copy for failed crawls / bad URLs.
- Whether to add job history persistence beyond `localStorage`.
- Testing approach (unit tests for `useCrawlJob` state machine are the highest-value target).
