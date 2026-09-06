import { StatusBadge } from "@/components/admin/StatusBadge";
import { getRoleLabel, getRoleTone } from "@/lib/statusTone";

/** Единый бейдж роли пользователя для всего проекта. */
export function RoleBadge({
  role,
  displayName,
  size = "sm",
}: {
  role: string | null | undefined;
  /** Подпись кастомной роли из БД, если она есть. */
  displayName?: string | null;
  size?: "sm" | "md";
}) {
  return (
    <StatusBadge
      status={role}
      tone={getRoleTone(role)}
      label={displayName || getRoleLabel(role)}
      size={size}
      dot={false}
    />
  );
}
