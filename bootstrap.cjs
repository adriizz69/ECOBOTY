/**
 * Plesk Passenger entry (some panels default to bootstrap.cjs).
 * Delegates to the unified EcoBoty server (Express + bot + SPA).
 */
import("./server.js").catch((error) => {
  console.error("[bootstrap] failed to start EcoBoty:", error?.message || error);
  process.exit(1);
});
