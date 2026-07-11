#!/usr/bin/env node
/**
 * OS-905 — Product Hunt launch-day monitor.
 *
 * Run by the on-duty agent starting at 12:01am PT on July 14, 2026.
 * Polls PH every 5 minutes and prints a one-line summary:
 *   <HH:MM PT> | rank=<#> | upvotes=<n> | comments=<n> | signups=<n> | <delta vs last poll>
 *
 * Also writes a JSON snapshot per poll to ./e2e/screenshots/os-905/launch-metrics.jsonl
 * so we have a full timeline after the fact.
 *
 * Exits cleanly on SIGINT / SIGTERM and prints the final tally.
 *
 * Requirements:
 *   - PH_API_TOKEN env (developer token from producthunt.com/me/api)
 *   - PH_POST_SLUG env (the public slug once submitted, e.g. "8os-1")
 *   - WAITLIST_BASE_URL env (the 8os.ai orchestrator base, e.g. "https://api.8os.ai")
 *
 * Usage:
 *   PH_API_TOKEN=... PH_POST_SLUG=8os-1 WAITLIST_BASE_URL=https://api.8os.ai \
 *     node scripts/ph-launch-monitor.mjs --interval 300
 *
 * Flags:
 *   --interval <sec>   poll interval (default 300 = 5 min)
 *   --max-runtime <h>  hard stop, default 12h (covers 12:01am PT → noon PT)
 *   --quiet            suppress per-poll output, still writes JSONL
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = parseArgs(process.argv.slice(2));
const INTERVAL_SEC = Number(args.interval ?? 300);
const MAX_RUNTIME_H = Number(args['max-runtime'] ?? 12);
const QUIET = Boolean(args.quiet);

const PH_API = 'https://api.producthunt.com/v2/api/graphql';
const OUT_DIR = path.resolve('e2e', 'screenshots', 'os-905');
const JSONL = path.join(OUT_DIR, 'launch-metrics.jsonl');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function nowPT() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

async function fetchPHPost(slug, token) {
  const query = `{
    post(slug: "${slug}") {
      id
      name
      votesCount
      commentsCount
      ranking
      featuredAt
      createdAt
      url
    }
  }`;
  const res = await fetch(PH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`PH API HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`PH API errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data?.post ?? null;
}

async function fetchWaitlistTotal(baseUrl) {
  // Hits our own /waitlist endpoint which we already use in OS-336.
  // We expect { total: number } or { count: number } — fall back to length.
  const res = await fetch(`${baseUrl}/api/v1/waitlist/count`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    return null;
  }
  const json = await res.json();
  return json.total ?? json.count ?? null;
}

function fmtDelta(prev, curr) {
  if (prev == null) return '';
  const d = (curr ?? 0) - (prev ?? 0);
  if (d === 0) return '(±0)';
  return `(${d > 0 ? '+' : ''}${d})`;
}

async function poll(prev) {
  const slug = process.env.PH_POST_SLUG;
  const token = process.env.PH_API_TOKEN;
  const base = process.env.WAITLIST_BASE_URL;
  if (!slug || !token) {
    throw new Error('PH_POST_SLUG and PH_API_TOKEN env vars are required');
  }

  const post = await fetchPHPost(slug, token);
  const waitlist = base ? await fetchWaitlistTotal(base) : null;

  const snapshot = {
    ts: new Date().toISOString(),
    tsPT: nowPT(),
    rank: post?.ranking ?? null,
    upvotes: post?.votesCount ?? 0,
    comments: post?.commentsCount ?? 0,
    waitlist: waitlist,
    phUrl: post?.url ?? null,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.appendFileSync(JSONL, JSON.stringify(snapshot) + '\n');

  if (!QUIET) {
    const line =
      `${snapshot.tsPT} | ` +
      `rank=${snapshot.rank ?? '?'} | ` +
      `up=${snapshot.upvotes}${fmtDelta(prev?.upvotes, snapshot.upvotes)} | ` +
      `cmt=${snapshot.comments}${fmtDelta(prev?.comments, snapshot.comments)} | ` +
      `wl=${snapshot.waitlist ?? '?'}${fmtDelta(prev?.waitlist, snapshot.waitlist)}`;
    console.log(line);
  }

  return snapshot;
}

async function main() {
  const start = Date.now();
  const deadline = start + MAX_RUNTIME_H * 3600 * 1000;
  let prev = null;
  let stop = false;

  process.on('SIGINT', () => {
    stop = true;
    console.error('\nSIGINT — finishing current poll and exiting.');
  });
  process.on('SIGTERM', () => {
    stop = true;
    console.error('\nSIGTERM — finishing current poll and exiting.');
  });

  console.error(`OS-905 launch monitor starting (interval=${INTERVAL_SEC}s, max=${MAX_RUNTIME_H}h)`);
  console.error(`Writing to ${JSONL}`);

  while (!stop && Date.now() < deadline) {
    try {
      prev = await poll(prev);
    } catch (err) {
      console.error(`[${nowPT()}] poll error: ${err.message}`);
    }
    if (stop || Date.now() >= deadline) break;
    await new Promise((r) => setTimeout(r, INTERVAL_SEC * 1000));
  }

  console.error(`Monitor done. Final: up=${prev?.upvotes} cmt=${prev?.comments} wl=${prev?.waitlist}`);
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
