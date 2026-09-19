data "aws_caller_identity" "current" {}

locals {
  table = jsondecode(file("${path.module}/../../generated/table.json"))
}

# ---------------------------------------------------------------------------
# Budget. The account had no billing alarm at all before this.
# Account-wide on purpose: a per-project tag filter only works after the tag is activated
# for cost allocation (~24 h), and the gap is exactly when a mistake is most likely.
# ---------------------------------------------------------------------------
resource "aws_budgets_budget" "account" {
  name         = "account-monthly-total"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  dynamic "notification" {
    for_each = [50, 80, 100]
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_email]
    }
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_email]
  }
}

# ---------------------------------------------------------------------------
# DynamoDB — built from generated/table.json, the same definition DynamoDB Local uses.
# ---------------------------------------------------------------------------
resource "aws_dynamodb_table" "main" {
  name                        = var.name
  billing_mode                = local.table.billing
  hash_key                    = local.table.partitionKey.name
  range_key                   = local.table.sortKey.name
  stream_enabled              = local.table.streams
  stream_view_type            = local.table.streams ? "NEW_AND_OLD_IMAGES" : null
  deletion_protection_enabled = true

  dynamic "attribute" {
    for_each = distinct(concat(
      [local.table.partitionKey, local.table.sortKey],
      flatten([for g in local.table.globalSecondaryIndexes : [g.partitionKey, g.sortKey]]),
    ))
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  dynamic "global_secondary_index" {
    for_each = local.table.globalSecondaryIndexes
    content {
      name            = global_secondary_index.value.name
      projection_type = global_secondary_index.value.projection
      key_schema {
        attribute_name = global_secondary_index.value.partitionKey.name
        key_type       = "HASH"
      }
      key_schema {
        attribute_name = global_secondary_index.value.sortKey.name
        key_type       = "RANGE"
      }
    }
  }

  ttl {
    attribute_name = local.table.ttlAttribute
    enabled        = true
  }

  point_in_time_recovery {
    enabled = local.table.pointInTimeRecovery
  }

  server_side_encryption { enabled = true }
}

# ---------------------------------------------------------------------------
# S3 — documents (POD photos, BOLs, invoice PDFs). Private; access only via presigned URLs.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "documents" {
  bucket = "${var.name}-documents-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket                  = aws_s3_bucket.documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_cors_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  cors_rule {
    allowed_methods = ["GET", "PUT"]
    allowed_origins = var.cors_origins
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    id     = "abort-stale-uploads"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}

# ---------------------------------------------------------------------------
# Lambda — the Fastify API, bundled by `pnpm --filter @routeiq/api build:lambda`.
# ---------------------------------------------------------------------------
data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../apps/api/dist-lambda"
  output_path = "${path.module}/.build/api.zip"
}

resource "aws_iam_role" "api" {
  name = "${var.name}-api"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "api_logs" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Least privilege: this table, its indexes, this bucket. Nothing else in the account.
resource "aws_iam_role_policy" "api_data" {
  name = "data"
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem",
          "dynamodb:Query", "dynamodb:BatchGetItem", "dynamodb:BatchWriteItem",
          "dynamodb:TransactGetItems", "dynamodb:TransactWriteItems",
          "dynamodb:ConditionCheckItem", "dynamodb:DescribeTable",
        ]
        Resource = [aws_dynamodb_table.main.arn, "${aws_dynamodb_table.main.arn}/index/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.documents.arn}/*"
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${var.name}-api"
  retention_in_days = 14
}

resource "aws_lambda_function" "api" {
  function_name    = "${var.name}-api"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  architectures    = ["arm64"] # ~20% cheaper than x86 per GB-second
  handler          = "index.handler"
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256
  memory_size      = 512
  timeout          = 10

  environment {
    variables = {
      STAGE                = "dev"
      LOG_LEVEL            = "info"
      TABLE_NAME           = aws_dynamodb_table.main.name
      S3_BUCKET            = aws_s3_bucket.documents.bucket
      CORS_ORIGINS         = join(",", var.cors_origins)
      FEATURE_MAPS         = "true"
      FEATURE_ROUTING      = "false"
      FEATURE_MAP_MATCHING = "false"
      MAP_STYLE_URL        = "https://tiles.openfreemap.org/styles/liberty"
    }
  }

  depends_on = [aws_cloudwatch_log_group.api, aws_iam_role_policy_attachment.api_logs]
}

# ---------------------------------------------------------------------------
# API Gateway HTTP API — the default execute-api URL is what the apps use during testing.
# ---------------------------------------------------------------------------
resource "aws_apigatewayv2_api" "api" {
  name          = "${var.name}-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "all" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  # The URL is public. These limits cap what a stray loop or a scraper can cost.
  default_route_settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
