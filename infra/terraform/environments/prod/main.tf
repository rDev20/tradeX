# tradeX — Production Terraform entry
#
# Region: ap-south-1 (Mumbai)
# DR:     ap-south-2 (Hyderabad) — warm standby
#
# State backend: S3 bucket `tradex-tfstate-prod` with DynamoDB lock `tradex-tfstate-lock`.

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws        = { source = "hashicorp/aws", version = "~> 5.70" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.40" }
  }

  backend "s3" {
    bucket         = "tradex-tfstate-prod"
    key            = "env/prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "tradex-tfstate-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = "ap-south-1"
  default_tags {
    tags = {
      Environment = "prod"
      Project     = "tradex"
      ManagedBy   = "terraform"
    }
  }
}

provider "aws" {
  alias  = "dr"
  region = "ap-south-2"
  default_tags {
    tags = {
      Environment = "prod"
      Project     = "tradex"
      Role        = "dr"
    }
  }
}

# Modules to be added: vpc, rds, elasticache, ecs, s3, kms, cloudflare, secrets
