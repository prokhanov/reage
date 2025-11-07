import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Biomarker {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  normal_min: number | null;
  normal_max: number | null;
}

interface BiomarkerValue {
  biomarkerId: string;
  value: string;
  unitOverride?: string;
}

interface AnalysisStep2Props {
  data: {
    values: BiomarkerValue[];
  };
  onChange: (data: any) => void;
}

export function AnalysisStep2({ data, onChange }: AnalysisStep2Props) {
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBiomarkers();
  }, []);

  const loadBiomarkers = async () => {
    try {
      const { data: biomarkersData, error } = await supabase
        .from("biomarkers")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setBiomarkers(biomarkersData || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBiomarkers = biomarkers.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedBiomarkers = filteredBiomarkers.reduce((acc, biomarker) => {
    if (!acc[biomarker.category]) {
      acc[biomarker.category] = [];
    }
    acc[biomarker.category].push(biomarker);
    return acc;
  }, {} as Record<string, Biomarker[]>);

  const getValue = (biomarkerId: string) => {
    return data.values.find((v) => v.biomarkerId === biomarkerId);
  };

  const updateValue = (biomarkerId: string, value: string, unitOverride?: string) => {
    const existing = data.values.find((v) => v.biomarkerId === biomarkerId);
    
    if (existing) {
      onChange({
        values: data.values.map((v) =>
          v.biomarkerId === biomarkerId ? { ...v, value, unitOverride } : v
        ),
      });
    } else {
      onChange({
        values: [...data.values, { biomarkerId, value, unitOverride }],
      });
    }
  };

  const removeValue = (biomarkerId: string) => {
    onChange({
      values: data.values.filter((v) => v.biomarkerId !== biomarkerId),
    });
  };

  const addedCount = data.values.length;

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <Label>Выберите биомаркеры и укажите значения</Label>
        <span className="text-sm text-muted-foreground">
          Добавлено: {addedCount}
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск биомаркера..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
      ) : (
        <Accordion type="multiple" className="w-full">
          {Object.entries(groupedBiomarkers).map(([category, markers]) => (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="text-sm font-semibold">
                {category} ({markers.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {markers.map((biomarker) => {
                    const currentValue = getValue(biomarker.id);
                    return (
                      <div
                        key={biomarker.id}
                        className="flex items-start gap-2 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              {biomarker.name}
                            </Label>
                            {currentValue && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeValue(biomarker.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {biomarker.code} • Норма:{" "}
                            {biomarker.normal_min && biomarker.normal_max
                              ? `${biomarker.normal_min} - ${biomarker.normal_max} ${biomarker.unit}`
                              : "не указана"}
                          </p>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Значение"
                              value={currentValue?.value || ""}
                              onChange={(e) =>
                                updateValue(
                                  biomarker.id,
                                  e.target.value,
                                  currentValue?.unitOverride
                                )
                              }
                              className="flex-1"
                            />
                            <Input
                              type="text"
                              placeholder={biomarker.unit}
                              value={currentValue?.unitOverride || ""}
                              onChange={(e) =>
                                updateValue(
                                  biomarker.id,
                                  currentValue?.value || "",
                                  e.target.value
                                )
                              }
                              className="w-24"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
