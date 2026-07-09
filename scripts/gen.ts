import { createClient } from "@supabase/supabase-js";
import { calculateAge, getNormalRangeForAge, getOptimalRangeForAge, getCriticalRangeForAge } from "../src/lib/biomarkerNorms.ts";
import { CALCULATED_BIOMARKER_CODES, computeAllDerivedValues } from "../src/lib/calculatedBiomarkers.ts";

const SUPABASE_URL = "https://ilxgodhosirhhkffqryw.supabase.co";
const ANON = process.env.ANON!;
const supabase = createClient(SUPABASE_URL, ANON);

const PLAN_ID = "6ddc6c28-e1e5-42bc-acdb-44ae2d772f8c";
const USER_ID = "d8d632d4-1d79-4cf5-bbaf-4c377ebbe6eb";
const ANALYSIS_ID = "ffa1578f-00ad-4701-9ed6-ed61f6cc33f1";

function pickZone(w: number[]) {
  const r = Math.random(); let c = 0;
  const z = ["optimal","acceptable","risk","critical"];
  for (let i=0;i<4;i++){c+=w[i]; if(r<c) return z[i] as any;}
  return "optimal" as any;
}
function rr(a: number,b: number){return a+Math.random()*(b-a);}
function genVal(zone: string, n: any, o: any, cr: any): number | null {
  if (n.min===null && n.max===null) return null;
  const eMin=n.min??0, eMax=n.max??(eMin*3||100), range=eMax-eMin;
  if (zone==="optimal"){const a=o.min??eMin,b=o.max??eMax; return a>=b?a:rr(a,b);}
  if (zone==="acceptable"){const a=o.min??eMin,b=o.max??eMax; const lg=a-eMin,hg=eMax-b;
    if(lg<=0&&hg<=0) return rr(a,b);
    if(Math.random()<0.5&&lg>0) return rr(eMin,a);
    if(hg>0) return rr(b,eMax); return rr(eMin,a);}
  if (zone==="risk"){const cm=cr.min??(eMin-range*0.3),cx=cr.max??(eMax+range*0.3);
    if(Math.random()<0.5&&n.min!==null){return rr(Math.max(cm,eMin-range*0.3),eMin);}
    if(n.max!==null){return rr(eMax,Math.min(cx,eMax+range*0.3));}
    return rr(eMin-range*0.2,eMin);}
  if (zone==="critical"){const cm=cr.min??(eMin-range*0.5),cx=cr.max??(eMax+range*0.5);
    if(Math.random()<0.5&&cr.min!==null) return rr(Math.max(0,cm-range*0.3),cm);
    if(cr.max!==null) return rr(cx,cx+range*0.3);
    if(n.min!==null) return rr(Math.max(0,eMin-range*0.5),eMin-range*0.2);
    return rr(eMax+range*0.2,eMax+range*0.5);}
  return null;
}
function round(v: number){if(Math.abs(v)>=100) return Math.round(v*10)/10; return Math.round(v*100)/100;}

const WEIGHTS = [0.70,0.20,0.10,0.00]; // healthy

const [{data: profile}, {data: biomarkers}, {data: planBm}] = await Promise.all([
  supabase.from("profiles").select("birth_date, gender").eq("id", USER_ID).single(),
  supabase.from("biomarkers").select("*").order("display_order"),
  supabase.from("plan_biomarkers").select("biomarker_id").eq("plan_id", PLAN_ID),
]);
const allowed = new Set((planBm||[]).map((r:any)=>r.biomarker_id));
const age = calculateAge(profile!.birth_date);
const gender = profile!.gender === "female" ? "female" : "male";
const values: {biomarkerId: string; value: string}[] = [];

for (const bm of biomarkers!) {
  if (!allowed.has(bm.id)) continue;
  if (CALCULATED_BIOMARKER_CODES.has(bm.code)) continue;
  const n = getNormalRangeForAge(bm as any, age, gender);
  const o = getOptimalRangeForAge(bm as any, age, gender);
  const c = getCriticalRangeForAge(bm as any, age, gender);
  if (n.min===null && n.max===null) continue;
  const zone = pickZone(WEIGHTS);
  const v = genVal(zone, n, o, c);
  if (v!==null && isFinite(v) && v>=0) values.push({biomarkerId: bm.id, value: String(round(v))});
}
const codeMap = new Map(biomarkers!.map((b:any)=>[b.code,b]));
const inputs: Record<string,number> = {};
for (const v of values){const bm=biomarkers!.find((b:any)=>b.id===v.biomarkerId); if(bm)inputs[bm.code]=parseFloat(v.value);}
const derived = computeAllDerivedValues(inputs, {age, sex: gender});
derived.forEach((val, code)=>{const bm=codeMap.get(code); if(!bm||!allowed.has(bm.id))return; values.push({biomarkerId:bm.id, value:String(val)});});

// Emit SQL
const rows = values.map(v=>`('${ANALYSIS_ID}','${v.biomarkerId}','${v.value}')`).join(",\n");
console.log(`DELETE FROM analysis_values WHERE analysis_id='${ANALYSIS_ID}';`);
console.log(`INSERT INTO analysis_values (analysis_id, biomarker_id, value) VALUES\n${rows};`);
console.error(`Generated ${values.length} values`);
