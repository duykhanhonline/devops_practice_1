import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const TABLE_NAME = process.env.TABLE_NAME
const BUCKET_NAME = process.env.BUCKET_NAME
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',')
const RESULT_URL_EXPIRY_SECONDS = 900

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3 = new S3Client({})

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

  const jobId = event.pathParameters?.jobId
  if (!jobId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'jobId is required' }) }
  }

  const { Item: item } = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { jobId } }))

  if (!item) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'job not found' }) }
  }

  if (item.status === 'failed') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'failed', error: item.error ?? 'Crawl failed' }),
    }
  }

  if (item.status === 'done') {
    const resultUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: item.resultKey }),
      { expiresIn: RESULT_URL_EXPIRY_SECONDS },
    )
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'done', resultUrl }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ status: item.status }) }
}
