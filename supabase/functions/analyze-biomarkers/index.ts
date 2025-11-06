import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get analysis with values and biomarkers
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select(`
        *,
        analysis_values (
          value,
          biomarkers (
            name,
            code,
            unit,
            category,
            normal_min,
            normal_max,
            description
          )
        )
      `)
      .eq('id', analysisId)
      .single();

    if (analysisError) throw analysisError;

    // Get user complaints and profile
    const { data: complaint } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_id', analysis.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', analysis.user_id)
      .maybeSingle();

    // Get previous analyses for trend comparison (last 5)
    const { data: previousAnalyses } = await supabase
      .from('analyses')
      .select(`
        date,
        health_index,
        biological_age,
        analysis_values (
          value,
          biomarkers (
            name,
            code,
            unit
          )
        )
      `)
      .eq('user_id', analysis.user_id)
      .neq('id', analysisId)
      .order('date', { ascending: false })
      .limit(5);

    // Get previous recommendations (exclude current analysis recommendations)
    const { data: previousRecommendations } = await supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', analysis.user_id)
      .or(`analysis_id.is.null,analysis_id.neq.${analysisId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get AI prompt settings - use analysis_summary_prompt as the main system prompt
    const { data: promptSetting } = await supabase
      .from('ai_prompt_settings')
      .select('prompt_text')
      .eq('key', 'analysis_summary_prompt')
      .maybeSingle();

    // Prepare biomarker summary
    const biomarkerSummary = analysis.analysis_values
      .map((av: any) => {
        const b = av.biomarkers;
        const isLow = b.normal_min && av.value < b.normal_min;
        const isHigh = b.normal_max && av.value > b.normal_max;
        const status = isLow ? 'НИЖЕ НОРМЫ' : isHigh ? 'ВЫШЕ НОРМЫ' : 'В НОРМЕ';
        
        return `- ${b.name} (${b.category}): ${av.value} ${b.unit} [${status}]${
          b.normal_min && b.normal_max ? ` (норма: ${b.normal_min}-${b.normal_max})` : ''
        }`;
      })
      .join('\n');

    // Prepare historical data for trend analysis
    let historicalContext = '';
    if (previousAnalyses && previousAnalyses.length > 0) {
      historicalContext = '\n\nИСТОРИЯ ПРЕДЫДУЩИХ АНАЛИЗОВ:\n';
      previousAnalyses.forEach((prevAnalysis: any) => {
        historicalContext += `\nДата: ${prevAnalysis.date}`;
        if (prevAnalysis.health_index) {
          historicalContext += ` | Индекс здоровья: ${prevAnalysis.health_index}%`;
        }
        if (prevAnalysis.biological_age) {
          historicalContext += ` | Биологический возраст: ${prevAnalysis.biological_age}`;
        }
        historicalContext += '\n';
        
        // Compare biomarkers with current analysis
        prevAnalysis.analysis_values?.forEach((prevValue: any) => {
          const currentValue = analysis.analysis_values.find((cv: any) => 
            cv.biomarkers.code === prevValue.biomarkers.code
          );
          
          if (currentValue) {
            const change = currentValue.value - prevValue.value;
            const changePercent = ((change / prevValue.value) * 100).toFixed(1);
            const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
            historicalContext += `  ${prevValue.biomarkers.name}: ${prevValue.value} → ${currentValue.value} ${currentValue.biomarkers.unit} ${arrow} ${changePercent}%\n`;
          }
        });
      });
    }

    // Prepare previous recommendations context
    let recommendationsContext = '';
    if (previousRecommendations && previousRecommendations.length > 0) {
      recommendationsContext = '\n\nПРЕДЫДУЩИЕ РЕКОМЕНДАЦИИ:\n';
      previousRecommendations.slice(0, 5).forEach((rec: any) => {
        recommendationsContext += `\n[${rec.type}] ${rec.text.substring(0, 200)}...\n`;
      });
    }

    const userContext = `
Возраст: ${profile ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear() : 'не указан'}
Пол: ${profile?.gender === 'male' ? 'мужской' : profile?.gender === 'female' ? 'женский' : 'не указан'}
Жалобы: ${complaint?.main_complaints || 'не указаны'}
Цели: ${complaint?.goals || 'не указаны'}
Образ жизни: ${complaint?.lifestyle || 'не указан'}
`;

    const systemPrompt = promptSetting?.prompt_text || 
      'Ты эксперт по долголетию и здоровью. Проанализируй результаты анализов, ОБЯЗАТЕЛЬНО обрати внимание на динамику изменений показателей по сравнению с предыдущими анализами. Отметь положительные и отрицательные тренды. Учитывай предыдущие рекомендации и оцени, следовал ли им пациент. Создай краткое резюме на русском языке в дружелюбном тоне. Никогда не ставь диагнозы.';

    // User prompt with data
    const userPrompt = `
КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
${userContext}

ТЕКУЩИЕ РЕЗУЛЬТАТЫ АНАЛИЗОВ (${analysis.date}):
${biomarkerSummary}
${historicalContext}
${recommendationsContext}

ВАЖНО: Проанализируй динамику изменений показателей. Отметь улучшения и ухудшения. Если есть предыдущие рекомендации, оцени их эффективность на основе текущих результатов.
`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add funds to your Lovable AI workspace.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const fullText = aiData.choices[0].message.content;

    // Calculate basic health metrics from biomarkers
    const totalMarkers = analysis.analysis_values.length;
    const normalMarkers = analysis.analysis_values.filter((av: any) => {
      const b = av.biomarkers;
      const isInRange = (!b.normal_min || av.value >= b.normal_min) && 
                        (!b.normal_max || av.value <= b.normal_max);
      return isInRange;
    }).length;
    
    const health_index = Math.round((normalMarkers / totalMarkers) * 100);
    const biological_age = profile 
      ? Math.round((new Date().getFullYear() - new Date(profile.birth_date).getFullYear()) * (100 / health_index))
      : null;

    // Update analysis with health metrics
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        health_index,
        biological_age,
      })
      .eq('id', analysisId);
    if (updateError) {
      console.error('Failed to update analysis metrics:', updateError);
    }

    // Save full report as a single recommendation
    const { error: insertError } = await supabase
      .from('recommendations')
      .insert({
        user_id: analysis.user_id,
        analysis_id: analysisId,
        type: 'Общее резюме',
        text: fullText,
      });
    if (insertError) {
      console.error('Failed to insert recommendation:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save recommendation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        health_index,
        biological_age,
        summary: fullText.substring(0, 500) + '...' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-biomarkers:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
