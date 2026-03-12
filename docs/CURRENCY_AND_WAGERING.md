# Currency & Wagering System

## Overview

The wagering system is what turns casual card games into a casino experience. Players bet chips on game outcomes, and the winner takes the pot. This document covers the virtual economy, wagering mechanics, and the long-term path toward real-money integration.

---

## Phase 1: Virtual Currency (No Real Money)

### Chip System

Every user has a chip balance stored in their account. Chips are the universal currency across all casino games.

**Starting Balance:** New accounts receive **1,000 chips** for free. This is enough to play several sessions of low-stakes games without running out immediately.

**Daily Bonus:** Players who log in each day receive a bonus:
- Day 1: 100 chips
- Day 2: 150 chips
- Day 3: 200 chips
- Day 4: 250 chips
- Day 5: 300 chips
- Day 6: 400 chips
- Day 7: 500 chips
- Streak resets after day 7 and restarts

This incentivizes daily engagement and ensures players always have enough chips to keep playing.

**Bankruptcy Protection:** If a player's balance drops below 100 chips, they receive a "relief package" of 500 chips once per 24 hours. This prevents players from being permanently locked out of the casino. The relief package is tracked to prevent abuse.

### Where Chips Come From (Without Real Money)

- Initial account creation bonus (1,000)
- Daily login streaks
- Winning games (taking the pot)
- Achievements (first win: 200 chips, 10-win streak: 1,000 chips, etc.)
- Bankruptcy relief
- Referral bonus (future: 500 chips when a friend you invited plays their first game)

### Where Chips Go

- Wagered and lost in games
- Buy-ins for tournaments (future feature)
- Cosmetic purchases (future: avatar accessories, table themes, card backs)

---

## Wagering Mechanics

### Pre-Game Wagering (Ratscrew, Gin Rummy)

For games where there's no in-game betting (Egyptian Ratscrew, Gin Rummy), the wager is set before the game starts:

