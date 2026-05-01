// server.js — Express API entry point
require("dotenv").config();

const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const { parseIntent } = require("./lucy");
const { executeIntent } = require("./executor");
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");

const { fetchKaminoRates } = require("./yield");
const { getKaminoPositions } = require("./positions");
const { listPlansByWallet, savePlan, deletePlan } = require("./plans");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fallback rates — used when the Kamino REST API is unreachable.
// Values approximate real mainnet rates; marked fallback:true so the UI can indicate staleness.
const FALLBACK_RATES = {
  kamino_usdc_apy: 5.43,
  kamino_usdt_apy: 4.57,
  usdc_tvl_usd:    168_000_000,
  usdt_tvl_usd:      7_600_000,
};

const path = require("path");

const app = express();
const PORT = 3001;

const SOL_TO_USD = 20; // devnet peg

function getConnection() {
  return new Connection(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed"
  );
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// GET /api/health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", engine: "Lucy v0.1" });
});

// GET /api/balance/:address
app.get("/api/balance/:address", async (req, res) => {
  try {
    const connection = getConnection();
    const pubkey = new PublicKey(req.params.address);
    const lamports = await connection.getBalance(pubkey);
    const sol = lamports / LAMPORTS_PER_SOL;
    res.json({
      address: req.params.address,
      sol,
      lamports,
      usd: sol * SOL_TO_USD,
    });
  } catch (err) {
    console.error("[/api/balance] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/:address
app.get("/api/transactions/:address", async (req, res) => {
  try {
    const connection = getConnection();
    const pubkey = new PublicKey(req.params.address);
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 10 });
    res.json({ address: req.params.address, transactions: signatures });
  } catch (err) {
    console.error("[/api/transactions] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/airdrop/:address  — devnet only, 2 SOL
// Returns the signature immediately; confirmation happens in the background.
app.post("/api/airdrop/:address", async (req, res) => {
  try {
    const connection = getConnection();
    const pubkey = new PublicKey(req.params.address);
    const sig = await connection.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL);
    // Respond right away — don't block on confirmation
    res.json({ signature: sig, status: "pending" });
    // Confirm in background (just for server-side logging)
    connection.confirmTransaction(sig)
      .then(() => console.log(`[airdrop] confirmed: ${sig.slice(0, 12)}...`))
      .catch(err => console.error("[airdrop confirm]", err.message));
  } catch (err) {
    console.error("[/api/airdrop] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/yield/positions/:address — read-only Kamino deposits for a wallet (mainnet)
app.get("/api/yield/positions/:address", async (req, res) => {
  try {
    const result = await getKaminoPositions(req.params.address);
    res.json(result);
  } catch (err) {
    console.error("[/api/yield/positions] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/yield/rates
app.get("/api/yield/rates", async (req, res) => {
  try {
    const rates = await fetchKaminoRates();
    res.json(rates);
  } catch (err) {
    console.warn("[/api/yield/rates] Live fetch failed, returning fallback:", err.message);
    res.json({
      ...FALLBACK_RATES,
      fetched_at: new Date().toISOString(),
      fallback: true,
    });
  }
});

// POST /api/yield/recommend
app.post("/api/yield/recommend", async (req, res) => {
  const { balance, risk = "low" } = req.body;

  if (balance === undefined || balance === null) {
    return res.status(400).json({ error: "Missing required field: balance" });
  }

  // Fetch live rates (or fallback) to give Claude accurate context
  let rates;
  try {
    rates = await fetchKaminoRates();
  } catch {
    rates = { ...FALLBACK_RATES, fetched_at: new Date().toISOString(), fallback: true };
  }

  const ratesContext = `Current Kamino supply APY rates:
- USDC: ${rates.kamino_usdc_apy}% APY
- USDT: ${rates.kamino_usdt_apy}% APY`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are Lucy, a DeFi yield optimiser for the Solana ecosystem.
Given a user's idle balance and risk preference, recommend the best Kamino lending allocation.
Return ONLY valid JSON — no markdown, no code fences, no explanation.

The JSON must have exactly these fields:
{
  "recommended_protocol": "Kamino",
  "recommended_asset": "<USDC or USDT>",
  "allocation_amount": <number, USD — the full balance unless risk calls for partial>,
  "projected_annual_yield": <number, USD — allocation_amount * apy / 100>,
  "reasoning": "<2-3 friendly sentences explaining why this asset, what the expected return is, and any risk note>"
}

Rules:
- low risk: prefer USDC (dollar-denominated, largest TVL).
- medium risk: pick whichever has higher APY.
- allocation_amount should be the full balance for low risk, 80% for medium.
- projected_annual_yield must be mathematically derived from the chosen APY and allocation_amount.
- reasoning must reference the actual APY number and the balance.`,
      messages: [
        {
          role: "user",
          content: `${ratesContext}\n\nUser balance: $${balance}\nRisk preference: ${risk}`,
        },
      ],
    });

    const text = (message.content.find(b => b.type === "text")?.text ?? "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in model response");
    const recommendation = JSON.parse(match[0]);
    // Attach the live rates so the frontend can display them
    recommendation.rates = rates;
    res.json(recommendation);
  } catch (err) {
    console.error("[/api/yield/recommend] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vault/plan
app.post("/api/vault/plan", async (req, res) => {
  const { goal, wallet } = req.body;

  if (!goal) {
    return res.status(400).json({ error: "Missing required field: goal" });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are Lucy, a DeFi savings planner for the Solana ecosystem.
Given a savings goal in plain English, extract a structured plan and return ONLY valid JSON — no markdown, no code fences, no explanation.

The JSON must have exactly these fields:
{
  "target_amount": <number, USD>,
  "duration_weeks": <number>,
  "weekly_deposit": <number, USD rounded to 2 decimal places>,
  "protocol": "Kamino",
  "expected_yield": "<string, e.g. '4.2% APY'>",
  "summary": "<string, 1-2 friendly actionable sentences explaining the plan>"
}

Rules:
- If the goal mentions a total amount and a time period, derive weekly_deposit = target_amount / duration_weeks.
- If only a weekly amount is given, derive duration_weeks from context or default to 12.
- If an emergency fund is mentioned, assume 6 months of expenses if no amount given; otherwise use the stated amount.
- Always use Kamino as the protocol.
- expected_yield should be a realistic DeFi stablecoin yield (3–6% APY range).
- summary should reference the user's goal naturally.`,
      messages: [{ role: "user", content: goal }],
    });

    const text = (message.content.find(b => b.type === "text")?.text ?? "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in model response");
    const plan = JSON.parse(match[0]);
    res.json(plan);
  } catch (err) {
    console.error("[/api/vault/plan] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vault/plans/:wallet — list activated plans for a wallet
app.get("/api/vault/plans/:wallet", async (req, res) => {
  try {
    const plans = await listPlansByWallet(req.params.wallet);
    res.json({ plans });
  } catch (err) {
    console.error("[/api/vault/plans GET] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vault/plans — persist an activated plan
app.post("/api/vault/plans", async (req, res) => {
  const p = req.body || {};
  if (!p.walletAddress) return res.status(400).json({ error: "Missing walletAddress" });
  if (!Number.isFinite(Number(p.target_amount)) ||
      !Number.isFinite(Number(p.duration_weeks)) ||
      !Number.isFinite(Number(p.weekly_deposit))) {
    return res.status(400).json({ error: "target_amount, duration_weeks, and weekly_deposit must be numeric" });
  }
  try {
    const saved = await savePlan(p);
    res.json(saved);
  } catch (err) {
    console.error("[/api/vault/plans POST] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vault/plans/:id — cancel/remove a plan
app.delete("/api/vault/plans/:id", async (req, res) => {
  try {
    const ok = await deletePlan(req.params.id);
    if (!ok) return res.status(404).json({ error: "Plan not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[/api/vault/plans DELETE] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/intent
app.post("/api/intent", async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: "Missing required field: input" });
  }

  try {
    const intent = await parseIntent(input);
    res.json(intent);
  } catch (err) {
    console.error("[/api/intent] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/execute
app.post("/api/execute", async (req, res) => {
  const { input, wallet } = req.body;

  if (!input || !wallet) {
    return res.status(400).json({ error: "Missing required fields: input, wallet" });
  }

  let intent;
  try {
    intent = await parseIntent(input);
  } catch (err) {
    console.error("[/api/execute] Parse error:", err.message);
    return res.status(500).json({ error: err.message });
  }

  // Fire-and-forget — monitor runs in background, logs when condition is met
  executeIntent(input, wallet).catch((err) => {
    console.error("[/api/execute] Executor error:", err.message);
  });

  res.json({ status: "monitoring", intent });
});

app.listen(PORT, () => {
  console.log(`Senti Lucy engine running on port ${PORT}`);
});
