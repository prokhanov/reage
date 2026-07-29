// Batched public data for the landing page. Consolidates ~7 parallel Supabase
// requests (plans, pricing, plan_biomarkers, biomarkers, biomarker_categories,
// lab_locations, lab_map_contexts) into a single JSON response so the browser
// makes one request instead of blowing the LCP dependency chain on mobile.
//
// Public endpoint — no auth needed. Cached at the edge for 60s and served
// stale-while-revalidate to keep freshness "instant enough" while eliminating
// the request fan-out from cold devices.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const cacheHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const [
      plansRes,
      pricingRes,
      planBiomarkersRes,
      biomarkersRes,
      biomarkerCategoriesRes,
      labLocationsRes,
      labMapCtxRes,
    ] = await Promise.all([
      supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('subscription_pricing')
        .select('*')
        .eq('is_enabled', true),
      supabase.from('plan_biomarkers').select('plan_id, biomarker_id'),
      supabase
        .from('biomarkers')
        .select('id, name, category, display_order')
        .order('display_order'),
      supabase
        .from('biomarker_categories')
        .select('name, display_order')
        .order('display_order'),
      supabase
        .from('lab_locations')
        .select('id,title,metro,city,address_short,full_address,phones,hours,page_url,lat,lng')
        .eq('is_active', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null),
      supabase
        .from('lab_map_contexts')
        .select('*')
        .eq('key', 'landing')
        .maybeSingle(),
    ]);

    const errors = [
      plansRes.error, pricingRes.error, planBiomarkersRes.error,
      biomarkersRes.error, biomarkerCategoriesRes.error,
      labLocationsRes.error, labMapCtxRes.error,
    ].filter(Boolean);
    if (errors.length > 0) throw errors[0];

    const body = {
      plans: plansRes.data ?? [],
      pricing: pricingRes.data ?? [],
      planBiomarkers: planBiomarkersRes.data ?? [],
      biomarkers: biomarkersRes.data ?? [],
      biomarkerCategories: biomarkerCategoriesRes.data ?? [],
      labLocations: labLocationsRes.data ?? [],
      labMapContext: labMapCtxRes.data ?? null,
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, ...cacheHeaders },
    });
  } catch (err) {
    console.error('landing-bootstrap failed', err);
    return new Response(
      JSON.stringify({ error: (err as Error)?.message ?? 'bootstrap failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
