# @tradex/web-admin

Internal admin console. Role-gated. Access restricted to tradeX staff.

## Features

- User management
- Billing dashboard (MRR, churn, LTV)
- Ops dashboards (signal rate, order rate, queue depths)
- Broker integration health per provider
- Telegram ingestion health per user
- Compliance audit log browser
- Platform-wide kill switch

Runs on `:3001`. Deployed on a separate subdomain `admin.tradex.in`, IP-allowlisted.
