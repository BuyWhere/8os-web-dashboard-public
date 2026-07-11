// src/app/api/generate/route.ts
/**
 * POST /api/generate
 *
 * Forward onboarding data to the os-generator service and return the OS config.
 *
 * Expected request body:
 *   birth_date: "YYYY-MM-DD"
 *   quiz_answers: q01-q15 as ints 1-10
 *   name: "User Name"
 *   goals: string[] (optional)
 *   domains: string[] (optional)
 *
 * The os-generator returns: schema_version, user, buckets, tone,
 * workflow_description, energy_hours, generated_at
 *
 * Environment variables:
 *   OS_GENERATOR_URL — base URL of the os-generator Railway service, e.g.
 *     "http://os-generator.railway.internal:8001"
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validate incoming payload
const schema = z.object({
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "birth_date must be YYYY-MM-DD"),
  quiz_answers: z.any(), // let os‑generator validate further
  name: z.string().optional().default("8os User"),
  goals: z.array(z.string()).optional().default([]),
  domains: z.array(z.string()).optional().default([]),
});

export async function POST(req: NextRequest) {
  // Parse JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { birth_date, quiz_answers, name, goals, domains } = parsed.data;

  // Build request for os‑generator service
  const osGenUrl = process.env.OS_GENERATOR_URL ?? "http://os-generator.railway.internal:8001";
  const target = `${osGenUrl}/generate`;

  try {
    const resp = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        birth_date,
        quiz: quiz_answers,
        goals,
        domains,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return NextResponse.json({ error: err.detail ?? err.error ?? "os‑generator request failed" }, { status: resp.status });
    }

    const data = await resp.json();
    // Forward the OS config back to the client
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
