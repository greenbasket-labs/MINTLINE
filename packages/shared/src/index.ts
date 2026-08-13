export const DEFAULTS = Object.freeze({
  buyAmountUsd: 5, maxBuysPerCa: 1, dailyMaxTrades: 100,
  dailyMaxLossUsd: 25, tp1Percent: 50, tp1SellPercent: 70,
  tp2Percent: 100, tp2SellPercent: 20, moonbagPercent: 10,
  consecutiveLossStop: 5, minimumWalletBalanceSol: 0.05,
  maximumConcurrentPositions: 10, slippageBps: 100, priorityFeeLamports: 10000
});

export type BotStatus = "stopped" | "running" | "emergency_stop";
export interface BotConfig {
  buyAmountUsd:number; maxBuysPerCa:number; dailyMaxTrades:number;
  dailyMaxLossUsd:number; slippageBps:number; priorityFeeLamports:number;
  rpcUrl:string; tp1Percent:number; tp1SellPercent:number; tp2Percent:number;
  tp2SellPercent:number; moonbagPercent:number; consecutiveLossStop:number;
  minimumWalletBalanceSol:number; maximumConcurrentPositions:number;
}
export interface SellDecision {
  sellPercent:number;
  stage:"hold"|"tp1"|"tp2";
}
