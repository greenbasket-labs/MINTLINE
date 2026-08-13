import {performance} from "node:perf_hooks";
import {getConfig,log} from "../lib/db.js";
import {sellDecision,validateTp} from "./takeProfit.js";

export interface SimulationRequest {
  ca:string;
  buyPrice:number;
  profitSequence?:number[];
}

export function simulateTrade(input:SimulationRequest) {
  const started=performance.now();
  const c=getConfig();
  if(!validateTp(c)) throw new Error("Invalid TP configuration");
  if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.ca)) throw new Error("Invalid Solana contract address");
  if(!Number.isFinite(input.buyPrice) || input.buyPrice<=0) throw new Error("Invalid buy price");

  const acceptedAt=performance.now();
  const profits=input.profitSequence?.length ? input.profitSequence : [0,c.tp1Percent,c.tp2Percent];
  let soldPercent=0;
  const ladder=[] as Array<{profitPercent:number;sellPercent:number;stage:string}>;
  for(const profitPercent of profits){
    const decision=c.tpLadderEnabled
      ? sellDecision(Number(profitPercent),soldPercent,c)
      : {sellPercent:0,stage:"hold" as const};
    if(decision.sellPercent>0){
      ladder.push({profitPercent:Number(profitPercent),sellPercent:decision.sellPercent,stage:decision.stage});
      soldPercent+=decision.sellPercent;
    }
  }

  const completedAt=performance.now();
  const result={
    mode:"simulation" as const,
    accepted:true,
    ca:input.ca,
    buyPrice:input.buyPrice,
    tpLadderEnabled:c.tpLadderEnabled,
    autoGasFee:c.autoGasFee,
    autoSlippage:c.autoSlippage,
    maxBuysPerCa:1,
    ladder,
    remainingPercent:100-soldPercent,
    timingMs:{total:Number((completedAt-started).toFixed(3)),decision:Number((completedAt-acceptedAt).toFixed(3))},
  };
  log("Simulation",`CA pipeline completed in ${result.timingMs.total}ms`);
  return result;
}
