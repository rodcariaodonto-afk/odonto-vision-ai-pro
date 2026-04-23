import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Landmark { x: number; y: number; name: string; confidence: number; }
type Measurements = Record<string, number>;
type AnalysisType = "steiner" | "jarabak" | "mcnamara" | "ricketts" | "tweed" | "downs";

const LANDMARK_NAMES = [
  "Sella turcica","Nasion","Orbitale","Porion",
  "Subspinale (Point A)","Supramentale (Point B)","Pogonion","Menton","Gnathion","Gonion",
  "Lower Incisor Tip","Upper Incisor Tip","Upper Lip","Lower Lip","Subnasale",
  "Soft Tissue Pogonion","Posterior Nasal Spine","Anterior Nasal Spine","Articulare",
];

async function detectLandmarksHF(imageUrl: string): Promise<Landmark[]> {
  const hfToken = Deno.env.get("HUGGINGFACE_API_KEY");
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`Falha ao baixar imagem: ${imgResp.status}`);
  const imageBlob = await imgResp.blob();
  const hfResp = await fetch(
    "https://api-inference.huggingface.co/models/cwlachap/hrnet-cephalometric-landmark-detection",
    {
      method: "POST",
      headers: { Authorization: hfToken ? `Bearer ${hfToken}` : "", "Content-Type": imageBlob.type || "image/jpeg" },
      body: imageBlob,
    }
  );
  if (!hfResp.ok) throw new Error(`HF API erro ${hfResp.status}: ${await hfResp.text()}`);
  const result = await hfResp.json();
  let raw: Array<[number,number]> = [];
  if (Array.isArray(result)) raw = result;
  else if (result.keypoints) raw = result.keypoints;
  else if (result.landmarks) raw = result.landmarks;
  else raw = Object.values(result) as Array<[number,number]>;
  return raw.slice(0,19).map((pt,i) => ({
    x: Array.isArray(pt) ? pt[0] : (pt as any).x,
    y: Array.isArray(pt) ? pt[1] : (pt as any).y,
    name: LANDMARK_NAMES[i] ?? `Landmark ${i+1}`,
    confidence: (pt as any).confidence ?? 0.85,
  }));
}

function generateDemoLandmarks(seed=1): Landmark[] {
  const base: [number,number][] = [
    [384,180],[420,200],[460,240],[520,220],[440,360],[430,430],[410,460],
    [400,510],[405,490],[350,500],[450,450],[460,380],[470,340],[460,420],
    [450,320],[400,480],[370,290],[470,300],[340,270],
  ];
  return base.map(([x,y],i) => ({ x:x+(seed*3%10)-5, y:y+(seed*7%10)-5, name:LANDMARK_NAMES[i], confidence:0.75+(i%4)*0.05 }));
}

function calculateMeasurements(landmarks: Landmark[]): Measurements {
  const lm = new Map(landmarks.map(l => [l.name, l]));
  function angle(p1: Landmark, v: Landmark, p2: Landmark): number {
    const a={x:p1.x-v.x,y:p1.y-v.y}, b={x:p2.x-v.x,y:p2.y-v.y};
    return Math.abs(Math.atan2(a.x*b.y-a.y*b.x, a.x*b.x+a.y*b.y)*(180/Math.PI));
  }
  const S=lm.get("Sella turcica")!, N=lm.get("Nasion")!;
  const A=lm.get("Subspinale (Point A)")!, B=lm.get("Supramentale (Point B)")!;
  const Go=lm.get("Gonion"), Me=lm.get("Menton");
  const Or=lm.get("Orbitale"), Po=lm.get("Porion");
  const U1=lm.get("Upper Incisor Tip"), L1=lm.get("Lower Incisor Tip");
  if (!S||!N||!A||!B) throw new Error("Landmarks essenciais nao detectados");
  const SNA=angle(S,N,A), SNB=angle(S,N,B);
  const r=(v:number)=>Math.round(v*10)/10;
  return {
    SNA:r(SNA), SNB:r(SNB), ANB:r(SNA-SNB),
    "SN-GoGn":r(Go?angle(S,N,Go):32), FMA:r((Po&&Or&&Go)?angle(Po,Or,Go):25),
    IMPA:r((L1&&Go&&Me)?angle(L1,Me,Go):90), "U1-NA":r(U1?angle(U1,N,A):22),
    "L1-NB":r(L1?angle(L1,N,B):25),
    Overjet:r((U1&&L1)?Math.abs(U1.x-L1.x)*0.1:2),
    Overbite:r((U1&&L1)?Math.abs(U1.y-L1.y)*0.1:2),
  };
}

