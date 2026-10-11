# PocketPilot — Your Money, Before You Spend It

**PocketPilot** is a client-side personal finance simulator built for students and young adults. It models a 30-day, ₹10,000 personal budget, enabling users to test purchases before committing, monitor recurring bills, track savings goals, and evaluate projected month-end solvency in real time.

---

## 1. Project Overview & Problem Statement

Young adults and students often make discretionary purchases without visibility into how an expenditure today affects their ability to pay bills, subscriptions, or savings goals two weeks later. Traditional expense trackers only record what has already been spent.

PocketPilot reverses this paradigm:
- **Know the financial impact before spending.**
- **Prevent intermediate cash flow deficits** where future income cannot cover bills due sooner.
- **Maintain a sustainable month-end cushion** through deterministic cash flow modeling.

---

## 2. Key Features

- **Financial Overview:** Real-time summary of liquid cash, total expenditure, daily safe-to-spend allowance, and projected Day-30 closing balance.
- **Spend Simulator:** Interactive purchase sandbox that calculates metric deltas, tests intermediate and month-end solvency, and explains impacts in plain language.
- **30-Day Cash Flow Forecast:** SVG visualization of daily cash trajectory across the full 30-day cycle, indicating the current day and zero-line thresholds.
- **Savings Goals:** Goal creation with target tracking, percentage completion indicators, dedicated deposit/withdrawal handling, and goal pause states.
- **Recurring Commitments:** Subscriptions and bills tracking with upcoming/paid/overdue indicators, pause/resume controls, and multi-day simulation advancement.
- **Financial Health Score:** Weighted composite health index (0–100) mapped to actionable risk bands (*Healthy*, *Caution*, *Critical*).
- **Transaction Ledger:** Chronological financial log with search, type filtering (*income* vs. *expense*), category grouping, and in-place editing.
- **Local Persistence & Reset:** Client-side persistence with schema validation, sanitization fallbacks, and a one-click simulation reset.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **UI Framework** | [React 18.3](https://react.dev/) | Component hierarchy with functional state |
| **Language** | [TypeScript 5.5](https://www.typescriptlang.org/) | Strict typing across state, domain logic, and props |
| **Build Tool** | [Vite 5.4](https://vitejs.dev/) | Development server and Rollup production bundling |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) | Responsive dark-mode styling and layout |
| **Icons** | [Lucide React](https://lucide.dev/) | Scalable vector interface icons |
| **Testing** | Node.js Test Runner | Native ESM test suite (`node --test`) |
| **Storage** | Web Storage API | Browser LocalStorage (`pocketpilot_state_v1`) |

---

## 4. Architecture Overview

PocketPilot enforces separation of concerns across state management, financial domain modeling, UI presentation, and data persistence:

```
src/
├── context/
│   ├── FinanceContext.tsx   # Global finance state provider with memoized value
│   └── useFinance.ts        # Type-safe context consumer hook
├── lib/
│   ├── finance.ts           # Pure financial domain logic & simulation formulas
│   ├── storage.ts           # LocalStorage load/save/sanitize layer
│   ├── defaultData.ts       # Canonical ₹10,000 Day-1 seed data & category maps
│   └── format.ts            # Currency (₹ INR), day numbering, and UID utilities
├── components/
│   ├── Layout.tsx           # Responsive shell (mobile nav bar, desktop sidebar)
│   ├── CashFlowChart.tsx    # Memoized SVG cash flow projection curve
│   ├── AddTransactionModal  # Accessible modal dialog for manual transactions
│   └── ui.tsx               # Reusable primitives (Button, Card, Badge, Modal, Input, ProgressBar)
├── views/                   # Code-split asynchronously via React.lazy
│   ├── Overview.tsx         # Dashboard metrics & cash flow chart
│   ├── SpendSimulator.tsx   # Purchase simulation sandbox & feasibility flags
│   ├── Transactions.tsx     # Filterable and searchable ledger
│   ├── SavingsGoals.tsx     # Goal progress, contributions, and withdrawals
│   ├── RecurringPayments.tsx# Bills management and day advancement
│   └── FinancialHealth.tsx  # Health score breakdown and data reset
├── App.tsx                  # Root layout, Suspense boundaries, and view router
├── main.tsx                 # DOM entry point
└── types.ts                 # Core TypeScript interfaces and domain types
```

### Key Architectural Decisions

1. **Pure Financial Domain Logic (`finance.ts`):** All calculations are decoupled from React components. Functions like `canAfford`, `computeMetrics`, and `getCashFlowSeries` are pure functions that accept state and return results without side effects.
2. **Context Stability & Memoization:** `FinanceProvider` memoizes its value object with `useMemo`, preventing full-tree re-renders on unrelated parent updates.
3. **Optimized Metrics Pipeline:** `computeMetrics` reuses base calculations (such as available cash, total spent, and upcoming obligations) to avoid redundant array traversals.
4. **Asynchronous Route Chunking:** Non-landing views (`SpendSimulator`, `Transactions`, `SavingsGoals`, `RecurringPayments`, `FinancialHealth`) are code-split using `React.lazy` and `Suspense`, reducing the initial entry bundle size.
5. **Defensive Storage Parsing (`storage.ts`):** `loadState` validates all fields against strict type guards, discarding corrupted records, non-finite values, and malformed structures gracefully.

---

## 5. Financial Simulation: Formulas & Logic

PocketPilot is configured around a 30-day budget window starting with ₹10,000.

### Mathematical Definitions

1. **Available Liquid Cash:**
   $$\text{Cash} = \text{Starting Funds} + \sum \text{Income}_{(\text{day} \le \text{currentDay})} - \sum \text{Expenses}_{(\text{day} \le \text{currentDay})} - \sum \text{Goal.saved}$$
   *Goal allocations are deducted from liquid cash upon deposit.*

2. **Projected Day-30 Balance:**
   $$\text{Projected}_{30} = \text{Cash} + \sum \text{Income}_{(\text{day} > \text{currentDay})} - \sum \text{Recurring}_{(\text{active, future})} - \sum \text{Expenses}_{(\text{future})} - \sum \text{Goal.remaining}_{(\text{active, future})}$$

3. **Daily Safe-to-Spend Allowance:**
   $$\text{Daily Allowance} = \max\left(0, \left\lfloor \frac{\text{Cash} + \text{Future Income} - \text{Upcoming Commitments} - \text{Emergency Buffer}}{\max(1, \text{Total Days} - \text{Current Day} + 1)} \right\rfloor\right)$$

4. **Affordability Evaluation (`canAfford`):**
   A purchase is approved only if **all three** criteria are satisfied:
   - **Immediate Liquidity:** If the transaction date is on or before the current day, $\text{Amount} \le \text{Available Cash}$.
   - **Month-End Solvency:** $\text{Projected Day 30 Balance} \ge 0$ after simulating the expense.
   - **Intermediate Cash Flow Feasibility:** Across all days $d \ge \text{day}$, daily balance in $\text{getCashFlowSeries} \ge 0$. This prevents authorizing a purchase before scheduled future income arrives when cash would temporarily dip negative.

5. **Financial Health Index (0–100):**
   - **Budget Sustainability (35%):** $\max(0, \min(100, \text{round}((1 - \frac{\text{Spent}}{\text{Budget}}) \times 100)))$
   - **Emergency Resilience (25%):** Proportion of projected Day-30 buffer relative to starting funds.
   - **Savings Feasibility (20%):** Mean progress ratio across all active savings targets.
   - **Commitment Coverage (20%):** $\min(1, \frac{\text{Cash}}{\text{Upcoming Expenses}}) \times 100$
   - **Risk Bands:** `Healthy` (75–100), `Caution` (45–74), `Critical` (0–44).

---

## 6. Installation & Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) v20.x or newer
- npm v10.x or newer

### Setup

```bash
# Clone the repository
git clone https://github.com/omkayarkar/pocketpilot_finance.git

# Navigate into the project directory
cd pocketpilot_finance

# Install dependencies
npm install

# Start local development server with Hot Module Replacement
npm run dev
```

Open the local address printed by Vite (typically `http://localhost:5173`) in your browser.

---

## 7. Quality & Verification Commands

All checks must pass without warnings or errors before deployment:

```bash
# 1. TypeScript static type checking
npm run typecheck

# 2. ESLint code quality & formatting validation
npm run lint

# 3. Unit tests execution (financial math, storage sanitization, invariants)
npm run test

# 4. Production build compilation and asset minification
npm run build
```

---

## 8. LocalStorage Persistence & Reset Behavior

- **Storage Key:** `pocketpilot_state_v1`.
- **Validation:** On application load, `loadState()` parses the stored JSON. If parsing fails, values are missing, or numeric fields are `NaN`/infinite, safe defaults are applied.
- **Auto-Sync:** Every state transition in `FinanceProvider` triggers an automatic write to `localStorage`.
- **Simulation Reset:** Clicking **Reset All Data** in the Financial Health view clears `localStorage` via `clearState()` and reinstates the default canonical Day-1 profile (₹10,000 starting cash, Day-1 canteen/bus entries, Day-10 freelance income, Day-5/15 subscriptions, and Day-25 headphones goal).

---

## 9. Accessibility & Responsive Design

### Accessibility (a11y)
- **Keyboard Navigation:** Full tab order across all interactive controls with visible focus rings (`focus-visible:ring-lime-400`).
- **Skip Link:** A `Skip to main content` shortcut anchor is available for screen-reader and keyboard users.
- **Dialogs & Modals:** Accessible modal containers with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `Escape` key dismissal, and backdrop click handlers.
- **Screen Reader Support:** Form inputs are explicitly paired with labels or `aria-label`/`aria-describedby` attributes. Progress bars provide `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
- **SVG Graphics:** Charts include `role="img"` and descriptive `<title id="...">` tags.
- **Color Contrast:** High-contrast text on dark backgrounds (`slate-900` body, `slate-800` cards, `lime-400` / `white` / `slate-300` text).

### Responsive Design
- **Mobile (< 768px):** Fixed top navigation bar displaying current day and balance, horizontally scrollable bottom-safe tab bar, single-column metric cards.
- **Desktop (>= 768px):** Collapsible vertical navigation sidebar, multi-column metric grids (up to 4 columns), side-by-side scenario simulation panels.

---

## 10. Known Limitations & Roadmap

### Current Limitations
- **Single Currency:** Tailored specifically for Indian Rupees (`₹` / `INR`) formatting.
- **Fixed Horizon:** Configured around a 30-day fixed cycle rather than multi-month calendar dates.
- **Client Storage:** Data is stored on the local browser instance; no multi-device cloud synchronization.
- **Manual Input:** Transactions and bills are entered manually without direct bank/UPI aggregators.

### Future Improvements
- Multi-month roll-over budgeting cycles.
- Export/import of transaction statements in JSON and CSV formats.
- Category-level spending limits with automated warning thresholds.
- Configurable regional currency locales (USD, EUR, GBP).

---

## 11. Hackathon Details

Built for **PROMPT RUN**.

## 12. License

MIT License. See project repository for details.
