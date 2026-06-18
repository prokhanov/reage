import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface BiomarkerSelectorProps {
  selectedBiomarkers: string[];
  onChange: (biomarkers: string[]) => void;
}

interface Biomarker {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface Category {
  name: string;
  emoji: string;
}

export function BiomarkerSelector({ selectedBiomarkers, onChange }: BiomarkerSelectorProps) {
  const [search, setSearch] = useState("");

  // Загрузка категорий
  const { data: categories } = useQuery({
    queryKey: ['biomarker-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('biomarker_categories')
        .select('name, emoji')
        .order('display_order');
      if (error) throw error;
      return data as Category[];
    },
  });

  // Загрузка биомаркеров
  const { data: biomarkers, isLoading } = useQuery({
    queryKey: ['biomarkers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('biomarkers')
        .select('id, name, code, category')
        .order('display_order');
      if (error) throw error;
      return data as Biomarker[];
    },
  });

  // Группировка биомаркеров по категориям
  const groupedBiomarkers = useMemo(() => {
    if (!biomarkers || !categories) return {};
    
    const filtered = search
      ? biomarkers.filter(b => 
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.code.toLowerCase().includes(search.toLowerCase())
        )
      : biomarkers;

    return filtered.reduce((acc, biomarker) => {
      if (!acc[biomarker.category]) {
        acc[biomarker.category] = [];
      }
      acc[biomarker.category].push(biomarker);
      return acc;
    }, {} as Record<string, Biomarker[]>);
  }, [biomarkers, categories, search]);

  const handleToggleBiomarker = (biomarkerId: string) => {
    if (selectedBiomarkers.includes(biomarkerId)) {
      onChange(selectedBiomarkers.filter(id => id !== biomarkerId));
    } else {
      onChange([...selectedBiomarkers, biomarkerId]);
    }
  };

  const handleToggleCategory = (categoryName: string) => {
    const categoryBiomarkers = groupedBiomarkers[categoryName] || [];
    const categoryIds = categoryBiomarkers.map(b => b.id);
    const allSelected = categoryIds.every(id => selectedBiomarkers.includes(id));

    if (allSelected) {
      onChange(selectedBiomarkers.filter(id => !categoryIds.includes(id)));
    } else {
      const newSelected = [...selectedBiomarkers];
      categoryIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      onChange(newSelected);
    }
  };

  const handleSelectAll = () => {
    if (!biomarkers) return;
    onChange(biomarkers.map(b => b.id));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const totalBiomarkers = biomarkers?.length || 0;

  if (isLoading) {
    return <AdminCenterLoader size="sm" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск биомаркеров..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          Выбрано: {selectedBiomarkers.length} / {totalBiomarkers}
        </Badge>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
            Выбрать все
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDeselectAll}>
            Снять все
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="space-y-6">
          {categories?.map((category) => {
            const categoryBiomarkers = groupedBiomarkers[category.name] || [];
            if (categoryBiomarkers.length === 0) return null;

            const categoryIds = categoryBiomarkers.map(b => b.id);
            const allSelected = categoryIds.every(id => selectedBiomarkers.includes(id));
            const someSelected = categoryIds.some(id => selectedBiomarkers.includes(id));

            return (
              <div key={category.name} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    id={`category-${category.name}`}
                    checked={allSelected}
                    onCheckedChange={() => handleToggleCategory(category.name)}
                    className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                  />
                  <Label
                    htmlFor={`category-${category.name}`}
                    className="font-semibold cursor-pointer flex-1"
                  >
                    {category.emoji} {category.name} ({categoryBiomarkers.length})
                  </Label>
                </div>
                <div className="space-y-2 pl-6">
                  {categoryBiomarkers.map((biomarker) => (
                    <div key={biomarker.id} className="flex items-center gap-2">
                      <Checkbox
                        id={biomarker.id}
                        checked={selectedBiomarkers.includes(biomarker.id)}
                        onCheckedChange={() => handleToggleBiomarker(biomarker.id)}
                      />
                      <Label
                        htmlFor={biomarker.id}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {biomarker.name} ({biomarker.code})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
