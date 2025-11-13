import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  features: string[];
  is_active: boolean;
  display_order: number;
  badge_text: string | null;
  badge_color: string | null;
  created_at: string;
  updated_at: string;
  included_biomarkers?: string[];
}

export interface SubscriptionPricing {
  id: string;
  plan_id: string;
  period: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  period_display: string;
  duration_months: number;
  amount: number;
  discount_percentage: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanWithPricing extends SubscriptionPlan {
  pricing: SubscriptionPricing[];
}

export function useSubscriptionPlans(includeInactive = false) {
  return useQuery({
    queryKey: ['subscription-plans', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('subscription_plans')
        .select('*');
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data: plans, error: plansError } = await query
        .order('display_order', { ascending: true });

      if (plansError) throw plansError;

      const { data: pricing, error: pricingError } = await supabase
        .from('subscription_pricing')
        .select('*')
        .eq('is_enabled', true);

      if (pricingError) throw pricingError;

      // Загрузка биомаркеров для каждого тарифа
      const { data: planBiomarkers, error: biomarkersError } = await supabase
        .from('plan_biomarkers')
        .select('plan_id, biomarker_id');

      if (biomarkersError) throw biomarkersError;

      const plansWithPricing: PlanWithPricing[] = (plans || []).map(plan => ({
        ...plan,
        features: (plan.features as string[]) || [],
        pricing: (pricing || [])
          .filter(p => p.plan_id === plan.id)
          .map(p => ({
            ...p,
            period: p.period as 'monthly' | 'quarterly' | 'semiannual' | 'annual'
          })),
        included_biomarkers: (planBiomarkers || [])
          .filter(pb => pb.plan_id === plan.id)
          .map(pb => pb.biomarker_id)
      }));

      return plansWithPricing;
    },
  });
}

export function calculateSavings(monthlyPrice: number, actualPrice: number, months: number) {
  const totalMonthlyPrice = monthlyPrice * months;
  return totalMonthlyPrice - actualPrice;
}

export function calculateMonthlyEquivalent(price: number, months: number) {
  return Math.round(price / months);
}
