import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const TABLE_NAME = process.env.TABLE_NAME
const QUEUE_URL = process.env.QUEUE_URL
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',')

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const sqs = new SQSClient({})

function corsHeaders(event) {
  const origin = event.headers?.Origin ?? event.headers?.origin
  const headers = { 'Content-Type': 'application/json' }
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type'
  }
  return headers
}

export const handler = async (event) => {
  const headers = corsHeaders(event)

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const badRequest = (message) => ({ statusCode: 400, headers, body: JSON.stringify({ error: message }) })

  let body
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return badRequest('Invalid JSON body')
  }

  const { url } = body
  if (typeof url !== 'string') {
    return badRequest('url is required')
  }
  try {
    new URL(url)
  } catch {
    return badRequest('url must be a valid URL')
  }

  const jobId = randomUUID()
  const now = new Date().toISOString()

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { jobId, url, status: 'pending', createdAt: now, updatedAt: now },
    }),
  )

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify({ jobId, url }),
    }),
  )

  return { statusCode: 201, headers, body: JSON.stringify({ jobId }) }
}
