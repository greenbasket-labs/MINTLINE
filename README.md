# MINTLINE

Minimal Solana execution-control MVP with permanent CA blocking, capital guardrails, deterministic TP rules, and a five-page operator console.

**Safety:** this package is paper-execution only. No private-key signer or live transaction submission is included. `EXECUTION_ENABLED` remains locked by default.

## Run

```powershell
pnpm install
Copy-Item .env.example .env
pnpm run typecheck
pnpm run test
pnpm --filter @mintline/api dev
pnpm --filter @mintline/web dev
```

## Rules

- $5 default buy
- One buy per CA, permanently blocked afterward
- TP1 +50% -> sell 70%
- TP2 +100% -> sell 20%
- 10% moonbag never auto-sold
- 100 daily trades
- $25 daily loss limit
- 5 consecutive-loss stop
- 0.05 SOL minimum balance
- 10 maximum concurrent positions
