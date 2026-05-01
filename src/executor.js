// executor.js — transaction execution engine
require("dotenv").config();

const { parseIntent } = require("./lucy");
const { startMonitor } = require("./monitor");

async function executeIntent(userInput, senderWalletAddress) {
  // Step 1: parse plain-language intent via Lucy
  const intent = await parseIntent(userInput);

  console.log("\n[executor] Parsed intent:");
  console.log(JSON.stringify(intent, null, 2));

  // Step 2: route by intent type
  if (intent.intent_type === "conditional_payment") {
    if (!intent.condition) {
      throw new Error("conditional_payment requires a condition field");
    }

    console.log(
      `\n[executor] Conditional payment detected — monitoring wallet ${senderWalletAddress.slice(0, 8)}... ` +
      `for condition: ${intent.condition.type} $${intent.condition.value}`
    );

    await startMonitor(senderWalletAddress, intent.condition, ({ balanceUsd }) => {
      console.log(
        `\n✅ Executing: Send $${intent.amount} to ${intent.recipient} — condition met`
      );
      console.log(
        `   (wallet balance $${balanceUsd.toFixed(2)} USD satisfied: ${intent.condition.type} $${intent.condition.value})`
      );
      // TODO: integrate Particle MPC signing to build, sign, and send the Solana transaction
    });

  } else if (intent.intent_type === "recurring_payment") {
    if (!intent.schedule) {
      throw new Error("recurring_payment requires a schedule field");
    }

    const { frequency, day } = intent.schedule;

    console.log(
      `\n[executor] Recurring payment detected — ${frequency} on day ${day}`
    );
    console.log(
      `✅ Recurring payment set: $${intent.amount} to ${intent.recipient} every ${frequency} on day ${day}`
    );
    // TODO: integrate Particle MPC signing to build, sign, and send the Solana transaction

  } else {
    throw new Error(`Unknown intent_type: ${intent.intent_type}`);
  }
}

module.exports = { executeIntent };

if (require.main === module) {
  // Known Solana devnet wallet with a real balance
  const SENDER_WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

  executeIntent(
    "Send $50 to Chidi when my balance goes above $200",
    SENDER_WALLET
  ).catch((err) => {
    console.error("[executor] Error:", err.message);
    process.exit(1);
  });
}
