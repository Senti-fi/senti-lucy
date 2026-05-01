// plans.js — File-based persistence for activated savings plans.
// Hackathon-grade: single-writer, no concurrency, no auth. Atomic writes via tmp+rename.
"use strict";

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR  = path.join(__dirname, "..", "data");
const PLANS_FILE = path.join(DATA_DIR, "plans.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PLANS_FILE);
  } catch {
    await fs.writeFile(PLANS_FILE, JSON.stringify({ plans: [] }, null, 2), "utf8");
  }
}

async function readAll() {
  await ensureFile();
  const raw = await fs.readFile(PLANS_FILE, "utf8");
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data.plans) ? data.plans : [];
  } catch {
    // Corrupt file — start fresh rather than crash the server
    return [];
  }
}

async function writeAll(plans) {
  await ensureFile();
  const tmp = PLANS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify({ plans }, null, 2), "utf8");
  await fs.rename(tmp, PLANS_FILE);
}

function nowIso() { return new Date().toISOString(); }

async function listPlansByWallet(walletAddress) {
  const all = await readAll();
  return all.filter(p => p.walletAddress === walletAddress);
}

async function savePlan(input) {
  const all = await readAll();
  const plan = {
    id: crypto.randomUUID(),
    walletAddress: input.walletAddress,
    goal: input.goal || "",
    asset: input.asset || "USDC",
    source: input.source || "wallet",
    target_amount: Number(input.target_amount),
    duration_weeks: Number(input.duration_weeks),
    weekly_deposit: Number(input.weekly_deposit),
    expected_yield: input.expected_yield || "",
    summary: input.summary || "",
    created_at: nowIso(),
    status: "active",
  };
  all.push(plan);
  await writeAll(all);
  return plan;
}

async function deletePlan(id) {
  const all = await readAll();
  const next = all.filter(p => p.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

module.exports = { listPlansByWallet, savePlan, deletePlan };
