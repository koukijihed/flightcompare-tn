import "server-only";
import { cookies } from "next/headers";
import { PRIMARY_CURRENCY, isCurrencyCode, type CurrencyCode } from "./constants";

export const CURRENCY_COOKIE = "fc_currency";

export async function getDisplayCurrency(): Promise<CurrencyCode> {
  const store = await cookies();
  const value = store.get(CURRENCY_COOKIE)?.value;
  return isCurrencyCode(value) ? value : PRIMARY_CURRENCY;
}
