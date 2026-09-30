import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { fetchPartnerOffer, setRefCode } from "@/lib/partnerRef";

/** /r/КОД — запоминаем код (если клиент ещё ни за кем не закреплён) и ведём на главную. */
export default function RefRedirect() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const clean = code.trim().toUpperCase();
      if (clean) {
        const current = await fetchPartnerOffer(null);
        // Уже закреплён за партнёром — чужая ссылка ничего не меняет.
        if (!current || current.source !== "bound") {
          const offer = await fetchPartnerOffer(clean);
          if (offer) setRefCode(clean);
        }
      }
      if (!cancelled) {
        qc.invalidateQueries({ queryKey: ["partner-offer"] });
        navigate("/", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, navigate, qc]);

  return null;
}
