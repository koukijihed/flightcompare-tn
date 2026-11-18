import { config } from "@/lib/config";
import {
  ProviderError,
  type FlightProviderAdapter,
} from "./types";

/**
 * Skyscanner adapter.
 *
 * Skyscanner's Travel APIs are only available to approved commercial partners
 * (https://developers.skyscanner.net/). Without an approved key AND the
 * partner-specific endpoint/agreement there is no public endpoint to call, and
 * this platform never invents one.
 *
 * When access is granted: set SKYSCANNER_API_KEY + SKYSCANNER_BASE_URL, enable
 * the provider in the admin area, and implement the mapping in `search` below
 * following the partner documentation. The adapter contract is already wired
 * into the aggregation pipeline, so no other code changes are required.
 */
export const skyscannerProvider: FlightProviderAdapter = {
  name: "Skyscanner",
  type: "skyscanner",

  isConfigured() {
    return config.skyscanner.configured;
  },

  async search() {
    if (!config.skyscanner.configured) {
      throw new ProviderError(
        "Skyscanner nécessite un accès partenaire approuvé. Aucun appel n'est effectué sans autorisation.",
        "NOT_CONFIGURED",
      );
    }

    throw new ProviderError(
      "Accès Skyscanner configuré, mais le point de terminaison partenaire doit être renseigné dans l'adaptateur conformément à votre contrat. Aucun résultat n'est simulé.",
      "ENDPOINT_NOT_IMPLEMENTED",
    );
  },
};
