# tradeX Deployment Flow

This repo uses two long-lived branches:

- `develop`: staging branch for everyday development and review.
- `main`: production branch. Merge into this only after staging looks good.

## Daily Development

Start new work from `develop`:

```bash
git switch develop
git pull origin develop
```

Commit and push changes to staging:

```bash
git add .
git commit -m "Describe the change"
git push origin develop
```

Pushing `develop` deploys staging at:

```text
https://staging.103-240-24-3.nip.io
```

## Production Release

After staging is verified, open a GitHub pull request:

```text
develop -> main
```

Merge the pull request only after CI is green. Production deploy runs from `main`
after CI succeeds.

Production URL:

```text
https://103-240-24-3.nip.io
```

## GitHub Branch Protection

In GitHub, open:

```text
Settings -> Branches -> Add branch protection rule
```

Use this branch pattern:

```text
main
```

Recommended settings:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Do not allow bypassing the above settings.
- Block force pushes.
- Block deletions.

## VM Layout

Production:

```text
/opt/tradex
service: tradex-web
service: tradex-worker
port: 3000
```

Staging:

```text
/opt/tradex-staging
service: tradex-staging-web
worker: disabled
port: 3001
```

The staging worker is intentionally disabled so Telegram ingestion and trade
processing do not run twice.

## VM Scripts

One-time VM setup:

```bash
sudo bash /opt/tradex/demo/infra/bootstrap-vm.sh
```

Normal app deploy:

```bash
sudo bash /opt/tradex/demo/infra/deploy.sh
```
