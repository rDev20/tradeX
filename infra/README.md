# infra/

Infrastructure-as-code for tradeX.

## Layout

```
terraform/
├── environments/
│   ├── dev/              Local / developer playground
│   ├── staging/          Shared staging env
│   └── prod/             Production (ap-south-1 Mumbai)
└── modules/
    ├── vpc/              VPC + subnets + NAT
    ├── ecs/              Fargate cluster + services
    ├── rds/              Postgres
    ├── elasticache/      Redis
    ├── s3/               Buckets + lifecycle
    ├── kms/              Master keys
    ├── cloudflare/       DNS + WAF
    └── secrets/          Secrets Manager

cdk/                      App-specific constructs (CDK is complementary to TF)
k8s/                      Helm charts (v2+)
docker/                   Dockerfiles per service
```

## Environments

- **dev** — minimal; single AZ; cheap
- **staging** — prod-shaped; synthetic data
- **prod** — multi-AZ; cross-region DR to ap-south-2

## Bootstrapping

```bash
cd infra/terraform/environments/dev
terraform init
terraform plan
terraform apply
```

Backend state stored in S3 with DynamoDB lock.

## Secrets

Never in TF files. All via AWS Secrets Manager data sources.
