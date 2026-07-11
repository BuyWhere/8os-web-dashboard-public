/**
 * Idempotent Stripe test-mode setup for 8os billing.
 *
 *  - Ensures Products "8os Pro" and "8os Full BaZi Life Report" exist.
 *  - Ensures Prices with stable lookup_keys: pro_monthly ($16/mo),
 *    pro_yearly ($119/yr), life_report ($59 one-time).
 *  - Registers a webhook endpoint at https://8os.ai/api/stripe/webhook and
 *    writes the returned signing secret into Railway env (STRIPE_WEBHOOK_SECRET).
 *
 * Idempotency: looked up by lookup_key (prices) and metadata key8os (products);
 * the webhook is matched by URL. Safe to re-run.
 *
 * Reads STRIPE_SECRET_KEY from Railway env (same GraphQL path the QA probes use).
 * Run on the droplet as paperclip:  node scripts/stripe-setup.js
 */
const https = require('https')
const fs = require('fs')

const PROJECT = '27eb0f95-dfa8-450e-b504-4a4519a0dac6'
const ENVIRONMENT = 'd61c48b2-338d-460f-a925-fd198dfe7838'
const SERVICE = '6d72a7e5-2124-4326-a0b4-a5ca68d9469a'
const WEBHOOK_URL = 'https://8os.ai/api/stripe/webhook'
const ENABLED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]

function req(method, url, headers, body) {
  return new Promise((res, rej) => {
    const U = new URL(url)
    const d = body ? Buffer.from(body) : null
    const hh = Object.assign({}, headers)
    if (d) hh['Content-Length'] = d.length
    const r = https.request(
      { method, hostname: U.hostname, path: U.pathname + U.search, headers: hh },
      (x) => {
        let s = ''
        x.on('data', (c) => (s += c))
        x.on('end', () => res({ status: x.statusCode, body: s }))
      },
    )
    r.on('error', rej)
    if (d) r.write(d)
    r.end()
  })
}

function form(obj) {
  // Stripe-style application/x-www-form-urlencoded with nested brackets.
  const parts = []
  const enc = (k, v) => parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  const walk = (prefix, val) => {
    if (Array.isArray(val)) val.forEach((v, i) => walk(`${prefix}[${i}]`, v))
    else if (val && typeof val === 'object') for (const k of Object.keys(val)) walk(`${prefix}[${k}]`, val[k])
    else enc(prefix, val)
  }
  for (const k of Object.keys(obj)) walk(k, obj[k])
  return parts.join('&')
}

