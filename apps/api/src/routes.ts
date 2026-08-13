import {Router} from "express";
import {db,getConfig,setConfig,log} from "./lib/db.js";
import {submitBuy} from "./services/execution.js";
import {validateTp} from "./services/takeProfit.js";
import {DEFAULTS} from "@mintline/shared";

export const router=Router();

router.get("/health",(_,res)=>res.json({
  status:"ok",service:"mintline-api",
  executionEnabled:process.env.EXECUTION_ENABLED==="true"
}));

router.get("/api/bot/dashboard",(_,res)=>{
  const s=db.prepare("SELECT * FROM state WHERE id=1").get() as any;
  const c=getConfig();
  const d=new Date(); d.setUTCHours(0,0,0,0);
  const trades=db.prepare("SELECT * FROM trades WHERE buyTime>=?").all(d.toISOString()) as any[];
  const active=(db.prepare("SELECT COUNT(*) c FROM trades WHERE isActive=1").get() as any).c;
  res.json({
    status:s.status,
    executionEnabled:process.env.EXECUTION_ENABLED==="true",
    walletEnabled:c.walletEnabled,
    walletAddress:c.walletAddress,
    tpLadderEnabled:c.tpLadderEnabled,
    autoGasFee:c.autoGasFee,
    autoSlippage:c.autoSlippage,
    apiEnabled:c.apiEnabled,
    walletBalanceSol:0,
    todayTrades:trades.length,
    todayProfitUsd:0,
    openPositions:active,
    consecutiveLosses:s.consecutiveLosses,
    lastEvent:s.lastEvent
  });
});

router.get("/api/bot/config",(_,res)=>res.json(getConfig()));

router.put("/api/bot/config",(req,res)=>{
  try {
    const cfg={...getConfig(),...req.body};
    if(cfg.tpLadderEnabled && !validateTp(cfg)) return res.status(400).json({
      error:"TP1 + TP2 + moonbag must equal 100%, with TP1 below TP2"
    });
    setConfig(req.body); log("Configuration","Saved"); return res.json(getConfig());
  } catch(e) { return res.status(400).json({error:String(e)}); }
});

router.post("/api/bot/wallet",(req,res)=>{
  try {
    const enabled=Boolean(req.body.enabled);
    const address=String(req.body.address??"").trim();
    if(enabled && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address))
      return res.status(400).json({error:"A valid Solana wallet address is required"});
    const cfg=setConfig({walletEnabled:enabled,walletAddress:enabled?address:""});
    log("Wallet",enabled?"Enabled":"Disabled");
    return res.json({walletEnabled:cfg.walletEnabled,walletAddress:cfg.walletAddress});
  } catch(e) { return res.status(400).json({error:String(e)}); }
});

router.post("/api/bot/start",(_,res)=>{
  if(process.env.EXECUTION_ENABLED!=="true")
    return res.status(423).json({error:"Execution is locked."});
  const c=getConfig();
  if(!c.walletEnabled || !c.walletAddress)
    return res.status(423).json({error:"Connect and enable the wallet first."});
  db.prepare("UPDATE state SET status='running',lastEvent='Bot started',updatedAt=? WHERE id=1")
    .run(new Date().toISOString());
  log("Bot start","Accepted"); return res.json({status:"running"});
});
router.post("/api/bot/stop",(_,res)=>{
  db.prepare("UPDATE state SET status='stopped',lastEvent='Bot stopped',updatedAt=? WHERE id=1")
    .run(new Date().toISOString());
  log("Bot stop","Accepted"); return res.json({status:"stopped"});
});
router.post("/api/bot/emergency-stop",(_,res)=>{
  db.prepare("UPDATE state SET status='emergency_stop',lastEvent='Emergency stop engaged',updatedAt=? WHERE id=1")
    .run(new Date().toISOString());
  log("Emergency stop","Engaged"); return res.json({status:"emergency_stop"});
});

router.post("/api/intake/ca",async(req,res)=>{
  try {
    const c=getConfig();
    if(!c.apiEnabled) return res.status(423).json({accepted:false,reason:"External CA API is OFF"});
    const requiredKey=process.env.MINTLINE_API_KEY;
    if(requiredKey && req.header("x-mintline-api-key")!==requiredKey)
      return res.status(401).json({accepted:false,reason:"Invalid API key"});
    const {ca,buyPrice,walletBalanceSol=0}=req.body;
    return res.json(await submitBuy(ca,Number(walletBalanceSol),Number(buyPrice)));
  } catch(e) {
    return res.status(400).json({error:e instanceof Error?e.message:String(e)});
  }
});
router.get("/api/trades/active",(_,res)=>res.json(db.prepare(`
  SELECT id,ca,buyPrice,currentProfitPercent,currentValueUsd,currentStatus as status,
  soldPercent as sellProgress,buyTime,transactionHash
  FROM trades WHERE isActive=1 ORDER BY buyTime DESC`).all()));
router.get("/api/trades/history",(_,res)=>res.json(db.prepare(`
  SELECT id,ca,buyPrice,buyTime,sellTime,currentProfitPercent as profit,
  transactionHash,currentStatus as status FROM trades WHERE isActive=0 ORDER BY sellTime DESC`).all()));
router.get("/api/logs",(_,res)=>res.json(db.prepare(
  "SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100").all()));
router.get("/api/defaults",(_,res)=>res.json(DEFAULTS));
