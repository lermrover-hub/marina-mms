import {TIDE_2026} from "./tide-data-2026-real";
import {experimentalHarmonicLLW,experimentalHarmonicMetrics} from "./tide-harmonic";
import type {TideSample} from "./tide-safety";
const MS_DAY=86400000;
const BANGKOK_OFFSET=7*3600000;
export type Forecast={samples:TideSample[];source:string;datum:"LLW";validated:boolean;provisional:boolean;
  details:string;validation?:{samples:number;maeM:number;rmseM:number;maxErrorM:number}};
function dateCheck(date:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T00:00:00Z"))||
   new Date(date+"T00:00:00Z").toISOString().slice(0,10)!==date) throw new Error("Invalid date");
}
export function bangkokDateTime(utcMs:number):{date:string;hour:number;minute:number}{
 const dt=new Date(utcMs+BANGKOK_OFFSET);
 return {date:dt.toISOString().slice(0,10),hour:dt.getUTCHours(),minute:dt.getUTCMinutes()};
}
export async function predictTides(date:string,days=1,stepMinutes=10):Promise<Forecast>{
 dateCheck(date);
 if(!Number.isInteger(days)||days<1||days>31)throw new Error("days must be 1..31");
 if(![10,30,60].includes(stepMinutes))throw new Error("stepMinutes must be 10, 30 or 60");
 if(days>7&&stepMinutes===10)throw new Error("Use hourly samples for forecasts longer than 7 days");
 const first=Date.parse(date+"T00:00:00Z")-BANGKOK_OFFSET;
 const total=days*1440/stepMinutes;
 const times=Array.from({length:total},(_,i)=>first+i*stepMinutes*60000);
 const local=times.map(bangkokDateTime);
 const allOfficial=local.every(d=>Boolean(TIDE_2026[d.date]));
 if(allOfficial){
   const samples=times.map((t,i)=>{
     const d=local[i],h=TIDE_2026[d.date];
     // Official 2026 hourly points; between-hour values are explicitly linear interpolation.
     const current=h[d.hour];
     const next=d.hour===23 ? TIDE_2026[new Date(Date.parse(d.date+"T00:00:00Z")+MS_DAY).toISOString().slice(0,10)]?.[0] : h[d.hour+1];
     const value=d.minute===0?current:current+((next??current)-current)*(d.minute/60);
     return {time:new Date(t).toISOString(),heightM:value,source:d.minute===0?"HDO_2026_HOURLY":"HDO_2026_INTERPOLATED"};
   });
   return {samples,source:"HDO_2026_REFERENCE",datum:"LLW",validated:false,provisional:false,
     details:"2026 hydrographic table: hourly values retained; interpolated points are not official. Datum LLW must be verified against original publication. Operational approval remains manual."};
 }
 // FES2022 endpoint provides site-calibrated LLW metres; never treat unset datum as LLW.
 if(process.env.ORM_TIDE_FES_URL && process.env.ORM_TIDE_FES_TOKEN){
   const lat=Number(process.env.ORM_TIDE_LATITUDE),lon=Number(process.env.ORM_TIDE_LONGITUDE);
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180)
     throw new Error("ORM ramp coordinates not configured");
   const base=process.env.ORM_TIDE_FES_URL;
   if(!base.startsWith("https://")&&!base.startsWith("http://127.0.0.1:"))
     throw new Error("FES provider must use HTTPS");
   const res=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json",
     "Authorization":"Bearer "+process.env.ORM_TIDE_FES_TOKEN},body:JSON.stringify({
      times:times.map(t=>new Date(t).toISOString()),latitude:lat,longitude:lon
   }),cache:"no-store",signal:AbortSignal.timeout(20000)});
   if(!res.ok)throw new Error("FES service unavailable ("+res.status+")");
   const out=await res.json() as {heights_m?:number[];datum?:string;model?:string};
   if(out.datum!=="LLW"||!Array.isArray(out.heights_m)||out.heights_m.length!==total||
      !out.heights_m.every(x=>typeof x==="number"&&Number.isFinite(x)))
      throw new Error("FES datum or sample count invalid; refusing predictions");
   const validated=process.env.ORM_TIDE_SITE_VALIDATED==="true";
   return {datum:"LLW",samples:times.map((t,i)=>({time:new Date(t).toISOString(),heightM:out.heights_m![i],source:"FES2022"})),
     source:"FES2022",validated,provisional:!validated,
     details:validated?"FES2022 site model; tide remains advisory until dockmaster confirmation.":"FES2022 LLW conversion NOT approved for ramp operations; validate coordinates, vertical datum, tide model and local offset."};
 }
 // Always show model preview when no external model data; deliberately NOT an operational feed.
 // Restrict extrapolation to 2027-2028 to avoid misleading long-term estimates.
 if(local.some(d=>d.date<"2027-01-01"||d.date>"2028-12-31"))
   throw new Error("Forecast requires complete 2026 reference or configured FES2022 model");
 return {datum:"LLW",samples:times.map(t=>({time:new Date(t).toISOString(),
   heightM:experimentalHarmonicLLW(t),source:"EXPERIMENTAL_2026_HARMONIC"})),
   source:"EXPERIMENTAL_2026_HARMONIC",validated:false,provisional:true,
   details:"PROVISIONAL planning preview from 260 days of 2026 historical tide heights. No nodal corrections or gauge validation. Never use to clear vessels for launch/retrieval.",
   validation:experimentalHarmonicMetrics()};
}
