import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export const DemoBadge = () => (
  <Badge variant="outline" className="border-primary/50 text-primary">
    <Sparkles className="h-3 w-3 mr-1" />
    DEMO
  </Badge>
);
