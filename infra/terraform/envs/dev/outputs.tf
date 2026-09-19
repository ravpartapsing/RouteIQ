output "api_url" {
  description = "Pass to the apps as API_BASE_URL."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "table_name" {
  value = aws_dynamodb_table.main.name
}

output "documents_bucket" {
  value = aws_s3_bucket.documents.bucket
}
