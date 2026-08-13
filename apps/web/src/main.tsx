import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import "./style.css";

const API=import.meta.env.VITE_API_URL??"";

type Dash={
 status:string; executionEnabled:boolean; walletEnabled:boolean; walletAddress:string;
 tpLadderEnabled:boolean; autoGasFee:boolean; autoSlippage:boolean; apiEnabled:boolean;
 walletBalanceSol:number; todayTrades:number; todayProfitUsd:number; openPositions:number;
 consecutiveLosses:number; lastEvent:string|null;
};

type PhantomProvider={
 isPhantom?:boolean;
 publicKey?:{toString:()=>string};
 connect:(options?:{onlyIfTrusted?:boolean})=>Promise<{publicKey:{toString:()=>string}}|void>;
 disconnect:()=>Promise<void>;
 on?:(event:string,handler:(key?:{toString:()=>string}|null)=>void)=>void;
};

declare global { interface Window { phantom?:{solana?:PhantomProvider}; solana?:PhantomProvider } }

function getWalletProvider():PhantomProvider|undefined {
 return window.phantom?.solana?.isPhantom ? window.phantom.solana : window.solana;
}

function App(){
 const [page,setPage]=useState(location.pathname),[d,setD]=useState<Dash|null>(null),[msg,setMsg]=useState(""),[wallet,setWallet]=useState("");
 async function refresh(){const x=await (await fetch(API+"/api/bot/dashboard")).json();setD(x);setWallet(x.walletAddress??"")}
 async function action(p:string){const r=await fetch(API+p,{method:"POST"});const x=await r.json();setMsg(x.error??("Status: "+(x.status??"accepted")));await refresh()}
 async function connectWallet(){
  const provider=getWalletProvider();
  if(!provider){setMsg("Phantom wallet not detected in this browser.");return;}
  try {
   const result=await provider.connect();
   const address=result?.publicKey?.toString()??provider.publicKey?.toString()??"";
   if(!address){setMsg("Wallet connected but no public address was returned.");return;}
   const r=await fetch(API+"/api/bot/wallet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:true,address})});
   const x=await r.json(); setMsg(x.error??"Wallet connected and ON."); await refresh();
  } catch(e){setMsg(e instanceof Error?e.message:"Wallet connection cancelled");}
 }
 async function disconnectWallet(){
  const provider=getWalletProvider();
  try{await provider?.disconnect()}catch{}
  await fetch(API+"/api/bot/wallet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:false})});
  setMsg("Wallet OFF."); await refresh();
 }
 useEffect(()=>{void refresh()},[]);
 const nav=(p:string)=>{history.pushState({}, "", p);setPage(p)};
 const links=[["/","Overview"],["/active-trades","Active trades"],["/trade-history","Trade history"],["/logs","Execution logs"],["/configuration","Configuration"]];
 return <div className="shell"><header><div><b>MINTLINE</b><small>SOLANA EXECUTION</small></div><div className="head-actions"><button className={d?.walletEnabled?"wallet-on":"wallet-off"} onClick={d?.walletEnabled?disconnectWallet:connectWallet}>{d?.walletEnabled?"Wallet ON":"Connect Wallet"}</button><nav>{links.map(([p,l])=><button className={page===p?"sel":""} onClick={()=>nav(p)} key={p}>{l}</button>)}</nav></div></header><main>
 <div className="status">● Engine {d?.status??"loading"} <span>Operator mode · v1.0.0</span></div>{msg&&<div className="notice">{msg}</div>}
 {page==="/"&&d&&<><h1>Execution overview</h1><p>Only the controls you asked for.</p><div className="grid"><Card t="Wallet" v={d.walletEnabled?(wallet.slice(0,6)+"…"+wallet.slice(-4)):"OFF"}/><Card t="Today's trades" v={String(d.todayTrades)}/><Card t="Open positions" v={String(d.openPositions)}/><Card t="External CA API" v={d.apiEnabled?"ON":"OFF"}/></div><section><h2>Execution controls</h2><div className="control-grid"><Toggle label="Wallet execution" value={d.walletEnabled} onClick={d.walletEnabled?disconnectWallet:connectWallet}/><Toggle label="TP ladder" value={d.tpLadderEnabled} onClick={()=>flip("tpLadderEnabled",d.tpLadderEnabled)}/><Toggle label="Auto gas fee" value={d.autoGasFee} onClick={()=>flip("autoGasFee",d.autoGasFee)}/><Toggle label="Auto slippage" value={d.autoSlippage} onClick={()=>flip("autoSlippage",d.autoSlippage)}/><Toggle label="External CA API" value={d.apiEnabled} onClick={()=>flip("apiEnabled",d.apiEnabled)}/></div><div className="endpoint"><b>CA intake:</b> POST /api/intake/ca · one buy per CA</div><p>Execution: <b>{d.executionEnabled?"ENABLED":"LOCKED"}</b></p><p>Loss streak: <b>{d.consecutiveLosses}</b></p><p>Last event: <b>{d.lastEvent??"None"}</b></p><div className="actions"><button onClick={()=>action("/api/bot/start")}>Start bot</button><button className="danger" onClick={()=>action("/api/bot/emergency-stop")}>Emergency stop</button><button onClick={()=>action("/api/bot/stop")}>Stop</button></div></section></>}
 {page==="/configuration"&&<Config/>}{page==="/active-trades"&&<List path="/api/trades/active" title="Active trades"/>}{page==="/trade-history"&&<List path="/api/trades/history" title="Trade history"/>}{page==="/logs"&&<List path="/api/logs" title="Execution logs"/>}
 </main></div>
 function flip(key:string,value:boolean){void saveControl(key,!value)}
 async function saveControl(key:string,value:boolean){const r=await fetch(API+"/api/bot/config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({[key]:value})});const x=await r.json();setMsg(x.error??`${key}: ${value?"ON":"OFF"}`);await refresh()}
}
function Card({t,v}:{t:string;v:string}){return <div className="card"><small>{t}</small><b>{v}</b></div>}
function Toggle({label,value,onClick}:{label:string;value:boolean;onClick:()=>void}){return <button className={value?"toggle on":"toggle"} onClick={onClick}><span>{label}</span><b>{value?"ON":"OFF"}</b></button>}
function Config(){const[c,setC]=useState<any>({});const[s,setS]=useState("");useEffect(()=>{fetch(API+"/api/bot/config").then(r=>r.json()).then(setC)},[]);const fs=["buyAmountUsd","dailyMaxTrades","dailyMaxLossUsd","maximumConcurrentPositions","slippageBps","priorityFeeLamports","tp1Percent","tp1SellPercent","tp2Percent","tp2SellPercent","moonbagPercent","consecutiveLossStop","minimumWalletBalanceSol"];async function save(){const r=await fetch(API+"/api/bot/config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)});setS((await r.json()).error??"Saved")};return <><h1>Configuration</h1><div className="form">{fs.map(k=><label key={k}>{k}<input type="number" value={c[k]??""} onChange={e=>setC({...c,[k]:Number(e.target.value)})}/></label>)}<label>rpcUrl<input value={c.rpcUrl??""} onChange={e=>setC({...c,rpcUrl:e.target.value})}/></label><button onClick={save}>Save</button><p>{s}</p></div></>}
function List({path,title}:{path:string;title:string}){const[r,setR]=useState<any[]>([]);useEffect(()=>{fetch(API+path).then(x=>x.json()).then(setR)},[path]);return <><h1>{title}</h1><section><pre>{JSON.stringify(r,null,2)}</pre></section></>}
createRoot(document.getElementById("root")!).render(<App/>);
