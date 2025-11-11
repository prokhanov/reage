import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify user is superadmin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is superadmin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSuperAdmin = roles?.some(r => r.role === 'superadmin');
    if (!isSuperAdmin) {
      throw new Error('Only superadmins can run this operation');
    }

    console.log('Starting data sanitization...');

    // Get all analyses
    const { data: analyses, error: analysesError } = await supabaseAdmin
      .from('analyses')
      .select('id, user_id, biological_age, health_index');

    if (analysesError) {
      throw analysesError;
    }

    let sanitizedCount = 0;
    let deletedRiskZones = 0;

    // Check each analysis for biomarkers
    for (const analysis of analyses || []) {
      const { count } = await supabaseAdmin
        .from('analysis_values')
        .select('*', { count: 'exact', head: true })
        .eq('analysis_id', analysis.id);

      // If no biomarkers, set biological_age and health_index to null
      if (count === 0 && (analysis.biological_age !== null || analysis.health_index !== null)) {
        const { error: updateError } = await supabaseAdmin
          .from('analyses')
          .update({
            biological_age: null,
            health_index: null
          })
          .eq('id', analysis.id);

        if (updateError) {
          console.error(`Error updating analysis ${analysis.id}:`, updateError);
        } else {
          sanitizedCount++;
          console.log(`Sanitized analysis ${analysis.id} - removed invalid metrics`);
        }
      }
    }

    // Get all users and check if they have any analyses with biomarkers
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id');

    if (profilesError) {
      throw profilesError;
    }

    for (const profile of profiles || []) {
      // Check if user has any analyses with biomarkers
      const { data: userAnalyses } = await supabaseAdmin
        .from('analyses')
        .select('id')
        .eq('user_id', profile.id);

      let hasBiomarkers = false;
      for (const analysis of userAnalyses || []) {
        const { count } = await supabaseAdmin
          .from('analysis_values')
          .select('*', { count: 'exact', head: true })
          .eq('analysis_id', analysis.id);

        if (count && count > 0) {
          hasBiomarkers = true;
          break;
        }
      }

      // If no biomarkers, delete risk zone analyses
      if (!hasBiomarkers) {
        const { error: deleteError, count: deleted } = await supabaseAdmin
          .from('risk_zone_analyses')
          .delete({ count: 'exact' })
          .eq('user_id', profile.id);

        if (deleteError) {
          console.error(`Error deleting risk zones for user ${profile.id}:`, deleteError);
        } else if (deleted && deleted > 0) {
          deletedRiskZones += deleted;
          console.log(`Deleted ${deleted} risk zone entries for user ${profile.id} (no biomarkers)`);
        }
      }
    }

    console.log(`Data sanitization completed: ${sanitizedCount} analyses sanitized, ${deletedRiskZones} risk zone entries deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        sanitized_analyses: sanitizedCount,
        deleted_risk_zones: deletedRiskZones,
        message: `Sanitized ${sanitizedCount} analyses and deleted ${deletedRiskZones} invalid risk zone entries`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in sanitize-analysis-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
