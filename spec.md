# Streak System (Discipline Model)

This project uses a **discipline‑oriented weekly streak system** for the habit flame indicators. The goal is to reinforce consistent effort while avoiding anxiety from a single missed day.

## Core Rule
A streak is counted **by weeks**, not by days.

A week is considered **successful** when the user completes a habit on at least **5 days**.

## Streak Length
The flame count is based on **consecutive successful weeks**:

- **1 flame** → 1+ consecutive weeks
- **2 flames** → 4+ consecutive weeks
- **3 flames** → 8+ consecutive weeks
- **4 flames** → 12+ consecutive weeks
- **5 flames** → 24+ consecutive weeks

## Psychology Rationale
- Encourages **long‑term consistency**, not just day‑to‑day streak pressure.
- Allows occasional misses without breaking the streak, reducing avoidance behavior.
- Reinforces discipline through **weekly accountability**.

## Implementation Reference
- Weekly streak calculation: `src/utils/habitUtils.ts` (`getDisciplineStreakWeeks`).
- Flame rendering: `src/components/screens/HomeScreen.tsx` (uses `getDisciplineStreakWeeks`).
