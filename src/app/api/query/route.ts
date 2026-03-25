import { NextResponse } from "next/server";
import { z } from "zod";

import { runNaturalLanguageQuery } from "@/lib/query/service";

export const dynamic = "force-dynamic";

const queryBodySchema = z.object({
  message: z.string().min(1),
  focusNodeIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = queryBodySchema.parse(await request.json());
    const result = await runNaturalLanguageQuery(payload.message, payload.focusNodeIds ?? []);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unexpected query error.";
    return NextResponse.json(
      {
        answer: "The query could not be completed safely.",
        sql: null,
        rowsPreview: [],
        relatedNodeIds: [],
        refusal: message,
        diagnostics: { mode: "error" },
      },
      { status: 500 },
    );
  }
}
