import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import "./style.css";

const API=import.meta.env.VITE_API_URL??"";
type Dash={status:string;executionEnabled:boolean;walletBalanceSol:number;todayTrades:number;todayProfitUsd:number;openPositions:number;consecutiveLosses:number;lastEvent:string|null};

function App(){
 const [page,setPage]=useState(location.pathname),[d,setD]=useState<Dash|null>(null),[msg,setMsg]=useState("");
 async function refresh(){setD(await (await fetch(API+"/api/bot/dashboard")).json())}
 async function action(p:string){const r=await fetch(API+p,{method:"POST"});const x=await r.json();setMsg(x.error??("Status: "+(x.status??"accepted")));await refresh()}
 useEffect(()=>{void refresh()},[]);
 const nav=(p:string)=>{history.pushState({}, "", p);setPage(p)};
 const links=[["/","Overview"],["/active-trades","Active trades"],["/trade-history","Trade history"],["/logs","Execution logs"],["/configuration","Configuration"]];
 return <div className="shell"><header><div><b>MINTLINE</b><small>SOLANA EXECUTION</small></div><nav>{links.map(([p,l])=><button className={page===p?"sel":""} onClick={()=>nav(p)} key={p}>{l}</button>)}</nav></header><main>
 <div className="status">● Engine {d?.status??"loading"} <span>Operator mode · v1.0.0</span></div>{msg&&<div className="notice">{msg}</div>}
 {page==="/"&&d&&<><h1>Execution overview</h1><p>Fast decisions, visible guardrails.</p><div className="grid"><Card t="Wallet balance" v={d.walletBalanceSol.toFixed(3)+" SOL"}/><Card t="Today's trades" v={String(d.todayTrades)}/><Card t="Today's profit" v={d.todayProfitUsd.toFixed(2)+" USD"}/><Card t="Open positions" v={String(d.openPositions)}/></div><section><h2>Safety interlock</h2><p>Execution: <b>{d.executionEnabled?"ENABLED":"LOCKED"}</b></p><p>Loss streak: <b>{d.consecutiveLosses}</b></p><p>Last event: <b>{d.lastEvent??"None"}</b></p><div className="actions"><button onClick={()=>action("/api/bot/start")}>Start bot</button><button className="danger" onClick={()=>action("/api/bot/emergency-stop")}>Emergency stop</button><button onClick={()=>action("/api/bot/stop")}>Stop</button></div></section></>}
 {page==="/configuration"&&<Config/>}{page==="/active-trades"&&<List path="/api/trades/active" title="Active trades"/>}{page==="/trade-history"&&<List path="/api/trades/history" title="Trade history"/>}{page==="/logs"&&<List path="/api/logs" title="Execution logs"/>}
 </main></div>
}
function Card({t,v}:{t:string;v:string}){return <div className="card"><small>{t}</small><b>{v}</b></div>}
function Config(){const[c,setC]=useState<any>({});const[s,setS]=useState("");useEffect(()=>{fetch(API+"/api/bot/config").then(r=>r.json()).then(setC)},[]);const fs=["buyAmountUsd","dailyMaxTrades","dailyMaxLossUsd","maximumConcurrentPositions","slippageBps","priorityFeeLamports","tp1Percent","tp1SellPercent","tp2Percent","tp2SellPercent","moonbagPercent","consecutiveLossStop","minimumWalletBalanceSol"];async function save(){const r=await fetch(API+"/api/bot/config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)});setS((await r.json()).error??"Saved")}return <><h1>Configuration</h1><div className="form">{fs.map(k=><label key={k}>{k}<input type="number" value={c[k]??""} onChange={e=>setC({...c,[k]:Number(e.target.value)})}/></label>)}<label>rpcUrl<input value={c.rpcUrl??""} onChange={e=>setC({...c,rpcUrl:e.target.value})}/></label><button onClick={save}>Save</button><p>{s}</p></div></>}
function List({path,title}:{path:string;title:string}){const[r,setR]=useState<any[]>([]);useEffect(()=>{fetch(API+path).then(x=>x.json()).then(setR)},[path]);return <><h1>{title}</h1><section><pre>{JSON.stringify(r,null,2)}</pre></section></>}
createRoot(document.getElementById("root")!).render(<App/>);