1. Both players are seated at the table.
2. Before the game begins, a wager selection screen appears.
3. The host proposes a wager amount.
4. The opponent accepts, counter-proposes, or declines.
5. Both players must have enough chips to cover the agreed wager.
6. Chips are held in escrow (deducted from both players' balances and placed in a pot).
7. The game plays out.
8. Winner receives the entire pot (their original wager returned + opponent's wager).
9. In case of a draw (if the game supports it), both players get their wager back.

**Minimum Wager:** 10 chips (prevents spam/time-wasting with zero-stake games)
**Maximum Wager:** No hard cap, but tables can be labeled with suggested stake levels:
- Low Stakes: 10-100 chips
- Medium Stakes: 100-500 chips
- High Stakes: 500+ chips

Players can always wager any amount they both agree on, but table labels help players find opponents at their level.

### In-Game Wagering (Texas Hold'em)

Poker has its own built-in betting system. The wager is the buy-in:

1. Players buy in to the table with a chip amount (minimum and maximum set by table).
2. Their buy-in becomes their stack for the session.
3. Blinds and betting happen within the game (standard poker rules).
4. When a player leaves the table (or goes bust), their remaining stack is returned to their account balance.
5. Net profit/loss = chips when leaving − chips when buying in.

**Table Stakes (Standard Poker Rule):** A player can only bet what's in front of them. They can't reach into their account balance mid-hand. Between hands, they can add chips (up to the table max).

**Blind Levels:**
- Micro: 1/2 chips
- Low: 5/10 chips
- Medium: 25/50 chips
- High: 100/200 chips

---

## Escrow and Transaction Integrity

Every chip transfer goes through the server. The flow:

1. **Pre-Game Lock:** When a wager is agreed upon, the server deducts the wager from both players' balances and holds it in a virtual escrow (tracked in the game room's state, not a separate table — though a transaction log records it).

2. **Game Resolution:** When the game ends (winner determined), the server awards the pot:
   - Winner's balance += pot total
   - Transaction logged: `{ type: 'game_win', userId, amount, gameType, opponentId, timestamp }`

3. **Forfeit/Disconnect:** If a player disconnects during a wagered game:
   - The 60-second reconnection window applies.
   - If they reconnect, the game continues.
   - If the timer expires, they forfeit. The remaining player wins the pot.
   - A `forfeit` transaction is logged.

4. **Cancellation:** If both players agree to cancel before the game starts (or if the table breaks due to a server issue), wagers are returned to both players in full.

**Atomic Operations:** Chip deductions and awards are wrapped in database transactions. If the server crashes mid-game, the escrow state is recoverable from the transaction log. On server restart, any game rooms with escrowed chips are resolved (returned to players if no clear winner, or awarded based on last known state).

---

## Transaction Ledger

Every chip movement is logged for auditability and debugging:

```
transaction_log:
  id: INTEGER PRIMARY KEY
  user_id: INTEGER (FK → users)
  type: TEXT (game_win, game_loss, wager_escrow, wager_return, daily_bonus, signup_bonus, relief, achievement, purchase, deposit, withdrawal)
  amount: INTEGER (positive for credits, negative for debits)
  balance_after: INTEGER (user's balance after this transaction)
  related_game_id: TEXT (nullable, links to the game session)
  related_user_id: INTEGER (nullable, the opponent in PvP transactions)
  description: TEXT (human-readable note)
  created_at: DATETIME
```

This ledger serves multiple purposes: players can view their chip history, disputes can be investigated, and the system can be audited for bugs (e.g., chips appearing from nowhere).

---

## Anti-Abuse Measures

**Collusion Prevention:**
- Track win/loss patterns between specific player pairs. If two accounts repeatedly play each other with one always winning, flag for review.
- Limit the number of games between the same two players within a time window (e.g., max 20 games per hour between the same pair).

**Multi-Accounting:**
- Rate-limit account creation (1 account per IP per 24 hours).
- Bankruptcy relief is limited to once per 24 hours per account.
- Daily bonuses require the account to be at least 24 hours old.

**Chip Farming:**
- If virtual chips have any value (even cosmetic purchasing power), players might try to farm them. The daily bonus has diminishing returns (caps at day 7 streak). Achievement bonuses are one-time. Game winnings are zero-sum (someone else had to lose those chips).

---

## Phase 2: Real Money Integration (Future — Requires Legal Review)

This section is aspirational. Real-money gambling is heavily regulated. Nothing here should be implemented without consulting a lawyer who specializes in online gambling law in the relevant jurisdiction(s).

### What Would Be Needed

**Legal Requirements (varies by jurisdiction):**
- Gambling license (state-level in the US, national in many countries)
- Age verification (18+ or 21+ depending on jurisdiction)
- KYC (Know Your Customer) identity verification
- Responsible gambling features (self-exclusion, deposit limits, reality checks)
- Regular audits of game fairness (RNG certification)
- Tax reporting for player winnings

**Technical Requirements:**
- Integration with a payment processor that supports gambling (not Stripe or PayPal — look at specialized providers like Paysafe, Worldpay, or crypto-based alternatives)
- Deposit and withdrawal flows with proper security (2FA, confirmation emails)
- Separate "real money" balance from "play money" balance
- Enhanced logging and audit trails
- Encryption of financial data at rest and in transit
- PCI DSS compliance if handling card data directly

**Platform Changes:**
- Deposit flow: User adds funds via payment processor → chips credited to real-money balance
- Withdrawal flow: User requests cashout → identity verification → funds sent via payment processor → chips deducted
- Real-money games are segregated from play-money games (separate tables, clear labeling)
- Responsible gambling tools: daily/weekly/monthly deposit limits, loss limits, session time reminders, self-exclusion options

### Why This Is Phase 2 (or Later)

The regulatory and legal burden is significant. A small personal project running on AWS Amplify is unlikely to qualify for a gambling license in most jurisdictions. More realistic paths:

1. **Operate in an unregulated market** — Some jurisdictions don't regulate online skill-based games (poker and other skill games sometimes fall into gray areas). This is risky and should only be explored with legal counsel.

2. **Social casino model** — Players buy virtual chips with real money but cannot cash them out. This is how many mobile casino apps work (e.g., Zynga Poker). It may not qualify as "gambling" in some jurisdictions because there's no prize of monetary value. Still requires legal review.

3. **Cryptocurrency-based** — Use crypto tokens instead of fiat currency. The regulatory landscape for crypto gambling is still evolving and varies wildly. Some platforms operate in this space, but legal risk is high.

4. **Partnership** — Partner with an existing licensed gambling platform and operate as a skin/frontend. This offloads the licensing burden but requires a business relationship.

**Recommendation:** Build the entire casino with virtual-only chips first. Make it fun, polished, and social. If it gains traction and there's genuine demand for real-money play, pursue legal counsel at that point. The technical architecture (escrow, transaction logs, separate balances) is being designed now to accommodate real money later without a rewrite.

---

## Chip Display & UI

**In the Lobby:**
- Chip count appears in the top-right corner of the screen at all times
- Chip count also appears on the player's nameplate above their avatar
- Animated chip icon with the number

**At Game Tables:**
- Each player's chip count (or table stack for poker) is displayed next to their avatar portrait
- Wager amount shown in the center of the table
- Pot total visible during poker

**Cashier Overlay:**
- Balance display
- Transaction history (last 50 transactions)
- Daily bonus claim button (with streak counter)
- Achievement bonus list (claimed/unclaimed)
- Deposit/Withdraw buttons (grayed out in Phase 1 with "Coming Soon" label)

**Visual Chip Denominations (Cosmetic):**
For visual appeal in the UI, chips have colors based on value:
- White: 1 chip
- Red: 5 chips
- Blue: 10 chips
- Green: 25 chips
- Black: 100 chips
- Purple: 500 chips
- Gold: 1,000 chips

Chip stacks in the game UI show physical stacks of colored chips representing the bet amount. This is purely cosmetic — the database stores a single integer.
