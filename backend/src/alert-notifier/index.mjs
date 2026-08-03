const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

export const handler = async (event) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message)
    const { AlarmName, NewStateReason, StateChangeTime, Trigger } = message

    const text = `:rotating_light: *${AlarmName}*\n${NewStateReason}\nMetric: ${Trigger?.MetricName} | Time: ${StateChangeTime}`

    if (!SLACK_WEBHOOK_URL) {
      console.log('SLACK_WEBHOOK_URL not set, would have sent:', text)
      continue
    }

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  }
}