async function railwayVars(pat) {
  const q = JSON.stringify({
    query:
      'query($p:String!,$e:String!,$s:String!){variables(projectId:$p,environmentId:$e,serviceId:$s)}',
    variables: { p: PROJECT, e: ENVIRONMENT, s: SERVICE },
  })
  const rw = await req(
    'POST',
    'https://backboard.railway.com/graphql/v2',
    { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    q,
  )
  return JSON.parse(rw.body).data.variables
}

async function railwaySetVar(pat, name, value) {
  const q = JSON.stringify({
    query:
      'mutation($input:VariableUpsertInput!){variableUpsert(input:$input)}',
    variables: {
      input: { projectId: PROJECT, environmentId: ENVIRONMENT, serviceId: SERVICE, name, value },
    },
  })
  const rw = await req(
    'POST',
    'https://backboard.railway.com/graphql/v2',
    { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    q,
  )
  const j = JSON.parse(rw.body)
  if (j.errors) throw new Error('railway var upsert failed: ' + JSON.stringify(j.errors))
  return j.data
}

async function main() {
  const fleet = JSON.parse(fs.readFileSync('/home/paperclip/.secrets/fleet-secrets.json', 'utf8'))
  const pat = fleet.RAILWAY_8OS_PAT
  const vars = await railwayVars(pat)
  const SK = vars.STRIPE_SECRET_KEY
  if (!SK || !SK.startsWith('sk_test_')) throw new Error('STRIPE_SECRET_KEY missing or not test-mode')
  const S = (method, path, body) =>
    req(method, `https://api.stripe.com${path}`, {
      Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2025-08-27.basil',
    }, body ? form(body) : undefined).then((r) => {
      const j = JSON.parse(r.body)
      if (r.status >= 400) throw new Error(`Stripe ${method} ${path} → ${r.status}: ${j.error && j.error.message}`)
      return j
    })

  // account sanity
  const acct = await S('GET', '/v1/account')
  console.log(`Stripe account: ${acct.id} livemode=${acct.charges_enabled ? 'n/a' : 'n/a'}`)

  // ---- Products (idempotent via metadata key8os) ----
  async function ensureProduct(key8os, name) {
    const search = await S(
      'GET',
      `/v1/products/search?query=${encodeURIComponent(`metadata['key8os']:'${key8os}'`)}`,
    )
    if (search.data && search.data[0]) return search.data[0]
    return S('POST', '/v1/products', { name, metadata: { key8os } })
  }
  const proProduct = await ensureProduct('pro', '8os Pro')
  const reportProduct = await ensureProduct('life_report', '8os Full BaZi Life Report')
  console.log(`Product 8os Pro: ${proProduct.id}`)
  console.log(`Product Life Report: ${reportProduct.id}`)

  // ---- Prices (idempotent via lookup_key) ----
  async function ensurePrice(lookup_key, spec) {
    const found = await S('GET', `/v1/prices?lookup_keys[]=${encodeURIComponent(lookup_key)}&active=true&limit=1`)
    if (found.data && found.data[0]) {
      const p = found.data[0]
      // sanity: amount + interval must match; if not, warn (do not silently mutate).
      const ok = p.unit_amount === spec.unit_amount &&
        ((spec.recurring ? p.recurring && p.recurring.interval === spec.recurring.interval : !p.recurring))
      if (!ok) console.warn(`  WARN price ${lookup_key} exists but mismatched (${p.id}); leaving as-is`)
      return p
    }
    return S('POST', '/v1/prices', { lookup_key, transfer_lookup_key: 'true', currency: 'usd', ...spec })
  }
  const proMonthly = await ensurePrice('pro_monthly', {
    product: proProduct.id,
    unit_amount: 1600,
    recurring: { interval: 'month' },
  })
  const proYearly = await ensurePrice('pro_yearly', {
    product: proProduct.id,
    unit_amount: 11900,
    recurring: { interval: 'year' },
  })
  const lifeReport = await ensurePrice('life_report', {
    product: reportProduct.id,
    unit_amount: 5900,
  })
  console.log(`Price pro_monthly: ${proMonthly.id} (${proMonthly.unit_amount})`)
  console.log(`Price pro_yearly:  ${proYearly.id} (${proYearly.unit_amount})`)
  console.log(`Price life_report: ${lifeReport.id} (${lifeReport.unit_amount})`)

  // ---- Webhook endpoint (idempotent via URL) ----
  const endpoints = await S('GET', '/v1/webhook_endpoints?limit=100')
  let endpoint = (endpoints.data || []).find((e) => e.url === WEBHOOK_URL)
  let secret = vars.STRIPE_WEBHOOK_SECRET || null
  if (!endpoint) {
    endpoint = await S('POST', '/v1/webhook_endpoints', {
      url: WEBHOOK_URL,
      enabled_events: ENABLED_EVENTS,
      description: '8os billing (test)',
    })
    secret = endpoint.secret // only returned on create
    console.log(`Webhook endpoint CREATED: ${endpoint.id}`)
    await railwaySetVar(pat, 'STRIPE_WEBHOOK_SECRET', secret)
    console.log('STRIPE_WEBHOOK_SECRET written to Railway env.')
  } else {
    console.log(`Webhook endpoint exists: ${endpoint.id}`)
    // ensure the enabled events are current
    await S('POST', `/v1/webhook_endpoints/${endpoint.id}`, { enabled_events: ENABLED_EVENTS })
    if (!secret) {
      console.log('  NOTE: secret not in Railway env and cannot be re-read from Stripe.')
      console.log('  To rotate: delete endpoint in Stripe + re-run, or set STRIPE_WEBHOOK_SECRET manually.')
    } else {
      console.log('  STRIPE_WEBHOOK_SECRET already present in Railway env.')
    }
  }

  console.log('\nRESULT_JSON ' + JSON.stringify({
    products: { pro: proProduct.id, life_report: reportProduct.id },
    prices: { pro_monthly: proMonthly.id, pro_yearly: proYearly.id, life_report: lifeReport.id },
    amounts: { pro_monthly: proMonthly.unit_amount, pro_yearly: proYearly.unit_amount, life_report: lifeReport.unit_amount },
    webhook: { id: endpoint.id, url: endpoint.url, secret_set: Boolean(secret) },
  }))
}

main().catch((e) => { console.error('SETUP FAILED:', e.message); process.exit(1) })
