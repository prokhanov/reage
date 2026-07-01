import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BirthDatePicker } from "@/components/BirthDatePicker";
import genderMale from "@/assets/gender-male.webp";
import genderFemale from "@/assets/gender-female.webp";


function parseLocalDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

interface Profile {
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  birth_date: string;
  gender: string;
  height: number | null;
  weight?: number | null;
  reproductive_status?: string | null;
  last_menstrual_date?: string | null;
  pregnancy_start_date?: string | null;
  postpartum_date?: string | null;
  menopause_date?: string | null;
  contraceptive_type?: string | null;
  contraceptive_start_date?: string | null;
  hrt_type?: string | null;
  hrt_route?: string | null;
  hrt_start_date?: string | null;
}

function splitFullName(name: string): { first: string; last: string } {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return { first: "", last: "" };
  const [first, ...rest] = parts;
  return { first, last: rest.join(" ") };
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  userId: string | null;
  onSuccess: () => void;
}

export function EditProfileDialog({ open, onOpenChange, profile, userId, onSuccess }: EditProfileDialogProps) {
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    gender: profile?.gender || "male",
    birth_date: profile?.birth_date ? parseLocalDate(profile.birth_date) : undefined,
    height: profile?.height?.toString() || "",
    weight: profile?.weight != null ? String(profile.weight) : "",
    reproductive_status: profile?.reproductive_status || "",
    last_menstrual_date: profile?.last_menstrual_date || "",
    pregnancy_start_date: profile?.pregnancy_start_date || "",
    postpartum_date: profile?.postpartum_date || "",
    menopause_date: profile?.menopause_date || "",
    contraceptive_type: profile?.contraceptive_type || "",
    contraceptive_start_date: profile?.contraceptive_start_date || "",
    hrt_type: profile?.hrt_type || "",
    hrt_route: profile?.hrt_route || "",
    hrt_start_date: profile?.hrt_start_date || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        gender: profile.gender || "male",
        birth_date: profile.birth_date ? parseLocalDate(profile.birth_date) : undefined,
        height: profile.height?.toString() || "",
        weight: profile.weight != null ? String(profile.weight) : "",
        reproductive_status: profile.reproductive_status || "",
        last_menstrual_date: profile.last_menstrual_date || "",
        pregnancy_start_date: profile.pregnancy_start_date || "",
        postpartum_date: profile.postpartum_date || "",
        menopause_date: profile.menopause_date || "",
        contraceptive_type: profile.contraceptive_type || "",
        contraceptive_start_date: profile.contraceptive_start_date || "",
        hrt_type: profile.hrt_type || "",
        hrt_route: profile.hrt_route || "",
        hrt_start_date: profile.hrt_start_date || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!formData.name || !formData.birth_date) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      if (!userId) throw new Error("Не авторизован");

      const weightValue = formData.weight ? parseFloat(formData.weight) : null;

      const { error, data } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          gender: formData.gender,
          birth_date: format(formData.birth_date, 'yyyy-MM-dd'),
          height: formData.height ? parseFloat(formData.height) : null,
          weight: weightValue,
          reproductive_status: formData.gender === 'female' && formData.reproductive_status
            ? formData.reproductive_status
            : null,
          last_menstrual_date: formData.gender === 'female' && formData.reproductive_status === 'regular' && formData.last_menstrual_date
            ? formData.last_menstrual_date
            : null,
          pregnancy_start_date: formData.gender === 'female' && formData.reproductive_status === 'pregnant' && formData.pregnancy_start_date
            ? formData.pregnancy_start_date
            : null,
          postpartum_date: formData.gender === 'female' && formData.reproductive_status === 'lactating' && formData.postpartum_date
            ? formData.postpartum_date
            : null,
          menopause_date: formData.gender === 'female' && (formData.reproductive_status === 'menopause' || formData.reproductive_status === 'perimenopause') && formData.menopause_date
            ? formData.menopause_date
            : null,
          contraceptive_type: formData.gender === 'female' && formData.reproductive_status === 'contraceptives' && formData.contraceptive_type
            ? formData.contraceptive_type
            : null,
          contraceptive_start_date: formData.gender === 'female' && formData.reproductive_status === 'contraceptives' && formData.contraceptive_start_date
            ? formData.contraceptive_start_date
            : null,
          hrt_type: formData.gender === 'female' && formData.reproductive_status === 'hormonal_therapy' && formData.hrt_type
            ? formData.hrt_type
            : null,
          hrt_route: formData.gender === 'female' && formData.reproductive_status === 'hormonal_therapy' && formData.hrt_route
            ? formData.hrt_route
            : null,
          hrt_start_date: formData.gender === 'female' && formData.reproductive_status === 'hormonal_therapy' && formData.hrt_start_date
            ? formData.hrt_start_date
            : null,
        } as any)
        .eq("id", userId)
        .select()
        .maybeSingle();

      if (error || !data) {
        throw new Error(error?.message || "Недостаточно прав для обновления профиля");
      }

      // Record weight change in history so trends update too
      if (weightValue != null && weightValue !== (profile?.weight ?? null)) {
        await supabase
          .from("weight_history")
          .insert({ user_id: userId, weight: weightValue } as any);
      }

      toast({
        title: "Успешно сохранено! ✅",
        description: "Профиль обновлен"
      });

      // Small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 200));
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Попробуйте еще раз",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Редактировать профиль</DialogTitle>
          <DialogDescription>
            Обновите вашу личную информацию
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 px-6 overflow-y-auto flex-1 min-h-0">

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Имя *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ваше имя"
            />
          </div>

          {/* Gender */}
          <div className="space-y-3">
            <Label>Пол *</Label>
            <RadioGroup 
              value={formData.gender} 
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="male" id="edit-male" className="peer sr-only" />
                <Label
                  htmlFor="edit-male"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <img src={genderMale} alt="Мужчина" className="w-20 h-20 mb-2 object-contain" />
                  <span className="font-medium">Мужчина</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="female" id="edit-female" className="peer sr-only" />
                <Label
                  htmlFor="edit-female"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <img src={genderFemale} alt="Женщина" className="w-20 h-20 mb-2 object-contain" />
                  <span className="font-medium">Женщина</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label>Дата рождения *</Label>
            <BirthDatePicker
              value={formData.birth_date}
              onChange={(date) => setFormData({ ...formData, birth_date: date })}
            />
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label htmlFor="edit-height">Рост (см)</Label>
            <Input
              id="edit-height"
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              placeholder="175"
              step="0.1"
            />
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label htmlFor="edit-weight">Вес (кг)</Label>
            <Input
              id="edit-weight"
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              placeholder="70"
              step="0.1"
            />
          </div>

          {/* Reproductive status (female only) */}
          {formData.gender === "female" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-repro">Репродуктивный статус</Label>
                <Select
                  value={formData.reproductive_status || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      reproductive_status: value === "none" ? "" : value,
                      last_menstrual_date: value === "regular" ? formData.last_menstrual_date : "",
                      pregnancy_start_date: value === "pregnant" ? formData.pregnancy_start_date : "",
                      postpartum_date: value === "lactating" ? formData.postpartum_date : "",
                      menopause_date: (value === "menopause" || value === "perimenopause") ? formData.menopause_date : "",
                      contraceptive_type: value === "contraceptives" ? formData.contraceptive_type : "",
                      contraceptive_start_date: value === "contraceptives" ? formData.contraceptive_start_date : "",
                      hrt_type: value === "hormonal_therapy" ? formData.hrt_type : "",
                      hrt_route: value === "hormonal_therapy" ? formData.hrt_route : "",
                      hrt_start_date: value === "hormonal_therapy" ? formData.hrt_start_date : "",
                    })
                  }
                >
                  <SelectTrigger id="edit-repro">
                    <SelectValue placeholder="Не указано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не указано</SelectItem>
                    <SelectItem value="regular">Регулярный цикл</SelectItem>
                    <SelectItem value="contraceptives">Принимаю КОК</SelectItem>
                    <SelectItem value="pregnant">Беременность</SelectItem>
                    <SelectItem value="lactating">Кормление грудью</SelectItem>
                    <SelectItem value="perimenopause">Пременопауза</SelectItem>
                    <SelectItem value="menopause">Менопауза</SelectItem>
                    <SelectItem value="hormonal_therapy">ЗГТ (гормональная терапия)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Помогает ИИ корректно интерпретировать гормоны и другие показатели
                </p>
              </div>

              {formData.reproductive_status === "regular" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-lmp">Дата начала последней менструации</Label>
                  <Input
                    id="edit-lmp"
                    type="date"
                    value={formData.last_menstrual_date}
                    onChange={(e) =>
                      setFormData({ ...formData, last_menstrual_date: e.target.value })
                    }
                  />
                </div>
              )}

              {formData.reproductive_status === "pregnant" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-preg-start">Дата начала беременности (первый день последней менструации перед беременностью)</Label>
                  <Input
                    id="edit-preg-start"
                    type="date"
                    value={formData.pregnancy_start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, pregnancy_start_date: e.target.value })
                    }
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                  {formData.pregnancy_start_date && (() => {
                    const days = Math.floor((Date.now() - parseLocalDate(formData.pregnancy_start_date).getTime()) / 86400000);
                    if (days < 0 || days > 320) return null;
                    const weeks = Math.floor(days / 7);
                    const tri = weeks < 13 ? 'I триместр' : weeks < 27 ? 'II триместр' : 'III триместр';
                    return <p className="text-xs text-muted-foreground">Текущий срок: ~{weeks} нед. ({tri})</p>;
                  })()}
                </div>
              )}

              {formData.reproductive_status === "lactating" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-postpartum">Дата родов</Label>
                  <Input
                    id="edit-postpartum"
                    type="date"
                    value={formData.postpartum_date}
                    onChange={(e) => setFormData({ ...formData, postpartum_date: e.target.value })}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                  {formData.postpartum_date && (() => {
                    const days = Math.floor((Date.now() - parseLocalDate(formData.postpartum_date).getTime()) / 86400000);
                    if (days < 0) return null;
                    const months = Math.floor(days / 30);
                    return <p className="text-xs text-muted-foreground">Прошло после родов: ~{months} мес.</p>;
                  })()}
                </div>
              )}

              {(formData.reproductive_status === "menopause" || formData.reproductive_status === "perimenopause") && (
                <div className="space-y-2">
                  <Label htmlFor="edit-menopause">
                    {formData.reproductive_status === "menopause"
                      ? "Дата последней менструации (год менопаузы)"
                      : "Дата последней менструации (если ещё бывают)"}
                  </Label>
                  <Input
                    id="edit-menopause"
                    type="date"
                    value={formData.menopause_date}
                    onChange={(e) => setFormData({ ...formData, menopause_date: e.target.value })}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              )}

              {formData.reproductive_status === "contraceptives" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contra-type">Тип контрацепции</Label>
                    <Select
                      value={formData.contraceptive_type || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, contraceptive_type: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger id="edit-contra-type">
                        <SelectValue placeholder="Не указан" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не указан</SelectItem>
                        <SelectItem value="coc">КОК (комбинированные)</SelectItem>
                        <SelectItem value="progestin_only">Только прогестины (мини-пили)</SelectItem>
                        <SelectItem value="iud_hormonal">ВМС с левоноргестрелом (Мирена)</SelectItem>
                        <SelectItem value="iud_copper">ВМС медная (негормональная)</SelectItem>
                        <SelectItem value="implant">Имплант</SelectItem>
                        <SelectItem value="injection">Инъекционная (Депо-Провера)</SelectItem>
                        <SelectItem value="patch_ring">Пластырь / кольцо</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contra-start">Дата начала приёма</Label>
                    <Input
                      id="edit-contra-start"
                      type="date"
                      value={formData.contraceptive_start_date}
                      onChange={(e) => setFormData({ ...formData, contraceptive_start_date: e.target.value })}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </>
              )}

              {formData.reproductive_status === "hormonal_therapy" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-hrt-type">Тип МГТ</Label>
                    <Select
                      value={formData.hrt_type || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, hrt_type: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger id="edit-hrt-type">
                        <SelectValue placeholder="Не указан" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не указан</SelectItem>
                        <SelectItem value="estrogen_only">Только эстроген</SelectItem>
                        <SelectItem value="estrogen_progestin">Эстроген + прогестин</SelectItem>
                        <SelectItem value="progestin_only">Только прогестин</SelectItem>
                        <SelectItem value="tibolone">Тиболон</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-hrt-route">Путь введения</Label>
                    <Select
                      value={formData.hrt_route || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, hrt_route: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger id="edit-hrt-route">
                        <SelectValue placeholder="Не указан" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не указан</SelectItem>
                        <SelectItem value="oral">Перорально (таблетки)</SelectItem>
                        <SelectItem value="transdermal">Трансдермально (пластырь/гель)</SelectItem>
                        <SelectItem value="vaginal">Вагинально</SelectItem>
                        <SelectItem value="injection">Инъекции</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Путь введения влияет на липиды, СГСГ, СРБ, коагулограмму
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-hrt-start">Дата начала терапии</Label>
                    <Input
                      id="edit-hrt-start"
                      type="date"
                      value={formData.hrt_start_date}
                      onChange={(e) => setFormData({ ...formData, hrt_start_date: e.target.value })}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </>
              )}
            </>
          )}

        </div>


        <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
