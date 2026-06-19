import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PromoDiscountType = "percent" | "fixed" | "free_period";
export type PromoAppliesTo = "all_plans" | "specific";

export interface PromoCode {
  id: string;
  code: string;
  batch_id: string | null;
  discount_type: PromoDiscountType;
  discount_value: number;
  applies_to: PromoAppliesTo;
  bound_user_id: string | null;
  max_uses: number | null;
  used_count: number;
  one_per_user: boolean;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  batch?: { id: string; name: string } | null;
}

export interface PromoBatch {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  codes_count?: number;
  used_count?: number;
}

export interface PromoRedemption {
  id: string;
  promo_code_id: string;
  user_id: string;
  original_amount: number;
  discount_applied: number;
  final_amount: number;
  redeemed_at: string;
  promo_code?: { code: string } | null;
}

export interface PromoCodeFilters {
  search?: string;
  batchId?: string | null;
  status?: "all" | "active" | "inactive" | "expired" | "exhausted";
}

export function usePromoCodes(filters: PromoCodeFilters = {}) {
  return useQuery({
    queryKey: ["promo-codes", filters],
    queryFn: async () => {
      let q = supabase
        .from("promo_codes")
        .select("*, batch:promo_code_batches(id, name)")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (filters.search) {
        q = q.ilike("code", `%${filters.search}%`);
      }
      if (filters.batchId) {
        q = q.eq("batch_id", filters.batchId);
      }

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []) as unknown as PromoCode[];
      if (filters.status && filters.status !== "all") {
        const now = new Date();
        rows = rows.filter((r) => {
          const expired = r.expires_at && new Date(r.expires_at) < now;
          const exhausted = r.max_uses != null && r.used_count >= r.max_uses;
          if (filters.status === "active") return r.is_active && !expired && !exhausted;
          if (filters.status === "inactive") return !r.is_active;
          if (filters.status === "expired") return !!expired;
          if (filters.status === "exhausted") return !!exhausted;
          return true;
        });
      }
      return rows;
    },
  });
}

export function usePromoBatches() {
  return useQuery({
    queryKey: ["promo-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_code_batches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const batches = (data ?? []) as PromoBatch[];
      if (batches.length === 0) return batches;

      // подсчёт кодов по партиям
      const ids = batches.map((b) => b.id);
      const { data: codes } = await supabase
        .from("promo_codes")
        .select("batch_id, used_count")
        .in("batch_id", ids);

      const map = new Map<string, { count: number; used: number }>();
      (codes ?? []).forEach((c: any) => {
        const cur = map.get(c.batch_id) ?? { count: 0, used: 0 };
        cur.count += 1;
        cur.used += Number(c.used_count) || 0;
        map.set(c.batch_id, cur);
      });
      return batches.map((b) => ({
        ...b,
        codes_count: map.get(b.id)?.count ?? 0,
        used_count: map.get(b.id)?.used ?? 0,
      }));
    },
  });
}

export function usePromoRedemptions() {
  return useQuery({
    queryKey: ["promo-redemptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_code_redemptions")
        .select("*, promo_code:promo_codes(code)")
        .order("redeemed_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as PromoRedemption[];
    },
  });
}

export function usePromoMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
    queryClient.invalidateQueries({ queryKey: ["promo-batches"] });
    queryClient.invalidateQueries({ queryKey: ["promo-redemptions"] });
  };

  const createPromoCode = useMutation({
    mutationFn: async (input: Partial<PromoCode> & { plan_links?: { plan_id: string; pricing_id?: string | null }[] }) => {
      const { plan_links, ...row } = input;
      const { data, error } = await supabase
        .from("promo_codes")
        .insert(row as any)
        .select()
        .single();
      if (error) throw error;
      if (input.applies_to === "specific" && plan_links && plan_links.length > 0) {
        await supabase.from("promo_code_plans").insert(
          plan_links.map((l) => ({
            promo_code_id: data.id,
            plan_id: l.plan_id,
            pricing_id: l.pricing_id ?? null,
          })),
        );
      }
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Промокод создан" });
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updatePromoCode = useMutation({
    mutationFn: async ({ id, plan_links, ...row }: Partial<PromoCode> & { id: string; plan_links?: { plan_id: string; pricing_id?: string | null }[] }) => {
      const { error } = await supabase.from("promo_codes").update(row as any).eq("id", id);
      if (error) throw error;
      if (row.applies_to !== undefined) {
        await supabase.from("promo_code_plans").delete().eq("promo_code_id", id);
        if (row.applies_to === "specific" && plan_links && plan_links.length > 0) {
          await supabase.from("promo_code_plans").insert(
            plan_links.map((l) => ({
              promo_code_id: id,
              plan_id: l.plan_id,
              pricing_id: l.pricing_id ?? null,
            })),
          );
        }
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Промокод обновлён" });
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deletePromoCodes = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("promo_codes").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      invalidate();
      toast({ title: `Удалено: ${ids.length}` });
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const togglePromoCodes = useMutation({
    mutationFn: async ({ ids, is_active }: { ids: string[]; is_active: boolean }) => {
      const { error } = await supabase
        .from("promo_codes")
        .update({ is_active })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Статус обновлён" });
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteBatch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_code_batches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Партия удалена" });
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const generateBatch = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("generate-promo-codes", {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { batch_id: string | null; count: number; codes: { id: string; code: string }[] };
    },
    onSuccess: (data) => {
      invalidate();
      toast({ title: `Сгенерировано: ${data.count}` });
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка генерации", description: e.message, variant: "destructive" }),
  });

  return {
    createPromoCode,
    updatePromoCode,
    deletePromoCodes,
    togglePromoCodes,
    deleteBatch,
    generateBatch,
  };
}

export function getPromoStatus(p: PromoCode): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  const now = new Date();
  if (!p.is_active) return { label: "Выключен", variant: "secondary" };
  if (p.expires_at && new Date(p.expires_at) < now)
    return { label: "Истёк", variant: "destructive" };
  if (p.max_uses != null && p.used_count >= p.max_uses)
    return { label: "Исчерпан", variant: "destructive" };
  if (p.starts_at && new Date(p.starts_at) > now)
    return { label: "Запланирован", variant: "outline" };
  return { label: "Активен", variant: "default" };
}

export function formatDiscount(p: Pick<PromoCode, "discount_type" | "discount_value">): string {
  if (p.discount_type === "percent") return `-${p.discount_value}%`;
  if (p.discount_type === "fixed") return `-${p.discount_value} ₽`;
  return `+${p.discount_value} мес.`;
}
