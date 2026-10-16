import { NextRequest, NextResponse } from "next/server";
import {predictTides} from "@/lib/tide-prediction";
import {advisoryWindows,assessFrameClearance,ORM_TIDE_RULES} from "@/lib/tide-safety";
export const dynamic="force-dynamic";
// This endpoint gives predictions and geometric screening only. Never approves a launch.
export async function GET(req:NextRequest){
 try{
  const q=req.nextUrl.searchParams;
  const date=q.get("date")??"";
  const days=Number(q.get("days")??1);
  const stepMinutes=Number(q.get("step")??10);
  const draftM=Number(q.get("draft")??0.5);
  const uncertaintyM=Number(q.get("uncertainty")??0);
  const operationMinutes=Number(q.get("duration")??60);
  if(![days,stepMinutes,draftM,uncertaintyM,operationMinutes].every(Number.isFinite)||
     draftM<0||draftM>10||uncertaintyM<0||uncertaintyM>2||
     operationMinutes<10||operationMinutes>480)
    return NextResponse.json({error:"Invalid numeric parameters"},{status:400});
  const forecast=await predictTides(date,days,stepMinutes);
  const reference=assessFrameClearance(forecast.samples[0].heightM,draftM,uncertaintyM);
  const isEligibleSource=forecast.source==="HDO_2026_REFERENCE"||forecast.validated;
  // An experimental forecast may NOT generate operation windows.
  const frameClearanceWindows=isEligibleSource?
    advisoryWindows(forecast.samples,draftM,uncertaintyM,stepMinutes,operationMinutes):[];
  return NextResponse.json({
    date,days,stepMinutes,
    ...forecast,
    rule:ORM_TIDE_RULES,
    requestedDraftM:draftM,uncertaintyM,operationMinutes,
    requiredTideM:reference.requiredTideM,
    frameClearanceWindows,
    operationalApproval:false,
    warnings:[
      "Frame clearance is geometry-only, not a launch authorization.",
      "1.00 m bunk supports require a separate hull/trailer fit check.",
      "Physical water-level, ramp, wind/wave and dockmaster checks required.",
      ...(forecast.provisional?["MODEL UNVALIDATED: planning preview only; no operational windows issued."]:[])
    ]
  });
 }catch(err){
  const message=err instanceof Error?err.message:"Tide forecast unavailable";
  const invalid=/Invalid|days must|stepMinutes must|Use hourly|Forecast requires/.test(message);
  return NextResponse.json({error:message},{status:invalid?400:503});
 }
}
