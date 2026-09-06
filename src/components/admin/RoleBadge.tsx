import { StatusBadge } from "@/components/admin/StatusBadge";
import { getRoleLabel, getRoleTone } from "@/lib/statusTone";

/** Единый бейдж роли пользователя для всего проекта. */
export function RoleBadge({ role, size = "sm" }: { role: string | null | undefined; size?: "sm" | "md" }) {
  return <StatusBadge status={role} tone={getRoleTone(role)} label={getRoleLabel(role)} size={size} dot={false} />;
}
