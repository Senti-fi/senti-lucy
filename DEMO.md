# Demo-Day Script

A tight 5-minute walk-through that hits Senti Lucy's strongest moments in order. Designed for live demo with a fallback recording.

---

## Before you start

**Pre-flight checklist** (run 10 minutes before stage):

- [ ] Server running: `npm run dev` — confirm `http://localhost:3001` returns the dashboard
- [ ] `data/plans.json` reset to `{ "plans": [] }` so the Vault flow ends with a clean activation
- [ ] Phantom installed in browser; **set to Solana devnet** (Settings → Developer Settings → Change Network → Devnet)
- [ ] Phantom devnet wallet has at least 2 SOL — if not, click **Request Airdrop** beforehand
- [ ] Browser zoom at 100%; window sized to 1280×800 or larger so the dashboard's two-column layout fits cleanly
- [ ] Dev tools console **closed**
- [ ] Other tabs closed (no notifications popping up)
- [ ] Anthropic API key working — test by hitting the Lucy textarea once with any phrase
- [ ] Backup video recording of the same flow ready to swap in if anything dies live

**One-line pitch you'll open with:**

> *"Senti Lucy is an AI financial agent for Solana — tell her what you want in plain English, and she handles your payments, savings, yield, and card spend across one wallet."*

---

## The 5-minute path

Total: ~5 minutes. Each beat has a target time and the click sequence. If something glitches, skip ahead — don't try to recover live.

### Beat 1 — Cold open (30s)

**Page:** Dashboard (already loaded)

**Say:** *"This is Senti. Before I connect a wallet, you're seeing simulated state — note the SIMULATION pill — so investors and testers always have something to look at. Lucy is shown as Active, with a scheduled rent payment counting down, and a Recent Activity feed."*

**Show:**
- Point at the balance hero ($72,880.73), the Simulation pill, the Lucy status card on the right ("Last Action: Gas optimization, Saved $2.43"), and the Scheduled Action card with the live countdown.

**Skip on glitch:** any countdown weirdness — just keep moving.

---

### Beat 2 — Connect wallet (30s)

**Click:** the prominent **Connect Wallet** button on the balance card.

**Say:** *"I'll connect Phantom — the modal warns it must be on devnet, which is part of why testing this is frictionless."*

**Action:** Phantom popup → approve.

**Show:**
- Simulation pill disappears.
- Balance updates to your real devnet SOL balance.
- Recent Activity clears the demos and shows real (or empty-state if your wallet is fresh).
- Subtitle becomes *"Solana devnet · live"*.

**Skip on glitch:** if Phantom is slow, narrate while it loads — *"This is a real on-chain connection, not a mock."*

---

### Beat 3 — Lucy parses an intent (60s)

**Click:** **Ask Lucy** action button on the dashboard.

**Say:** *"This is Lucy's centerpiece. Anything you'd say to a personal banker, she parses into structured intent."*

**Click:** the suggestion chip *"Send $500 USDT to Sarah every Friday"*.

**Click:** **Ask Lucy** button.

**Show:**
- The textarea fills, the button switches to "Thinking…"
- After 1-3 seconds: a new card appears in the Scheduled Actions panel: `$500 to Sarah · Recurring · Every weekly on day Friday`
- The Execution Feed lights up with three entries: parsing → intent type → schedule confirmation.

