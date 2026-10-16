export const ORM_TIDE_RULES = Object.freeze({
  datum:"LLW",
  rampOffsetM:-1.00,
  frameHeightM:0.60,
  sideBunksHeightM:1.00,
  keelToFrameClearanceM:0.10
});
export type TideSample={time:string;heightM:number;source:string};
export function assessFrameClearance(
  heightLLWM:number, boatDraftM:number, uncertaintyM=0
){
  if(![heightLLWM,boatDraftM,uncertaintyM].every(Number.isFinite) ||
     boatDraftM<0 || uncertaintyM<0)throw new Error("Invalid tide, draft, or uncertainty");
  const actualDepthM=heightLLWM+ORM_TIDE_RULES.rampOffsetM;
  const requiredDepthM=boatDraftM+ORM_TIDE_RULES.frameHeightM+ORM_TIDE_RULES.keelToFrameClearanceM;
  const requiredTideM=requiredDepthM-ORM_TIDE_RULES.rampOffsetM+uncertaintyM;
  const keelToFrameM=actualDepthM-boatDraftM-ORM_TIDE_RULES.frameHeightM;
  return {actualDepthM, requiredDepthM, requiredTideM, keelToFrameM,
    frameClearancePass:heightLLWM-uncertaintyM>=requiredDepthM-ORM_TIDE_RULES.rampOffsetM-1e-9};
}
/**
 * Only frame-clearance criterion. Bunk contact, ramp geometry, weather and
 * operation duration need separate physical verification by the dockmaster.
 * End time is exclusive: next sampled instant that fails (or last sample + step).
 */
export function advisoryWindows(
 samples:TideSample[], draftM:number, uncertaintyM:number,
 stepMinutes:number, minimumOperationMinutes:number
){
 if(!Number.isInteger(stepMinutes)||stepMinutes<1||!Number.isFinite(minimumOperationMinutes)||minimumOperationMinutes<=0) throw new Error("Invalid window parameters");
 const results: {start:string;end:string;minutes:number}[]=[];
 let begin=-1;
 for(let i=0;i<=samples.length;i++){
   const continuity=i>0&&i<samples.length&&
     Date.parse(samples[i].time)-Date.parse(samples[i-1].time)===stepMinutes*60000;
   const ok=i<samples.length&&
     assessFrameClearance(samples[i].heightM,draftM,uncertaintyM).frameClearancePass;
   if(i>0&&!continuity && begin>=0){
     const duration=(i-begin)*stepMinutes;
     if(duration>=minimumOperationMinutes)results.push({start:samples[begin].time,end:new Date(Date.parse(samples[i-1].time)+stepMinutes*60000).toISOString(),minutes:duration});
     begin=-1;
   }
   if(ok&&begin<0)begin=i;
   if(!ok&&begin>=0){
     const duration=(i-begin)*stepMinutes;
     if(duration>=minimumOperationMinutes)results.push({start:samples[begin].time,end:new Date(Date.parse(samples[i-1].time)+stepMinutes*60000).toISOString(),minutes:duration});
     begin=-1;
   }
 }
 return results;
}
