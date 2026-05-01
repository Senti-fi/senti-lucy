# Senti Lucy

**An AI financial agent for Solana — automate payments, optimise yield, save toward goals, and pay with a card, all from a single wallet.**

Lucy is the AI agent at the centre of Senti. Tell her what you want in plain English ("send $200 to Sarah every Friday", "save $1,000 in 3 months", "find me the best stablecoin yield") and she parses, schedules, and executes — across crypto transfers and traditional card payments.

Built for hackathon. Runs on Solana devnet for live transfers, reads real positions from Kamino mainnet, and uses Anthropic's Claude for natural-language parsing.

---

## What's in the box

- **Lucy AI agent** — parses plain-English instructions into structured payment, savings, and yield intents.
- **Send** — immediate or scheduled transfers (recurring + conditional). SOL is real on devnet via Phantom; USDT/USDC are simulated.
- **Pay** — virtual Senti card with a transaction history. Card spend draws from your USDC balance, tying crypto and card payments together.
- **Yield** — live Kamino mainnet APY rates, AI-driven asset recommendations, and read-only on-chain position lookup.
- **Vault** — natural-language savings goals. Lucy turns "Save $1,000 in 3 months" into a structured plan and persists it.
- **Receive** — wallet address, QR placeholder, and Solana Pay-style payment-request links.
- **Dashboard** — total balance, allocation, scheduled actions, and Lucy status at a glance.

---

## Tech stack

- **Backend** — Node.js + Express 5 on port 3001
- **AI** — `@anthropic-ai/sdk` with `claude-sonnet-4-6` for intent parsing, yield recommendations, and savings-plan generation
- **Solana — devnet** — `@solana/web3.js` v1 for balance lookups, transaction history, faucet airdrops, and SOL transfers
- **Solana — mainnet (read-only)** — `@solana/kit` + `@kamino-finance/klend-sdk` for live Kamino position data
- **Wallet** — Phantom browser extension for transaction signing on devnet
- **Persistence** — file-based JSON store at `data/plans.json` for activated savings plans

---

## Quick start

### Prerequisites

- Node.js 18+
- A Phantom wallet (recommended), set to **Solana devnet** for live SOL transfers
- An Anthropic API key

### Setup

```bash
git clone <your-fork-url>
cd senti-lucy
npm install
```

Create a `.env` file in the project root:

```bash
ANTHROPIC_API_KEY=sk-ant-...
SOLANA_RPC_URL=https://api.devnet.solana.com

# Optional — set to a paid mainnet RPC (Helius free tier works) for the
# Yield page's Kamino position reads. Defaults to the public mainnet endpoint
# if unset, which is fine for low-traffic demos.
SOLANA_MAINNET_RPC_URL=https://api.mainnet-beta.solana.com
```

### Run

```bash
npm run dev
```

The server listens on `http://localhost:3001`. Open it in a browser.

### First-touch tips

- The dashboard shows simulated values until a wallet is connected — that's the testing fallback. The little **SIMULATION** pill on the balance card makes this clear.
- Click **Connect Wallet** on the balance card (or **Send / Pay / Receive** action buttons, which gate on wallet state).
- Phantom must be on **devnet** for the SOL flows to work. There's a hint in the connect modal; if your balance reads as `$0.00` after connecting, switch via Phantom → Settings → Developer Settings → Change Network → Devnet.
- Empty wallet on devnet? Click **Request Airdrop** to receive 2 devnet SOL.

---

## Architecture

### Backend modules (`src/`)

| File | Responsibility |
| --- | --- |
| `server.js` | Express app, route definitions, middleware, static file serving |
| `lucy.js` | Claude intent parser — turns plain English into structured intent JSON |
| `executor.js` | Routes parsed intents (conditional vs recurring) to the right handler |
| `monitor.js` | Background loop that polls a wallet's balance and fires when conditions are met |
| `yield.js` | Live Kamino REST API client (USDC/USDT supply rates), with 30s in-memory cache and fallback constants |
| `positions.js` | klend-sdk wrapper that reads on-chain Kamino deposit positions for a given wallet |
| `plans.js` | File-based persistence for activated savings plans (atomic writes via tmp + rename) |

### Endpoints

```
GET    /api/health
GET    /api/balance/:address           # devnet SOL balance + USD estimate
GET    /api/transactions/:address      # recent signature list
POST   /api/airdrop/:address           # 2 SOL devnet airdrop
GET    /api/yield/rates                # live Kamino USDC/USDT APY
POST   /api/yield/recommend            # Claude-powered allocation suggestion
GET    /api/yield/positions/:address   # on-chain Kamino positions (mainnet)
POST   /api/vault/plan                 # Claude — parse goal into structured plan
GET    /api/vault/plans/:wallet        # list persisted plans for a wallet
POST   /api/vault/plans                # save a plan
DELETE /api/vault/plans/:id            # remove a plan
POST   /api/intent                     # Claude — parse intent without executing
POST   /api/execute                    # Claude — parse + start monitor
```

---

## Status — what's real vs simulated

Senti Lucy is a hackathon build. Some flows are live, others are mocked. Here's the honest map:

| Feature | Status |
| --- | --- |
| Lucy intent parsing (Send, Vault, Yield, Pay) | **Real** — every Claude call hits the live API |
| SOL transfers on devnet via Phantom | **Real** — actual on-chain transactions, real signatures, Solana Explorer links work |
| Devnet balance + transaction history | **Real** — fetched from Solana devnet RPC |
| Kamino USDC/USDT APY rates | **Real** — live REST API from `api.kamino.finance` |
| Kamino on-chain positions | **Real** — read from mainnet via klend-sdk |
| Vault savings plans | **Persisted** — saved to `data/plans.json`, survive reloads |
| USDT/USDC transfers | **Simulated** — decrement an in-memory demo balance |
| Virtual Senti card | **Simulated** — fixed cardholder, fixed transaction list, but linked to USDC demo balance |
| Conditional/recurring payment monitoring | **Real polling, simulated execution** — `monitor.js` watches devnet balances live, but actual transfer-on-condition is a console log (Particle MPC integration is the next step) |
| Dashboard "Recent Activity" | **Real once connected** — pulls from devnet RPC; demos clear on connect |
| Receive QR | **Visual placeholder** — looks like a QR, isn't scannable yet |

---

## Roadmap

Post-hackathon priorities, ranked:

1. **Particle MPC signing** — replace the `executor.js` console-log placeholder with real autonomous transaction signing. Unlocks actual conditional-payment execution, real Kamino deposits, and card-charge settlement.
2. **Kamino deposit / withdraw** — wire the existing read-only positions UI to actual transactions through klend-sdk action builders.
3. **Real card issuance** — replace the simulated card with a real virtual card via a Solana-friendly card processor (Paywire, Reap, or similar).
4. **Multi-wallet support** — currently single-wallet per session; add per-user persistence keyed by wallet address.
5. **Real Solana Pay URIs** — switch the Receive page's payment-request links to spec-compliant Solana Pay URIs with `spl-token=<mint>`.

---

## Project structure

```
senti-lucy/
├── data/
│   └── plans.json              # persisted savings plans
├── public/
│   └── index.html              # entire frontend (single file)
├── src/
│   ├── server.js               # Express app + routes
│   ├── lucy.js                 # Claude intent parser
│   ├── executor.js             # intent router
│   ├── monitor.js              # balance polling
│   ├── yield.js                # Kamino REST client
│   ├── positions.js            # Kamino on-chain reader
│   └── plans.js                # plans persistence
├── .env                        # secrets (not committed)
├── package.json
└── README.md
```

---

## License

ISC — see `package.json`.