**Say (while it's parsing):** *"This is a real Anthropic Claude call — no mocked responses. Lucy returns structured JSON that the backend executor uses to schedule monitoring."*

**Skip on glitch:** if Claude is slow (~5+ sec), say *"I'll come back to this — the API is real, occasionally that means real latency."* and move on.

---

### Beat 4 — Send Now flow with confirmation (45s)

**Click:** **Back** to dashboard, then **Send** action button.

**Say:** *"Send is the canonical money-transfer experience — recipient, amount, review, confirm."*

**Click:** the **Vendor #3821** Quick Pick (this is the SOL recipient, so we get a real on-chain tx).

**Click:** **SOL** token chip, type **0.01** in the amount field.

**Click:** **Review Payment**.

**Show:** the review state with itemized rows — *To, Network, Network fee, Total*.

**Say:** *"Notice the explicit confirmation step before signing. We don't drop you straight into Phantom — you see exactly what's about to happen."*

**Click:** **Confirm & Send**.

**Action:** Phantom popup → approve.

**Show:**
- Sending state with status text updating: *"Building → Waiting for Phantom signature → Awaiting devnet confirmation"*
- Result state: green check, *"Payment sent"*, **View on Solana Explorer ↗** link (real, click it if you have time)

**Skip on glitch:** Phantom rejection is fine — the result state shows *"Cancelled in Phantom"* with a retry button. Use it as proof of error handling.

---

### Beat 5 — The card and yield narrative (60s)

**Click:** **Back** to dashboard, then **Pay** action button.

**Say:** *"Senti isn't crypto-only — it's a full financial agent. Here's your virtual card."*

**Show:**
- The gradient card with cardholder name, 4824-9302 number, expiry
- Stats: *"Spent this month $570.32"* (or whatever the seed totals to), *"Funded from USDC balance"*
- Recent Card Transactions: Spotify, Uber, Whole Foods, etc.

**Say:** *"Each card swipe debits your USDC balance — crypto and traditional payments share one wallet."*

**Click:** **Yield** in the sidebar.

**Show:**
- Live Kamino USDC + USDT APY rates ticking
- *"Auto-refreshes every 30s"*
- Click **Optimise Now** if time allows — Lucy returns a Kamino allocation recommendation.

**Say:** *"This is live data from Kamino mainnet — APY, TVL, real reserves. Lucy reads your on-chain position and recommends where to optimise."*

---

### Beat 6 — Vault closes the story (45s)

**Click:** **Vault** in the sidebar.

**Click:** the **Save $1,000 in 3 months** chip.

**Click:** **Ask Lucy**.

**Show:**
- Plan card appears: target, duration, weekly auto-deposit, expected yield, and Lucy's summary

**Click:** **Activate Plan** (defaults satisfy funding requirements).

**Show:**
- New vault card slides in at the top of Active Vaults
- *"Schedule active"* result card
- Active vault count increments

**Say:** *"Lucy turned a sentence into a structured savings plan, persisted it server-side keyed to the wallet, and now monitors it autonomously. Reload the page — it's still there."*

**Optional reload demo if time:** F5 → Vault → the activated plan is still there.

---

### Closing (10s)

**Click:** back to Dashboard.

**Say:** *"Lucy across send, schedule, pay, yield, save, all on Solana, all from natural language. That's Senti."*

---

## Things to AVOID showing live

These currently work but have rough edges that hurt a polished demo:

- **The fake QR on the Receive page** — visual placeholder, not scannable. Don't invite anyone to scan it.
- **The "Network Speed" tier on Send** — wait, this was already removed in our cleanup. Skip.
- **Conditional payment monitor running for 30+ seconds** — it polls real devnet but the "execute on condition met" step is still a console.log placeholder. Don't wait for it to fire on stage.
- **The Lucy page's three-panel layout on a phone-sized window** — works but feels cramped. Demo at desktop sizes only.

---

## Backup plan if Claude API is down

If Anthropic's API is having a bad day, switch your narrative:

- Skip Beat 3 (Lucy parsing) entirely.
- For the Vault flow in Beat 6, use the demo vaults already in the list — they tell the story even without a fresh activation.
- Keep the Send flow (Beat 4) — it's pure Solana, doesn't depend on Claude.

If Claude is slow but working, you can pre-fire one Lucy call before stage and reload — the page won't show stale state, but a recent successful call confirms the API is responsive.

---

## What you're really pitching

The demo is a vehicle for these ideas. Drop them between beats:

1. **One wallet for crypto AND card payments** — crypto-native users currently juggle Phantom + traditional bank cards. Senti merges them.
2. **Natural language as the universal interface** — Lucy makes complex financial automation accessible to non-power-users.
3. **Real on-chain depth, not just a UI** — live Kamino reads, real Solana Pay-style transfers, persisted state. Most hackathon "AI agents" are entirely mocked.
4. **Built for hackathon, designed for production** — the architecture (Express + file persistence + Particle MPC roadmap) shows where this scales.

If you only get one line in: **"It's Apple Pay, but the AI does the work and the wallet is yours."**
