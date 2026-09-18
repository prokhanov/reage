import { useEffect, useState } from "react";
import { Gift, Save, Stethoscope, Tag } from "lucide-react";

import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CHECKUPS, money } from "@/data/checkups";
import { FULL_CHECKUP } from "@/data/fullCheckup";

const ADMIN_CHECKUPS = [...CHECKUPS, FULL_CHECKUP];

interface PriceRow {
  slug: string;
  price: number;
  is_active: boolean;
  cbc_bonus_enabled: boolean;
}

interface DoctorRow {
  id: string;
  name: string;
  specialty: string;
  credentials: string[];
  description: string;
  consultation_price: number;
  consultation_enabled: boolean;
}

export default function AdminCheckups() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingPrices, setSavingPrices] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [doctor, setDoctor] = useState<DoctorRow | null>(null);
  const [credentialsText, setCredentialsText] = useState("");

  const load = async () => {
    setLoading(true);
    const [pricesRes, doctorRes] = await Promise.all([
      supabase.from("checkup_settings").select("slug, price, is_active, cbc_bonus_enabled"),
      supabase
        .from("checkup_doctor_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const saved = new Map((pricesRes.data ?? []).map((r) => [r.slug, r]));
    setRows(
      ADMIN_CHECKUPS.map((c) => ({
        slug: c.slug,
        price: saved.get(c.slug)?.price ?? c.price,
        is_active: saved.get(c.slug)?.is_active ?? true,
        cbc_bonus_enabled: saved.get(c.slug)?.cbc_bonus_enabled ?? false,
      })),
    );

    if (doctorRes.data) {
      const d = doctorRes.data as DoctorRow;
      setDoctor(d);
      setCredentialsText((d.credentials ?? []).join("\n"));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const savePrices = async () => {
    setSavingPrices(true);
    const { error } = await supabase
      .from("checkup_settings")
      .upsert(
        rows.map((r) => ({
          slug: r.slug,
          price: r.price,
          is_active: r.is_active,
          cbc_bonus_enabled: r.cbc_bonus_enabled,
        })),
        { onConflict: "slug" },
      );
    setSavingPrices(false);
    if (error) {
      toast({ title: "Не удалось сохранить цены", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Цены сохранены" });
  };

  const saveDoctor = async () => {
    if (!doctor) return;
    setSavingDoctor(true);
    const payload = {
      name: doctor.name,
      specialty: doctor.specialty,
      credentials: credentialsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      description: doctor.description,
      consultation_price: doctor.consultation_price,
      consultation_enabled: doctor.consultation_enabled,
    };
    const { error } = await supabase
      .from("checkup_doctor_settings")
      .update(payload)
      .eq("id", doctor.id);
    setSavingDoctor(false);
    if (error) {
      toast({ title: "Не удалось сохранить врача", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Данные врача сохранены" });
  };

  if (loading) return <AdminCenterLoader />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Чекапы"
        description="Цены чекапов на лендингах и данные врача для консультации"
      />

      <Tabs defaultValue="prices">
        <TabsList>
          <TabsTrigger value="prices" className="gap-2">
            <Tag className="h-4 w-4" /> Цены
          </TabsTrigger>
          <TabsTrigger value="doctor" className="gap-2">
            <Stethoscope className="h-4 w-4" /> Врач и консультация
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="mt-4 space-y-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Чекап</TableHead>
                  <TableHead>Адрес</TableHead>
                  <TableHead className="w-40">Цена, ₽</TableHead>
                  <TableHead className="w-40">ОАК в подарок</TableHead>
                  <TableHead className="w-32">Показывать</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const checkup = ADMIN_CHECKUPS.find((c) => c.slug === row.slug);
                  return (
                    <TableRow key={row.slug}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {checkup?.name ?? row.slug}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        /checkup/{row.slug}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={row.price}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.slug === row.slug
                                  ? { ...r, price: Math.max(0, Number(e.target.value) || 0) }
                                  : r,
                              ),
                            )
                          }
                          className="h-9 w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={row.cbc_bonus_enabled}
                            onCheckedChange={(v) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.slug === row.slug ? { ...r, cbc_bonus_enabled: v } : r,
                                ),
                              )
                            }
                          />
                          {row.cbc_bonus_enabled && <Gift className="h-4 w-4 text-primary" aria-hidden />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={row.is_active}
                          onCheckedChange={(v) =>
                            setRows((prev) =>
                              prev.map((r) => (r.slug === row.slug ? { ...r, is_active: v } : r)),
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Button onClick={savePrices} disabled={savingPrices} className="gap-2">
            {savingPrices ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
            Сохранить цены
          </Button>
        </TabsContent>

        <TabsContent value="doctor" className="mt-4 space-y-4">
          {doctor && (
            <div className="max-w-2xl space-y-4 rounded-lg border border-border p-4">
              <div className="space-y-2">
                <Label>Имя врача</Label>
                <Input
                  value={doctor.name}
                  onChange={(e) => setDoctor({ ...doctor, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Специальность</Label>
                <Input
                  value={doctor.specialty}
                  onChange={(e) => setDoctor({ ...doctor, specialty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Регалии (по одной в строке)</Label>
                <Textarea
                  rows={4}
                  value={credentialsText}
                  onChange={(e) => setCredentialsText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  rows={5}
                  value={doctor.description}
                  onChange={(e) => setDoctor({ ...doctor, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Цена консультации, ₽</Label>
                <Input
                  type="number"
                  min={0}
                  value={doctor.consultation_price}
                  onChange={(e) =>
                    setDoctor({
                      ...doctor,
                      consultation_price: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-40"
                />
                <p className="text-sm text-muted-foreground">
                  Сейчас в корзине: {money(doctor.consultation_price)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={doctor.consultation_enabled}
                  onCheckedChange={(v) => setDoctor({ ...doctor, consultation_enabled: v })}
                />
                <Label>Предлагать консультацию в корзине</Label>
              </div>
              <Button onClick={saveDoctor} disabled={savingDoctor} className="gap-2">
                {savingDoctor ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
                Сохранить
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
