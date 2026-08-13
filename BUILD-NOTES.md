# MINTLINE build

This is a clean, minimal rebuild of the current foundation.

Implemented:
- five-page operator UI
- Express API
- SQLite WAL persistence
- permanent CA blacklist
- per-CA locking
- execution lock
- minimum wallet, daily trade, daily loss, consecutive-loss and concurrent-position gates
- deterministic TP1 -> TP2 ordering
- 10% moonbag protection
- paper execution
- TP unit tests

Not implemented deliberately:
- private-key signing
- live Solana transaction submission
- live token price subscriptions
- automatic live selling

Those boundaries should remain locked until the paper flow is fully tested.
