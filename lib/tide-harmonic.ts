/**
 * Provisional site-specific harmonic fit to the existing 2026 official hourly table.
 * IMPORTANT: This is NOT FES2022, not gauge-calibrated, and never authorizes operations.
 * Uses only training dates Jan 1 - Sep 17; Oct-Dec is out-of-sample validation.
 */
import { TIDE_2026 } from "./tide-data-2026-real";

const EPOCH = Date.parse("2025-12-31T17:00:00Z"); // 2026-01-01 00:00 Asia/Bangkok
const TRAIN_DAYS = 260;
const TERMS: [string, number][] = [
  ["M2",28.9841042],["S2",30],["N2",28.4397295],["K2",30.0821373],
  ["K1",15.0410686],["O1",13.9430356],["P1",14.9589314],["Q1",13.3986609],
  ["M4",57.9682084],["MS4",58.9841042],["Mf",1.0980331],
  ["Mm",0.5443747],["Sa",0.0410686],["Ssa",0.0821373]
];
const angular = TERMS.map(([,degreesPerHour]) => degreesPerHour*Math.PI/180);
type Fit = { weights:number[]; validation:{samples:number;maeM:number;rmseM:number;maxErrorM:number} };
let cache: Fit | undefined;

function features(hours:number): number[] {
  const xs=[1];
  for (const w of angular) xs.push(Math.cos(w*hours),Math.sin(w*hours));
  return xs;
}
function solve(matrix:number[][], rhs:number[]): number[] {
  const n=rhs.length;
  for (let i=0;i<n;i++){
    let pivot=i;
    for(let j=i+1;j<n;j++) if(Math.abs(matrix[j][i])>Math.abs(matrix[pivot][i])) pivot=j;
    if (Math.abs(matrix[pivot][i])<1e-8) throw new Error("Harmonic model matrix is singular");
    [matrix[i],matrix[pivot]]=[matrix[pivot],matrix[i]];
    [rhs[i],rhs[pivot]]=[rhs[pivot],rhs[i]];
    const inv=1/matrix[i][i];
    for(let k=i;k<n;k++) matrix[i][k]*=inv;
    rhs[i]*=inv;
    for(let j=0;j<n;j++){
      if(j===i)continue;
      const q=matrix[j][i];
      for(let k=i;k<n;k++)matrix[j][k]-=q*matrix[i][k];
      rhs[j]-=q*rhs[i];
    }
  }
  return rhs;
}
function predict(weights:number[],hours:number):number{
  const x=features(hours);
  return x.reduce((s,v,i)=>s+v*weights[i],0);
}
function fit():Fit{
  if(cache)return cache;
  const days=Object.keys(TIDE_2026).sort();
  if(days.length!==365)throw new Error("2026 source table incomplete");
  const size=1+angular.length*2;
  const normal=Array.from({length:size},()=>Array(size).fill(0));
  const rhs=Array(size).fill(0);
  for(let day=0;day<TRAIN_DAYS;day++){
    const heights=TIDE_2026[days[day]];
    if(!heights||heights.length!==24)throw new Error("Incomplete training tide day");
    for(let hour=0;hour<24;hour++){
      const x=features(day*24+hour), y=heights[hour];
      for(let i=0;i<size;i++){
        rhs[i]+=x[i]*y;
        for(let j=0;j<size;j++)normal[i][j]+=x[i]*x[j];
      }
    }
  }
  const weights=solve(normal,rhs);
  let n=0,sumAbs=0,sumSquared=0,maxError=0;
  for(let day=TRAIN_DAYS;day<days.length;day++){
    const heights=TIDE_2026[days[day]];
    for(let hour=0;hour<24;hour++){
      const e=predict(weights,day*24+hour)-heights[hour];
      n++;sumAbs+=Math.abs(e);sumSquared+=e*e;maxError=Math.max(maxError,Math.abs(e));
    }
  }
  return (cache={weights,validation:{
    samples:n,maeM:sumAbs/n,rmseM:Math.sqrt(sumSquared/n),maxErrorM:maxError
  }});
}
/** The extrapolation omits long-term nodal modulation; operational clearance is forbidden. */
export function experimentalHarmonicLLW(utcMs:number):number{
  const hours=(utcMs-EPOCH)/3600000;
  if(!Number.isFinite(hours))throw new Error("Invalid time");
  return predict(fit().weights,hours);
}
export function experimentalHarmonicMetrics(){return fit().validation;}
