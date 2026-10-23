import { createContext, useContext } from "react";
import { useSiteData } from "@/components/site/text";
import { modelPlan, type PhaseLot, type Plan } from "@/data/site";

/**
 * The plan / lot a detail page is about. /plans/$slug and /lots/$slug provide
 * it; in the editor (no route) the templates show a sample record instead.
 */
export const DetailContext = createContext<{ plan?: Plan; lot?: PhaseLot }>({});

export function useDetailPlan(): Plan | undefined {
  const { plan } = useContext(DetailContext);
  const { plans } = useSiteData();
  return plan ?? modelPlan(plans) ?? plans[0];
}

export function useDetailLot(): PhaseLot | undefined {
  const { lot } = useContext(DetailContext);
  const { lots } = useSiteData();
  return lot ?? lots[0];
}
