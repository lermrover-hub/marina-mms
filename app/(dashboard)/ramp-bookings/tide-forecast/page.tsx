"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ReferenceLine,ResponsiveContainer} from "recharts";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card,CardContent,CardHeader,CardTitle} from "@/components/ui/card";
import {PageHeader} from "@/components/shared/PageHeader";

type RecordPoint={time:string;heightM:number;source:string};
type Window={start:string;end:string;minutes:number};
type ForecastResponse={
 source:string;datum:string;validated:boolean;provisional:boolean;details:string;
 samples:RecordPoint[];requiredTideM:number;frameClearanceWindows:Window[];
 warnings:string[];validation?:{maeM:number;rmseM:number;maxErrorM:number};
};
const bkkDate=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
const clock=(iso:string)=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Bangkok",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(iso));
export default function TideForecastPage(){
 const [date,setDate]=useState(bkkDate);
 const [days,setDays]=useState("1");
 const [draft,setDraft]=useState("0.50");
 const [uncertainty,setUncertainty]=useState("0");
 const [duration,setDuration]=useState("60");
 const [data,setData]=useState<ForecastResponse|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  const controller=new AbortController();
  let active=true;
  async function load(){
   setLoading(true);setError("");setData(null);
   try{
    const p=new URLSearchParams({date,days,draft,uncertainty,duration,step:days==="30"?"60":"10"});
    const res=await fetch("/api/tide/forecast?"+p.toString(),{signal:controller.signal});
    const j=await res.json();
    if(!res.ok)throw new Error(j.error??"Forecast unavailable");
    if(active)setData(j as ForecastResponse);
   }catch(e){if(active)setError(e instanceof Error?e.message:String(e));}
   finally{if(active)setLoading(false);}
  }
  void load();
  return ()=>{active=false;controller.abort();};
 },[date,days,draft,uncertainty,duration]);
 const chart=useMemo(()=>data?.samples.map((p,i)=>({label:clock(p.time),height:Number(p.heightM.toFixed(3)),n:i}))??[],[data]);
 const listed=useMemo(()=>data?.samples.filter((_,i)=>i%(days==="30"?1:6)===0)??[],[data,days]);
 return <div className="space-y-5">
  <PageHeader title="Tide Forecast & Ramp Planning" description="Automatic predictions — LLW reference; advisory use only"
   actions={<Button asChild size="sm" variant="outline"><Link href="/ramp-bookings/tide-calculator">Tide Safety Calculator</Link></Button>}/>
  <Card><CardHeader><CardTitle>Forecast settings</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
   <label className="text-xs space-y-1">Date<Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label className="text-xs space-y-1">Period
    <select className="w-full border rounded-md h-10 px-2" value={days} onChange={e=>setDays(e.target.value)}>
     <option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days (hourly)</option>
    </select>
   </label>
   <label className="text-xs space-y-1">Boat Draft (m)<Input type="number" min="0" step="0.01" value={draft} onChange={e=>setDraft(e.target.value)}/></label>
   <label className="text-xs space-y-1">Forecast margin (m)<Input type="number" min="0" step="0.05" value={uncertainty} onChange={e=>setUncertainty(e.target.value)}/></label>
   <label className="text-xs space-y-1">Operation (min)<Input type="number" min="10" max="480" step="10" value={duration} onChange={e=>setDuration(e.target.value)}/></label>
  </CardContent></Card>
  {loading&&<p className="text-sm">Calculating tide forecast…</p>}
  {error&&<p className="text-sm text-red-700 border border-red-300 p-3 rounded-lg">{error}</p>}
  {data&&<div className="space-y-4">
   <div className={`rounded-lg border p-3 text-sm ${data.provisional?"bg-amber-50 border-amber-300 text-amber-950":"bg-slate-50 border-slate-200"}`}>
    <strong>{data.provisional?"UNVALIDATED MODEL — PLANNING PREVIEW":"REFERENCE DATA — PHYSICAL CONFIRMATION REQUIRED"}</strong>
    <p>{data.details}</p>
    <p className="mt-1">Source: {data.source} · Datum: {data.datum} · Sample count: {data.samples.length}</p>
    {data.validation&&<p>2026 holdout error: MAE {(data.validation.maeM*100).toFixed(1)} cm;
     RMSE {(data.validation.rmseM*100).toFixed(1)} cm; max {(data.validation.maxErrorM*100).toFixed(1)} cm.</p>}
   </div>
   <div className="grid grid-cols-2 gap-3">
    <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Required table level (LLW)</p>
     <p className="text-2xl font-bold">{data.requiredTideM.toFixed(2)} m</p></CardContent></Card>
    <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Frame-clearance advisory windows</p>
     <p className="text-2xl font-bold">{data.frameClearanceWindows.length}</p></CardContent></Card>
   </div>
   <Card><CardHeader><CardTitle className="text-base">Tide level vs frame-clearance threshold</CardTitle></CardHeader>
    <CardContent><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
     <LineChart data={chart}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label" interval="preserveStartEnd" tick={{fontSize:10}} minTickGap={65}/>
      <YAxis domain={["auto","auto"]} unit="m" width={50}/><Tooltip/>
      <ReferenceLine y={data.requiredTideM} stroke="#b45309" strokeDasharray="6 4" label="Minimum"/>
      <Line dataKey="height" name="LLW level (m)" stroke="#0284c7" dot={false} strokeWidth={2} type="monotone" isAnimationActive={false}/>
     </LineChart>
    </ResponsiveContainer></div></CardContent></Card>
   {data.frameClearanceWindows.length>0&&<Card><CardHeader><CardTitle className="text-base">Geometric clearance windows (not a launch clearance)</CardTitle></CardHeader>
    <CardContent><ul className="space-y-1 text-sm">{data.frameClearanceWindows.map((w,i)=>
     <li key={i}>{clock(w.start)} – {clock(w.end)} ({w.minutes} minutes)</li>
    )}</ul></CardContent></Card>}
   <Card><CardHeader><CardTitle className="text-base">Tide levels at Bangkok local time</CardTitle></CardHeader>
    <CardContent><div className="max-h-72 overflow-y-auto"><table className="w-full text-sm">
     <thead><tr className="text-left border-b"><th className="py-2">Time (ICT)</th><th className="py-2 text-right">LLW (m)</th><th className="py-2 text-right">Ramp depth (m)</th></tr></thead>
     <tbody>{listed.map(p=><tr key={p.time} className="border-b"><td className="py-1">{clock(p.time)}</td>
      <td className="py-1 text-right">{p.heightM.toFixed(2)}</td><td className="py-1 text-right">{(p.heightM-1).toFixed(2)}</td>
     </tr>)}</tbody>
    </table></div></CardContent></Card>
   <p className="text-xs text-amber-800">{data.warnings.join(" ")}</p>
  </div>}
 </div>;
}
