/**
 * Price monitoring CLI.
 *
 * Usage (PowerShell):
 *   npm run monitor:prices
 *
 * Schedule it with Windows Task Scheduler (daily) or a container cron service.
 * It performs ONE pass over enabled alerts and exits.
 */
import "dotenv/config";
import { runPriceMonitoring } from "../src/services/price-monitoring/monitor";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await runPriceMonitoring();
  console.log(
    `[monitor] ${result.ranAt} — checked=${result.checked} notified=${result.notified} skipped=${result.skipped}`,
  );
  if (result.errors.length > 0) {
    console.warn(`[monitor] ${result.errors.length} provider error(s):`);
    for (const error of result.errors) console.warn(`  - ${error}`);
  }
}

main()
  .catch((error) => {
    console.error("[monitor] fatal:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
