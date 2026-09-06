import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { LabMapItem } from "@/components/admin/LabLocationsMap";

const LabLocationsMap = lazy(() => import("@/components/admin/LabLocationsMap"));

export function EnergyWhereToTest() {
  const [items, setItems] = useState<LabMapItem[]>([]);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("lab_locations")
        .select("id,title,metro,city,address_short,full_address,phones,hours,page_url,lat,lng")
        .eq("is_active", true)
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (cancelled) return;
      setItems((data ?? []) as unknown as LabMapItem[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.title, i.metro, i.city, i.address_short, i.full_address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, query]);

  const visible = showAll ? filtered : filtered.slice(0, 3);

  return (
    <section className="border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-12 md:px-6 md:py-16">
        <h2 className="font-display text-2xl text-foreground md:text-3xl">Где сдавать анализы</h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Выберите удобное отделение — записываться заранее не нужно.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Адрес или метро"
                className="pl-9"
                aria-label="Поиск отделения по адресу или метро"
              />
            </div>

            <ul className="mt-4 space-y-3">
              {visible.map((loc) => (
                <li
                  key={loc.id}
                  className="flex items-start justify-between gap-4 rounded-xl border hairline bg-card p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{loc.title}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">
                        {loc.metro ? `м. ${loc.metro} · ` : ""}
                        {loc.address_short || loc.full_address}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={selectedId === loc.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedId(loc.id)}
                  >
                    {selectedId === loc.id ? "Выбрано" : "Выбрать"}
                  </Button>
                </li>
              ))}
              {visible.length === 0 && (
                <li className="rounded-xl border hairline bg-card p-4 text-sm text-muted-foreground">
                  Ничего не нашлось — попробуйте другой запрос.
                </li>
              )}
            </ul>

            {filtered.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-4 text-sm font-medium text-primary hover:underline"
              >
                {showAll ? "Свернуть список" : `Показать все адреса (${filtered.length})`}
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border hairline bg-card">
            <Suspense fallback={<div className="h-[420px] w-full bg-muted/40" />}>
              <LabLocationsMap
                items={filtered}
                height={420}
                fitToItems
                hideControls
                clusterMarkers
                showSelectButton
                selectedId={selectedId ?? undefined}
                onSelect={(id: string) => setSelectedId(id)}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
