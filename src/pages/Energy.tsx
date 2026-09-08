import { CheckupPage } from "@/pages/Checkup";
import { ENERGY_CHECKUP } from "@/data/checkups";

export default function Energy() {
  return <CheckupPage checkup={ENERGY_CHECKUP} />;
}
