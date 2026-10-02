# MINTLINE

**Minimal Solana execution-control MVP with explicit safety guardrails.**

MINTLINE is a paper-execution system for testing deterministic token-entry and position-management rules without submitting live transactions.

> **Safety: paper execution only. No private-key signer or live transaction submission is included. `EXECUTION_ENABLED` remains locked by default.**

## What It Demonstrates

- permanent contract-address blocking after a buy
- capital guardrails
- deterministic take-profit rules
- daily trade limits
- daily loss limits
- consecutive-loss protection
- maximum concurrent positions
- operator-console workflows

## Default Rules

| Rule | Default |
|---|---:|
| Buy size | $5 |
| TP1 | +50% → sell 70% |
| TP2 | +100% → sell 20% |
| Remaining position | 10% |
| Daily trades | 100 max |
| Daily loss | $25 max |
| Consecutive losses | 5 max |
| Minimum balance | 0.05 SOL |
| Concurrent positions | 10 max |

These are **MINTLINE configuration defaults**, not investment recommendations or claims of profitability.

## Safety Model

The project intentionally separates rule evaluation from live execution. The repository does not include a private-key signer or live transaction submission path.

Before any real-money deployment, the system would require additional security review, execution testing, key-management design, monitoring, and operational controls.

## Run

```powershell
pnpm install
Copy-Item .env.example .env
pnpm run typecheck
pnpm run test
pnpm --filter @mintline/api dev
pnpm --filter @mintline/web dev
```

## Project Position

MINTLINE is best viewed as a **systems and safety-engineering prototype**: explicit rules, bounded execution, and conservative defaults are part of the design.