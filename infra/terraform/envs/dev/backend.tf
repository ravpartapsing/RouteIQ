terraform {
  required_version = ">= 1.10"
  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 6.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.7" }
    random  = { source = "hashicorp/random", version = "~> 3.6" }
  }

  # S3-native locking (use_lockfile) — no DynamoDB lock table to pay for.
  backend "s3" {
    bucket       = "routeiq-tfstate-504730079367"
    key          = "envs/dev/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region
  # This account also runs Inkto; pinning it stops an apply landing in the wrong one.
  allowed_account_ids = ["504730079367"]
  default_tags {
    tags = { Project = "routeiq", Env = "dev", ManagedBy = "terraform" }
  }
}
