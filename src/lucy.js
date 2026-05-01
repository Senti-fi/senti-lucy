// lucy.js — AI intent parser
require("dotenv").config();

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an intent parser for a crypto payment automation system.
Given a plain-language user instruction, extract structured intent and return ONLY valid JSON — no markdown, no explanation, no code fences.

The JSON must follow this schema exactly:

{
  "intent_type": "conditional_payment" | "recurring_payment",
  "amount": <number in USD>,
  "recipient": "<wallet address or name string>",
  "condition": {
    "type": "<e.g. balance_above, balance_below, price_above, price_below>",
    "value": <number>
  },
  "schedule": {
    "frequency": "<e.g. daily, weekly, monthly>",
    "day": <number>
  },
  "raw_intent": "<original user string verbatim>"
}

Rules:
- Use "conditional_payment" when the instruction contains a trigger condition (e.g. "when", "if").
- Use "recurring_payment" when the instruction describes a repeating schedule (e.g. "every month", "weekly").
- Omit "schedule" for conditional payments and omit "condition" for recurring payments.
- If both are present, prefer "conditional_payment" and include both fields.
- "amount" must be a plain number (no currency symbols).
- Return null for any field you cannot determine from the input.`;

async function parseIntent(userInput) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userInput }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";

  return JSON.parse(text);
}

module.exports = { parseIntent };

if (require.main === module) {
  (async () => {
    const result = await parseIntent(
      "Send $50 to Chidi when my balance goes above $300"
    );
    console.log(JSON.stringify(result, null, 2));
  })();
}
