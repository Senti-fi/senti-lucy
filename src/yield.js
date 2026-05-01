// yield.js — Kamino REST API integration for live lending APY rates
"use strict";

// Kamino public REST API — no auth required, no SDK needed
// Docs: https://kamino.com/docs/build/api-reference/introduction
const KAMINO_API  = "https://api.kamino.finance";
const MAIN_MARKET = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF"; // primary mainnet market

// 30-second in-memory cache
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 30_000;

/**
 * Fetch live supply APY rates for USDC and USDT from Kamino's REST API.
 *
 * Endpoint: GET /kamino-market/{lendingMarket}/reserves/metrics
 * Returns:  { kamino_usdc_apy, kamino_usdt_apy, usdc_tvl_usd, usdt_tvl_usd, fetched_at }
 *
 * APY values are percentages (e.g. 5.43 for 5.43%).
 * Throws on network / parse failure so callers can apply their own fallback.
 */
async function fetchKaminoRates() {
  const now = Date.now();
  if (_cache && now - _cacheTs < CACHE_TTL_MS) {
    return { ..._cache, cached: true };
  }

  const url = `${KAMINO_API}/kamino-market/${MAIN_MARKET}/reserves/metrics`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "senti-lucy/1.0", "Accept": "application/json" },
  });

  if (!resp.ok) {
    throw new Error(`Kamino API returned ${resp.status} for ${url}`);
  }

  const reserves = await resp.json();

  // Find USDC and USDT entries (liquidityToken field is the symbol string)
  const usdc = reserves.find(r => /^usdc$/i.test(r.liquidityToken));
  const usdt = reserves.find(r => /^usdt$/i.test(r.liquidityToken));

  if (!usdc || !usdt) {
    throw new Error(
      `USDC or USDT not found in Kamino market reserves (got ${reserves.length} entries)`
    );
  }

  // supplyApy is a decimal fraction — convert to percentage, round to 4dp
  const usdcApy = parseFloat((parseFloat(usdc.supplyApy) * 100).toFixed(4));
  const usdtApy = parseFloat((parseFloat(usdt.supplyApy) * 100).toFixed(4));

  _cache = {
    kamino_usdc_apy: usdcApy,
    kamino_usdt_apy: usdtApy,
    usdc_tvl_usd:    parseFloat(parseFloat(usdc.totalSupplyUsd).toFixed(2)),
    usdt_tvl_usd:    parseFloat(parseFloat(usdt.totalSupplyUsd).toFixed(2)),
    fetched_at:      new Date().toISOString(),
  };
  _cacheTs = now;

  return { ..._cache, cached: false };
}

module.exports = { fetchKaminoRates };