async function generateInterpretation(m: Measurements, name: string): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (key) {
    try {
      const prompt = `Você é especialista em cefalometria. Analise as medidas do paciente ${name||"paciente"} e gere interpretação clínica em 3-4 frases em português:\nSNA:${m.SNA}° SNB:${m.SNB}° ANB:${m.ANB}° SN-GoGn:${m["SN-GoGn"]}° FMA:${m.FMA}° IMPA:${m.IMPA}° U1-NA:${m["U1-NA"]}° L1-NB:${m["L1-NB"]}° Overjet:${m.Overjet}mm Overbite:${m.Overbite}mm\nSeja técnico e objetivo.`;
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method:"POST",
        headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
        body:JSON.stringify({model:"gpt-4o",messages:[{role:"user",content:prompt}],max_tokens:300,temperature:0.3}),
      });
      if (r.ok) { const d=await r.json(); return d.choices?.[0]?.message?.content??""; }
    } catch {}
  }
  const p:string[]=[];
  if (m.SNA>85) p.push("Maxila protraída (SNA "+m.SNA+"°)");
  else if (m.SNA<79) p.push("Maxila retruída (SNA "+m.SNA+"°)");
  else p.push("Posição maxilar normal (SNA "+m.SNA+"°)");
  if (m.SNB>83) p.push("mandíbula protraída (SNB "+m.SNB+"°)");
  else if (m.SNB<77) p.push("mandíbula retruída (SNB "+m.SNB+"°)");
  if (m.ANB>5) p.push("relação Classe II (ANB "+m.ANB+"°)");
  else if (m.ANB<0) p.push("relação Classe III (ANB "+m.ANB+"°)");
  else p.push("relação maxilomandibular equilibrada (ANB "+m.ANB+"°)");
  if (m["SN-GoGn"]>38) p.push("padrão vertical aumentado");
  else if (m["SN-GoGn"]<26) p.push("padrão horizontal");
  return p.map((s,i)=>i===0?s.charAt(0).toUpperCase()+s.slice(1):s).join("; ")+".";
}

serve(async (req) => {
  if (req.method==="OPTIONS") return new Response(null,{headers:corsHeaders});
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const {imageUrl,userId,patientId,patientName,imageStoragePath} = await req.json();
    if (!imageUrl||!userId||!patientId)
      return new Response(JSON.stringify({error:"imageUrl, userId e patientId obrigatorios"}),
        {status:400,headers:{...corsHeaders,"Content-Type":"application/json"}});

    const {data:record,error:ie} = await supabase.from("cephalometric_analyses").insert({
      user_id:userId, patient_id:patientId, patient_name:patientName??null,
      image_url:imageUrl, image_storage_path:imageStoragePath??imageUrl,
      landmarks:[], measurements:{}, status:"processing",
    }).select().single();
    if (ie) throw new Error(ie.message);

    let landmarks:Landmark[], usedFallback=false;
    try { landmarks=await detectLandmarksHF(imageUrl); }
    catch(e) { console.warn("HF fallback:",(e as Error).message); landmarks=generateDemoLandmarks(Date.now()%100); usedFallback=true; }

    const measurements=calculateMeasurements(landmarks);
    const interpretation=await generateInterpretation(measurements,patientName??"");

    await supabase.from("cephalometric_analyses").update({
      landmarks, measurements, interpretation, status:"completed",
      error_message:usedFallback?"Landmarks demonstrativos (HF API indisponível)":null,
    }).eq("id",record.id);

    await supabase.from("cephalometric_analysis_history").insert({
      analysis_id:record.id, event_type:"completed",
      event_data:{landmarks_count:landmarks.length,used_fallback:usedFallback},
      created_by:userId,
    });

    return new Response(JSON.stringify({success:true,analysisId:record.id,landmarks,measurements,interpretation,usedFallback}),
      {status:200,headers:{...corsHeaders,"Content-Type":"application/json"}});
  } catch(err:any) {
    console.error("analyze-cephalometry:",err);
    return new Response(JSON.stringify({error:err.message}),
      {status:500,headers:{...corsHeaders,"Content-Type":"application/json"}});
  }
});
