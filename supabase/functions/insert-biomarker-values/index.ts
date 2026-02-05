import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BiomarkerValue {
  biomarker_id: string;
  value: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { analysis_id, values } = await req.json() as {
      analysis_id: string;
      values: BiomarkerValue[];
    };

    if (!analysis_id || !values || !Array.isArray(values)) {
      return new Response(
        JSON.stringify({ error: "Missing analysis_id or values array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify analysis exists
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select("id")
      .eq("id", analysis_id)
      .single();

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ error: "Analysis not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare insert data
    const insertData = values.map((v) => ({
      analysis_id,
      biomarker_id: v.biomarker_id,
      value: v.value,
    }));

    // Insert all values
    const { data: inserted, error: insertError } = await supabase
      .from("analysis_values")
      .insert(insertData)
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted_count: inserted?.length || 0,
        message: `Successfully inserted ${inserted?.length || 0} biomarker values`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
