import json
import logging
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone

import boto3

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
FETCH_TIMEOUT_SECONDS = 10

table = boto3.resource("dynamodb").Table(TABLE_NAME)
s3 = boto3.client("s3")

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))


def handler(event, context):
    for record in event["Records"]:
        _process_record(record)


def _process_record(record):
    message = json.loads(record["body"])
    job_id = message["jobId"]
    url = message["url"]

    logger.info("Processing job %s: %s", job_id, url)
    _update_status(job_id, "processing")

    try:
        html = _fetch(url)
    except Exception as exc:
        # Any fetch failure is a terminal outcome for this job, not a transient
        # Lambda error — swallow it and mark the job failed instead of raising,
        # so SQS doesn't redeliver and retry a URL that will never succeed.
        logger.warning("Fetch failed for job %s (%s): %s", job_id, url, exc)
        _update_status(job_id, "failed", error=str(exc))
        return

    logger.info("Fetched %d chars for job %s", len(html), job_id)

    result_key = f"results/{job_id}.html"
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=result_key,
        Body=html.encode("utf-8"),
        ContentType="text/html; charset=utf-8",
    )
    logger.info("Wrote result to s3://%s/%s", BUCKET_NAME, result_key)

    _update_status(job_id, "done", result_key=result_key)
    logger.info("Job %s done", job_id)


def _fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "url-crawler-app/1.0"})
    with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT_SECONDS) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def _update_status(job_id, status, *, result_key=None, error=None):
    names = {"#status": "status"}
    values = {":status": status, ":now": datetime.now(timezone.utc).isoformat()}
    set_clauses = ["#status = :status", "updatedAt = :now"]

    if result_key is not None:
        set_clauses.append("resultKey = :resultKey")
        values[":resultKey"] = result_key

    if error is not None:
        names["#error"] = "error"
        set_clauses.append("#error = :error")
        values[":error"] = error

    table.update_item(
        Key={"jobId": job_id},
        UpdateExpression="SET " + ", ".join(set_clauses),
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )
