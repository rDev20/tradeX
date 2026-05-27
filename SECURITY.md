# Security Policy

## Reporting a vulnerability

If you find a security issue, **do not open a public GitHub issue.**

Email: `security@tradex.in`

Include:
- Description of the issue
- Steps to reproduce
- Potential impact
- Your contact info (for coordinated disclosure)

We commit to:
- Acknowledging your report within **2 business days**
- Providing a fix timeline within **5 business days**
- Crediting you in release notes (if you consent)

## Scope

In scope:
- All `*.tradex.in` domains
- The tradeX web app, admin console, API
- Infrastructure under our control

Out of scope:
- Third-party services (Clerk, Razorpay, Zerodha, OpenAI — report directly to them)
- Social-engineering attacks on employees
- Physical security

## Bug bounty

We plan to launch a formal bug-bounty program post-launch (see [docs/PRODUCT_SPEC.md §17.6](docs/PRODUCT_SPEC.md)). Until then, we handle disclosures internally.

## Security best practices for contributors

See [CONTRIBUTING.md](CONTRIBUTING.md) section on secrets handling, and [docs/SOLUTION_ARCHITECTURE.md §11](docs/SOLUTION_ARCHITECTURE.md) for our threat model.
