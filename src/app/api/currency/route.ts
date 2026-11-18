import { jsonOk } from "@/lib/api";
import { conversionRates } from "@/modules/currency/service";

export async function GET() {
  const snapshot = await conversionRates();
  return jsonOk({
    ...snapshot,
    note: "Taux indicatifs utilisés uniquement pour l'affichage. Le prix payable est celui du fournisseur.",
  });
}
