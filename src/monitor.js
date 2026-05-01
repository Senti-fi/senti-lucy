// monitor.js — on-chain monitoring loop
require("dotenv").config();

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");

const SOL_TO_USD = 20; // hardcoded for devnet demo
const POLL_INTERVAL_MS = 10_000;

function checkCondition(balanceUsd, condition) {
  switch (condition.type) {
    case "balance_above":
      return balanceUsd > condition.value;
    case "balance_below":
      return balanceUsd < condition.value;
    default:
      throw new Error(`Unknown condition type: ${condition.type}`);
  }
}

async function startMonitor(walletAddress, condition, onConditionMet) {
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed"
  );

  const pubkey = new PublicKey(walletAddress);

  const poll = async () => {
    const lamports = await connection.getBalance(pubkey);
    const sol = lamports / LAMPORTS_PER_SOL;
    const usd = sol * SOL_TO_USD;

    console.log(
      `[monitor] Wallet: ${walletAddress.slice(0, 8)}... | ` +
      `Balance: ${sol.toFixed(4)} SOL (~$${usd.toFixed(2)} USD)`
    );

    if (checkCondition(usd, condition)) {
      console.log(`[monitor] Condition met: ${condition.type} $${condition.value}`);
      onConditionMet({ walletAddress, balanceSol: sol, balanceUsd: usd, condition });
      return; // stop polling
    }

    setTimeout(poll, POLL_INTERVAL_MS);
  };

  console.log(
    `[monitor] Starting — watching ${walletAddress.slice(0, 8)}... ` +
    `for condition: ${condition.type} $${condition.value}`
  );
  await poll();
}

module.exports = { startMonitor };

if (require.main === module) {
  // Known Solana devnet address (Solana Labs foundation)
  const TEST_WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

  startMonitor(
    TEST_WALLET,
    { type: "balance_above", value: 0 }, // will trigger as soon as any balance is found
    (result) => {
      console.log("Condition met!", result);
      process.exit(0);
    }
  );
}
