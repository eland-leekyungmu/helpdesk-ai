# =============================================================
# OpenSearch Serverless (us-east-1) - Vector Store for Bedrock KB
# This module must be called with provider = aws.us_east_1
# =============================================================

data "aws_caller_identity" "current" {}

locals {
  collection_name = "${var.collection_name}-${var.environment}"
}

# Encryption Policy (required before collection creation)
resource "aws_opensearchserverless_security_policy" "encryption" {
  name = "${var.project_name}-enc-${var.environment}"
  type = "encryption"

  policy = jsonencode({
    Rules = [
      {
        Resource     = ["collection/${local.collection_name}"]
        ResourceType = "collection"
      }
    ]
    AWSOwnedKey = true
  })
}

# Network Policy
resource "aws_opensearchserverless_security_policy" "network" {
  name = "${var.project_name}-net-${var.environment}"
  type = "network"

  policy = jsonencode([
    {
      Rules = [
        {
          Resource     = ["collection/${local.collection_name}"]
          ResourceType = "collection"
        }
      ]
      AllowFromPublic = true
    }
  ])
}

# Collection
resource "aws_opensearchserverless_collection" "vectors" {
  name = local.collection_name
  type = "VECTORSEARCH"

  depends_on = [
    aws_opensearchserverless_security_policy.encryption,
    aws_opensearchserverless_security_policy.network,
  ]

  tags = {
    Name = local.collection_name
  }
}

# Data Access Policy (allows Bedrock KB role to access)
resource "aws_opensearchserverless_access_policy" "bedrock" {
  name = "${var.project_name}-kb-access-${var.environment}"
  type = "data"

  policy = jsonencode([
    {
      Rules = [
        {
          Resource     = ["collection/${local.collection_name}"]
          ResourceType = "collection"
          Permission   = ["aoss:CreateCollectionItems", "aoss:UpdateCollectionItems", "aoss:DescribeCollectionItems"]
        },
        {
          Resource     = ["index/${local.collection_name}/*"]
          ResourceType = "index"
          Permission   = ["aoss:CreateIndex", "aoss:DeleteIndex", "aoss:UpdateIndex", "aoss:DescribeIndex", "aoss:ReadDocument", "aoss:WriteDocument"]
        }
      ]
      Principal = [
        "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-bedrock-kb-role-${var.environment}",
        "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
      ]
    }
  ])
}
