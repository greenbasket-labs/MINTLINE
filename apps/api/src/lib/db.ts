import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

import {
  DEFAULTS,
  type BotConfig,
} from "@mintline/shared";

const file =
  process.env.DATABASE_PATH ?? "./data/mintline.db";

mkdirSync(
  path.dirname(path.resolve(file)),
  { recursive: true },
);

export const db = new DatabaseSync(file);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;

  CREATE TABLE IF NOT EXISTS config(
    id INTEGER PRIMARY KEY CHECK(id=1),
    buyAmountUsd REAL NOT NULL,
    maxBuysPerCa INTEGER NOT NULL,
    dailyMaxTrades INTEGER NOT NULL,
    dailyMaxLossUsd REAL NOT NULL,
    slippageBps INTEGER NOT NULL,
    priorityFeeLamports INTEGER NOT NULL,
    rpcUrl TEXT NOT NULL,
    tp1Percent REAL NOT NULL,
    tp1SellPercent REAL NOT NULL,
    tp2Percent REAL NOT NULL,
    tp2SellPercent REAL NOT NULL,
    moonbagPercent REAL NOT NULL,
    consecutiveLossStop INTEGER NOT NULL,
    minimumWalletBalanceSol REAL NOT NULL,
    maximumConcurrentPositions INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS state(
    id INTEGER PRIMARY KEY CHECK(id=1),
    status TEXT NOT NULL,
    consecutiveLosses INTEGER NOT NULL DEFAULT 0,
    lastEvent TEXT,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS blocked_ca(
    ca TEXT PRIMARY KEY,
    firstBuyAt TEXT NOT NULL,
    buyPrice REAL NOT NULL,
    status TEXT NOT NULL,
    soldPercent REAL NOT NULL DEFAULT 0,
    moonbagPercent REAL NOT NULL,
    txHash TEXT
  );

  CREATE TABLE IF NOT EXISTS trades(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ca TEXT NOT NULL,
    buyTime TEXT NOT NULL,
    buyPrice REAL NOT NULL,
    currentStatus TEXT NOT NULL,
    soldPercent REAL NOT NULL DEFAULT 0,
    moonbagPercent REAL NOT NULL,
    transactionHash TEXT,
    currentValueUsd REAL NOT NULL DEFAULT 0,
    currentProfitPercent REAL NOT NULL DEFAULT 0,
    isActive INTEGER NOT NULL DEFAULT 1,
    sellTime TEXT
  );

  CREATE TABLE IF NOT EXISTS trade_results(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tradeId INTEGER NOT NULL,
    buyAmountUsd REAL NOT NULL,
    sellAmountUsd REAL,
    sellTime TEXT
  );

  CREATE TABLE IF NOT EXISTS logs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    result TEXT NOT NULL,
    error TEXT
  );
`);

const existingConfig = db
  .prepare("SELECT 1 FROM config WHERE id=1")
  .get();

if (!existingConfig) {
  db.prepare(`
    INSERT INTO config(
      id,
      buyAmountUsd,
      maxBuysPerCa,
      dailyMaxTrades,
      dailyMaxLossUsd,
      slippageBps,
      priorityFeeLamports,
      rpcUrl,
      tp1Percent,
      tp1SellPercent,
      tp2Percent,
      tp2SellPercent,
      moonbagPercent,
      consecutiveLossStop,
      minimumWalletBalanceSol,
      maximumConcurrentPositions
    )
    VALUES(
      1,
      @buyAmountUsd,
      @maxBuysPerCa,
      @dailyMaxTrades,
      @dailyMaxLossUsd,
      @slippageBps,
      @priorityFeeLamports,
      @rpcUrl,
      @tp1Percent,
      @tp1SellPercent,
      @tp2Percent,
      @tp2SellPercent,
      @moonbagPercent,
      @consecutiveLossStop,
      @minimumWalletBalanceSol,
      @maximumConcurrentPositions
    )
  `).run({
    buyAmountUsd: DEFAULTS.buyAmountUsd,
    maxBuysPerCa: DEFAULTS.maxBuysPerCa,
    dailyMaxTrades: DEFAULTS.dailyMaxTrades,
    dailyMaxLossUsd: DEFAULTS.dailyMaxLossUsd,
    slippageBps: DEFAULTS.slippageBps,
    priorityFeeLamports: DEFAULTS.priorityFeeLamports,
    rpcUrl:
      process.env.SOLANA_RPC_URL ??
      "https://api.mainnet-beta.solana.com",
    tp1Percent: DEFAULTS.tp1Percent,
    tp1SellPercent: DEFAULTS.tp1SellPercent,
    tp2Percent: DEFAULTS.tp2Percent,
    tp2SellPercent: DEFAULTS.tp2SellPercent,
    moonbagPercent: DEFAULTS.moonbagPercent,
    consecutiveLossStop: DEFAULTS.consecutiveLossStop,
    minimumWalletBalanceSol:
      DEFAULTS.minimumWalletBalanceSol,
    maximumConcurrentPositions:
      DEFAULTS.maximumConcurrentPositions,
  });
}

const existingState = db
  .prepare("SELECT 1 FROM state WHERE id=1")
  .get();

if (!existingState) {
  db.prepare(`
    INSERT INTO state(
      id,
      status,
      consecutiveLosses,
      lastEvent,
      updatedAt
    )
    VALUES(1, 'stopped', 0, NULL, ?)
  `).run(new Date().toISOString());
}

export function getConfig(): BotConfig {
  const row = db
    .prepare("SELECT * FROM config WHERE id=1")
    .get() as Record<string, unknown> | undefined;

  if (!row) {
    throw new Error(
      "MINTLINE configuration row does not exist",
    );
  }

  return {
    buyAmountUsd: Number(row.buyAmountUsd),
    maxBuysPerCa: Number(row.maxBuysPerCa),
    dailyMaxTrades: Number(row.dailyMaxTrades),
    dailyMaxLossUsd: Number(row.dailyMaxLossUsd),
    slippageBps: Number(row.slippageBps),
    priorityFeeLamports: Number(
      row.priorityFeeLamports,
    ),
    rpcUrl: String(row.rpcUrl),
    tp1Percent: Number(row.tp1Percent),
    tp1SellPercent: Number(row.tp1SellPercent),
    tp2Percent: Number(row.tp2Percent),
    tp2SellPercent: Number(row.tp2SellPercent),
    moonbagPercent: Number(row.moonbagPercent),
    consecutiveLossStop: Number(
      row.consecutiveLossStop,
    ),
    minimumWalletBalanceSol: Number(
      row.minimumWalletBalanceSol,
    ),
    maximumConcurrentPositions: Number(
      row.maximumConcurrentPositions,
    ),
  };
}

export function setConfig(
  input: Partial<BotConfig>,
): BotConfig {
  const next: BotConfig = {
    ...getConfig(),
    ...input,
  };

  const statement = db.prepare(`
    UPDATE config SET
      buyAmountUsd=@buyAmountUsd,
      maxBuysPerCa=@maxBuysPerCa,
      dailyMaxTrades=@dailyMaxTrades,
      dailyMaxLossUsd=@dailyMaxLossUsd,
      slippageBps=@slippageBps,
      priorityFeeLamports=@priorityFeeLamports,
      rpcUrl=@rpcUrl,
      tp1Percent=@tp1Percent,
      tp1SellPercent=@tp1SellPercent,
      tp2Percent=@tp2Percent,
      tp2SellPercent=@tp2SellPercent,
      moonbagPercent=@moonbagPercent,
      consecutiveLossStop=@consecutiveLossStop,
      minimumWalletBalanceSol=@minimumWalletBalanceSol,
      maximumConcurrentPositions=@maximumConcurrentPositions
    WHERE id=1
  `);

  statement.run({
    buyAmountUsd: next.buyAmountUsd,
    maxBuysPerCa: next.maxBuysPerCa,
    dailyMaxTrades: next.dailyMaxTrades,
    dailyMaxLossUsd: next.dailyMaxLossUsd,
    slippageBps: next.slippageBps,
    priorityFeeLamports: next.priorityFeeLamports,
    rpcUrl: next.rpcUrl,
    tp1Percent: next.tp1Percent,
    tp1SellPercent: next.tp1SellPercent,
    tp2Percent: next.tp2Percent,
    tp2SellPercent: next.tp2SellPercent,
    moonbagPercent: next.moonbagPercent,
    consecutiveLossStop: next.consecutiveLossStop,
    minimumWalletBalanceSol:
      next.minimumWalletBalanceSol,
    maximumConcurrentPositions:
      next.maximumConcurrentPositions,
  });

  return next;
}

export function log(
  action: string,
  result: string,
  error?: string,
): void {
  db.prepare(`
    INSERT INTO logs(
      timestamp,
      action,
      result,
      error
    )
    VALUES(?, ?, ?, ?)
  `).run(
    new Date().toISOString(),
    action,
    result,
    error ?? null,
  );
}