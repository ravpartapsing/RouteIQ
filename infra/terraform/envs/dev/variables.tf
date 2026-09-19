variable "region" {
  type    = string
  default = "us-east-1"
}

variable "name" {
  type    = string
  default = "routeiq-dev"
}

variable "budget_email" {
  description = "Where budget alerts go. Set in terraform.tfvars (gitignored)."
  type        = string
}

variable "monthly_budget_usd" {
  description = "Alert threshold for the whole account (RouteIQ and Inkto combined)."
  type        = number
  default     = 40
}

variable "cors_origins" {
  description = "Browser origins allowed to call the API — the web portal runs on the Mac during UAT."
  type        = list(string)
  default     = ["http://localhost:5173"]
}
