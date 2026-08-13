import {db,getConfig} from "../lib/db.js";
const locks=new Set<string>();

export function validateCa(ca:string):boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ca);
}
export function acquireCaLock(ca:string):boolean {
  if(locks.has(ca)) return false; locks.add(ca); return true;
}
export function releaseCaLock(ca:string):void { locks.delete(ca); }
export function alreadyBought(ca:string):boolean {
  return Boolean(db.prepare("SELECT 1 FROM blocked_ca WHERE ca=?").get(ca));
}
function today():string {
  const d=new Date(); d.setUTCHours(0,0,0,0); return d.toISOString();
}
export function riskGate(walletBalanceSol:number) {
  const c=getConfig();
  const s=db.prepare("SELECT * FROM state WHERE id=1").get() as any;
  if(s.status==="emergency_stop") return {ok:false,reason:"Emergency stop engaged"};
  if(s.status!=="running") return {ok:false,reason:"Bot is not running"};
  if(process.env.EXECUTION_ENABLED!=="true") return {ok:false,reason:"Execution is locked"};
  if(!c.walletEnabled || !c.walletAddress) return {ok:false,reason:"Wallet is OFF or not connected"};
  if(walletBalanceSol<c.minimumWalletBalanceSol) return {ok:false,reason:"Wallet balance below minimum"};

  const count=(db.prepare("SELECT COUNT(*) c FROM trades WHERE buyTime>=?").get(today()) as any).c;
  if(count>=c.dailyMaxTrades) return {ok:false,reason:"Daily trade limit reached"};

  const open=(db.prepare("SELECT COUNT(*) c FROM trades WHERE isActive=1").get() as any).c;
  if(open>=c.maximumConcurrentPositions) return {ok:false,reason:"Maximum concurrent positions reached"};

  if(s.consecutiveLosses>=c.consecutiveLossStop) return {ok:false,reason:"Consecutive loss stop reached"};

  const loss=(db.prepare(`SELECT COALESCE(SUM(
    CASE WHEN sellAmountUsd IS NOT NULL AND sellAmountUsd<buyAmountUsd
    THEN sellAmountUsd-buyAmountUsd ELSE 0 END),0) loss
    FROM trade_results WHERE sellTime>=?`).get(today()) as any).loss;
  if(Math.abs(Math.min(0,loss))>=c.dailyMaxLossUsd)
    return {ok:false,reason:"Daily loss limit reached"};

  return {ok:true as const};
}
