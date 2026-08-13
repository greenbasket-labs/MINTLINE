import {
  acquireCaLock,
  alreadyBought,
  releaseCaLock,
  riskGate,
  validateCa,
} from "./guards.js";

import { db, getConfig, log } from "../lib/db.js";

export async function submitBuy(
  ca: string,
  walletBalanceSol: number,
  buyPrice: number,
) {
  // Validate the contract address first.
  if (!validateCa(ca)) {
    throw new Error("Invalid Solana contract address");
  }

  // Buy price must be a valid positive number.
  if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
    throw new Error("Invalid buy price");
  }

  // Prevent two simultaneous requests for the same CA.
  if (!acquireCaLock(ca)) {
    return {
      accepted: false,
      reason: "CA is already queued",
    };
  }

  try {
    // A CA that has ever been bought is permanently blocked.
    if (alreadyBought(ca)) {
      return {
        accepted: false,
        reason: "CA permanently blocked",
      };
    }

    // Check all capital-protection rules before accepting the buy.
    const gate = riskGate(walletBalanceSol);

    if (!gate.ok) {
      return {
        accepted: false,
        reason: gate.reason,
      };
    }

    /*
     * PAPER EXECUTION ONLY
     *
     * There is currently:
     * - no private-key signer
     * - no wallet connection
     * - no live Solana transaction
     *
     * This records the accepted trade locally so we can verify
     * the complete MINTLINE control flow before live execution.
     */

    const config = getConfig();
    const now = new Date().toISOString();

    const txHash =
      `PAPER-${Date.now()}-` +
      Math.random().toString(36).slice(2, 10);

    /*
     * node:sqlite does not provide better-sqlite3's
     * db.transaction() helper.
     *
     * Use explicit SQLite transaction control instead.
     */

    db.exec("BEGIN");

    try {
      /*
       * Permanently block this CA immediately.
       *
       * This is important because the requirement is:
       *
       * BUY ONCE PER CA — FOREVER
       *
       * Even if the position is later sold, the CA remains blocked.
       */

      db.prepare(`
        INSERT INTO blocked_ca
          (
            ca,
            firstBuyAt,
            buyPrice,
            status,
            soldPercent,
            moonbagPercent,
            txHash
          )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        ca,
        now,
        buyPrice,
        "bought",
        0,
        config.moonbagPercent,
        txHash,
      );

      /*
       * Create the active trade record.
       */

      const result = db.prepare(`
        INSERT INTO trades
          (
            ca,
            buyTime,
            buyPrice,
            currentStatus,
            soldPercent,
            moonbagPercent,
            transactionHash,
            currentValueUsd,
            currentProfitPercent,
            isActive
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ca,
        now,
        buyPrice,
        "bought",
        0,
        config.moonbagPercent,
        txHash,
        config.buyAmountUsd,
        0,
        1,
      );

      /*
       * Both database writes succeeded.
       */
      db.exec("COMMIT");

      log(
        "Buy",
        "Accepted (paper execution)",
      );

      return {
        accepted: true,
        tradeId: result.lastInsertRowid,
        txHash,
        execution: "paper" as const,
      };
    } catch (error) {
      /*
       * If either database operation fails,
       * undo the entire transaction.
       */
      db.exec("ROLLBACK");

      throw error;
    }
  } finally {
    /*
     * Always release the CA lock, including when
     * validation, risk checks, or database operations fail.
     */
    releaseCaLock(ca);
  }
}