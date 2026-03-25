import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

loadEnvFiles();

async function main() {
  const [{ seedDatabase }, { getDatasetRoot }, { loadNormalizedDataset }] = await Promise.all([
    import("../src/db/seed"),
    import("../src/lib/env"),
    import("../src/lib/o2c/dataset"),
  ]);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run the ingest script.");
  }

  const datasetRoot = getDatasetRoot();
  console.log(`Loading dataset from ${datasetRoot}`);
  const dataset = await loadNormalizedDataset(datasetRoot);
  console.log(`Loaded ${dataset.graphNodes.length} nodes and ${dataset.graphEdges.length} edges.`);
  await seedDatabase(dataset);
  console.log("Database seeded successfully.");
}

main().catch((error) => {
  if (
    error instanceof Error &&
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause &&
    "code" in error.cause &&
    error.cause.code === "42P01"
  ) {
    console.error('Database tables do not exist yet. Run "npm run db:push" first, or use "npm run db:init".');
  }
  console.error(error);
  process.exitCode = 1;
});

function loadEnvFiles() {
  const root = process.cwd();
  const envFiles = [".env.local", ".env"];

  for (const filename of envFiles) {
    const fullPath = path.join(root, filename);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  }
}
