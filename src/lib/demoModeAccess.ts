const STAFF_ROLES = new Set(["admin", "superadmin", "doctor"]);

export type DemoModeAccess = {
  allowed: boolean;
  shouldClearOwnDemoFlag: boolean;
  reason: "allowed" | "viewed-user-not-patient" | "own-staff-account" | "own-non-patient-account";
};

export function resolveDemoModeAccess(roles: Array<string | null | undefined>, isViewMode: boolean): DemoModeAccess {
  const normalizedRoles = new Set(
    roles
      .filter((role): role is string => typeof role === "string")
      .map((role) => role.toLowerCase()),
  );

  const hasPatientRole = normalizedRoles.has("patient");
  const hasStaffRole = Array.from(STAFF_ROLES).some((role) => normalizedRoles.has(role));

  if (isViewMode) {
    return {
      allowed: hasPatientRole,
      shouldClearOwnDemoFlag: false,
      reason: hasPatientRole ? "allowed" : "viewed-user-not-patient",
    };
  }

  if (hasStaffRole) {
    return {
      allowed: false,
      shouldClearOwnDemoFlag: true,
      reason: "own-staff-account",
    };
  }

  return {
    allowed: hasPatientRole,
    shouldClearOwnDemoFlag: false,
    reason: hasPatientRole ? "allowed" : "own-non-patient-account",
  };
}