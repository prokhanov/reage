import { Badge } from "@/components/ui/badge";

interface AnalysisStatusBadgeProps {
  status: "on_review" | "processed";
  className?: string;
}

export function AnalysisStatusBadge({ status, className }: AnalysisStatusBadgeProps) {
  return (
    <Badge
      variant={status === "processed" ? "default" : "secondary"}
      className={className}
    >
      {status === "processed" ? "Подтвержден" : "На проверке"}
    </Badge>
  );
}
