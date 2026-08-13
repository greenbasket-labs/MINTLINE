import type { SellDecision } from "@mintline/shared";

export interface TpConfig {
  tp1Percent:number; tp1SellPercent:number; tp2Percent:number;
  tp2SellPercent:number; moonbagPercent:number;
}

export function validateTp(c:TpConfig):boolean {
  return c.tp1Percent >= 0 && c.tp2Percent > c.tp1Percent &&
    c.tp1SellPercent > 0 && c.tp2SellPercent > 0 &&
    c.moonbagPercent >= 0 &&
    c.tp1SellPercent + c.tp2SellPercent + c.moonbagPercent === 100;
}

export function sellDecision(profitPercent:number,soldPercent:number,c:TpConfig):SellDecision {
  if (profitPercent >= c.tp1Percent && soldPercent < c.tp1SellPercent)
    return {sellPercent:c.tp1SellPercent,stage:"tp1"};

  if (soldPercent >= c.tp1SellPercent &&
      profitPercent >= c.tp2Percent &&
      soldPercent < c.tp1SellPercent + c.tp2SellPercent)
    return {sellPercent:c.tp2SellPercent,stage:"tp2"};

  return {sellPercent:0,stage:"hold"};
}
