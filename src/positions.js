// positions.js — Read on-chain Kamino positions for a given wallet (mainnet, read-only)
"use strict";

const { createSolanaRpc, address } = require("@solana/kit");
const { KaminoMarket } = require("@kamino-finance/klend-sdk");

// Primary mainnet lending market — same one yield.js queries via REST
const MAIN_MARKET = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";

// Solana mainnet slot duration; klend-sdk uses this to age-weight refreshed stats.
const RECENT_SLOT_DURATION_MS = 450;

// Market load is heavy (fetches all reserves + oracles). Cache for 5 minutes.
const MARKET_TTL_MS = 5 * 60 * 1000;

let _market = null;
let _marketLoadedAt = 0;
let _marketInflight = null;

function getMainnetRpc() {
  const url = process.env.SOLANA_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com";
  return createSolanaRpc(url);
}

async function getMarket() {
  const now = Date.now();
  if (_market && now - _marketLoadedAt < MARKET_TTL_MS) return _market;
  if (_marketInflight) return _marketInflight;

  _marketInflight = (async () => {
    const market = await KaminoMarket.load(
      getMainnetRpc(),
      address(MAIN_MARKET),
      RECENT_SLOT_DURATION_MS,
      undefined, // default Klend program id
      true       // load reserves alongside the market
    );
    if (!market) throw new Error("Kamino main market not found");
    _market = market;
    _marketLoadedAt = Date.now();
    return market;
  })();

  try {
    return await _marketInflight;
  } finally {
    _marketInflight = null;
  }
}

/**
 * Fetch all Kamino deposit positions for a wallet on the main lending market.
 *
 * Returns: {
 *   positions: [{ asset, amountToken, amountUsd, mint, reserve }],
 *   totalUsd,
 *   fetchedAt
 * }
 *
 * Empty `positions` array means the wallet has no Kamino deposits (or only borrows).
 */
async function getKaminoPositions(walletAddress) {
  const market = await getMarket();
  const owner = address(walletAddress);

  const obligations = await market.getAllUserObligations(owner);

  const positions = [];
  for (const obligation of obligations) {
    if (!obligation) continue;
    for (const dep of obligation.getDeposits()) {
      const reserve = market.reserves.get(dep.reserveAddress);
      const symbol = reserve ? reserve.getTokenSymbol() : "?";

      // amount is in lamports including decimals; mintFactor = 10^decimals
      const amountToken = dep.mintFactor.gt(0)
        ? dep.amount.div(dep.mintFactor).toNumber()
        : 0;
      const amountUsd = dep.marketValueRefreshed.toNumber();

      // Skip dust positions (< $0.01) so the UI doesn't show closed-but-unswept entries
      if (amountUsd < 0.01) continue;

      positions.push({
        asset: symbol,
        amountToken: parseFloat(amountToken.toFixed(6)),
        amountUsd: parseFloat(amountUsd.toFixed(2)),
        mint: String(dep.mintAddress),
        reserve: String(dep.reserveAddress),
      });
    }
  }

  const totalUsd = positions.reduce((s, p) => s + p.amountUsd, 0);

  return {
    positions,
    totalUsd: parseFloat(totalUsd.toFixed(2)),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { getKaminoPositions };
