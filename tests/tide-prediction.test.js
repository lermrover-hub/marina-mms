const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const {resolve} = require("node:path");

// Compile the same TypeScript modules that Next.js bundles. Node itself needs
// no custom TypeScript loader and assertions exercise the real exported code.
function load(path, dependencies={}) {
  const code=fs.readFileSync(resolve(process.cwd(),path),"utf8");
  const output=ts.transpileModule(code,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020
  }}).outputText;
  const module={exports:{}};
  const importer=(name)=>{
    if(name in dependencies)return dependencies[name];
    throw new Error("Unexpected dependency: "+name);
  };
  new Function("require","module","exports",output)(importer,module,module.exports);
  return module.exports;
}
const safety=load("lib/tide-safety.ts");
test("ORM LLW -1.00 m and 0.60 m frame with 0.10 m clearance",()=>{
  const x=safety.assessFrameClearance(2.20,0.50,0);
  assert.equal(x.requiredTideM,2.2);
  assert.ok(Math.abs(x.actualDepthM-1.2)<1e-9);
  assert.ok(Math.abs(x.keelToFrameM-0.10)<1e-9);
  assert.equal(x.frameClearancePass,true);
  assert.equal(safety.ORM_TIDE_RULES.sideBunksHeightM,1.0);
  assert.equal(safety.assessFrameClearance(1.8,0.5).frameClearancePass,false);
});
test("Tide uncertainty is distinct from physical frame clearance",()=>{
  assert.ok(Math.abs(safety.assessFrameClearance(2.4,0.5,0.2).requiredTideM-2.4)<1e-9);
  assert.equal(safety.assessFrameClearance(2.3,0.5,0.2).frameClearancePass,false);
  assert.throws(()=>safety.assessFrameClearance(NaN,0.5));
});
test("Safe window requires continuous tide samples and operation duration",()=>{
  const start=Date.parse("2026-10-16T00:00:00.000Z");
  const ts=(i)=>new Date(start+i*600000).toISOString();
  const samples=[0,1,2,3,4,5,6].map(i=>({time:ts(i),heightM:2.5,source:"test"}));
  assert.equal(safety.advisoryWindows(samples,0.5,0,10,60).length,1);
  assert.equal(safety.advisoryWindows(samples,0.5,0,10,80).length,0);
  const broken=[...samples.slice(0,3),...samples.slice(4)];
  assert.equal(safety.advisoryWindows(broken,0.5,0,10,60).length,0);
});
const dataset=load("lib/tide-data-2026-real.ts");
const harmonic=load("lib/tide-harmonic.ts",{"./tide-data-2026-real":dataset});
const predictions=load("lib/tide-prediction.ts",{
  "./tide-data-2026-real":dataset,
  "./tide-harmonic":harmonic
});
test("Provisional harmonic validation reports holdout errors separately",()=>{
  const stats=harmonic.experimentalHarmonicMetrics();
  assert.equal(stats.samples,105*24);
  assert.ok(stats.maeM<0.10,"Holdout MAE must be less than 10 cm");
  assert.ok(stats.maxErrorM<0.30,"Holdout maximum error must be less than 30 cm");
});
test("2026 hourly reference and 2027 unvalidated preview remain distinct",async()=>{
 const original=await predictions.predictTides("2026-01-01",1,60);
 assert.equal(original.samples.length,24);
 assert.equal(original.samples[0].heightM,1.5);
 assert.equal(original.source,"HDO_2026_REFERENCE");
 assert.equal(original.validated,false);
 const next=await predictions.predictTides("2027-01-01",1,10);
 assert.equal(next.samples.length,144);
 assert.equal(next.source,"EXPERIMENTAL_2026_HARMONIC");
 assert.equal(next.provisional,true);
 assert.equal(next.validated,false);
 assert.ok(next.samples.every(p=>Number.isFinite(p.heightM)));
 await assert.rejects(predictions.predictTides("2029-01-01",1,10));
});
