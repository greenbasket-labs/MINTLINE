import {describe,expect,it} from "vitest";
import {sellDecision,validateTp} from "./takeProfit.js";
const c={tp1Percent:50,tp1SellPercent:70,tp2Percent:100,tp2SellPercent:20,moonbagPercent:10};
describe("MINTLINE take-profit engine",()=>{
  it("holds below TP1",()=>expect(sellDecision(20,0,c)).toEqual({sellPercent:0,stage:"hold"}));
  it("sells 70% at TP1",()=>expect(sellDecision(50,0,c)).toEqual({sellPercent:70,stage:"tp1"}));
  it("does not skip TP1 on a jump to TP2",()=>expect(sellDecision(100,0,c)).toEqual({sellPercent:70,stage:"tp1"}));
  it("sells 20% at TP2 after TP1",()=>expect(sellDecision(100,70,c)).toEqual({sellPercent:20,stage:"tp2"}));
  it("never sells the moonbag",()=>expect(sellDecision(150,90,c)).toEqual({sellPercent:0,stage:"hold"}));
  it("requires 100% including moonbag",()=>expect(validateTp(c)).toBe(true));
});
