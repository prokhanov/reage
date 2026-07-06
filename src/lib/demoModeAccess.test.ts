import { describe, expect, it } from "vitest";
import { resolveDemoModeAccess } from "./demoModeAccess";

describe("resolveDemoModeAccess", () => {
  it("allows a patient to use demo mode on their own account", () => {
    expect(resolveDemoModeAccess(["patient"], false)).toMatchObject({
      allowed: true,
      shouldClearOwnDemoFlag: false,
    });
  });

  it("forbids demo mode on an admin's own account and marks stale flag for clearing", () => {
    expect(resolveDemoModeAccess(["admin"], false)).toMatchObject({
      allowed: false,
      shouldClearOwnDemoFlag: true,
      reason: "own-staff-account",
    });
  });

  it("forbids demo mode on a doctor/superadmin own account even if staff also has patient role", () => {
    expect(resolveDemoModeAccess(["doctor", "patient"], false)).toMatchObject({
      allowed: false,
      shouldClearOwnDemoFlag: true,
    });
    expect(resolveDemoModeAccess(["superadmin", "patient"], false)).toMatchObject({
      allowed: false,
      shouldClearOwnDemoFlag: true,
    });
  });

  it("allows an admin in view-as mode to use demo mode for the viewed patient", () => {
    expect(resolveDemoModeAccess(["patient"], true)).toMatchObject({
      allowed: true,
      shouldClearOwnDemoFlag: false,
    });
  });

  it("does not clear flags while viewing another non-patient profile", () => {
    expect(resolveDemoModeAccess(["doctor"], true)).toMatchObject({
      allowed: false,
      shouldClearOwnDemoFlag: false,
      reason: "viewed-user-not-patient",
    });
  });
});