# Advanced Granular Bidding System (0-100)

## Overview

The NBA Draft Assistant now features a sophisticated 0-100 granular bidding system that evaluates every bidding decision across 5 key dimensions, providing much more nuanced recommendations than the previous 3-level system.

## Scoring Breakdown

### 1. Roster Fit (0-25 points)
- **Positional Needs (0-10 pts)**: How well the player fills current roster gaps
- **Category Needs (0-10 pts)**: Addresses weak fantasy categories in your roster
- **Flexibility & Urgency (0-5 pts)**: Multi-position eligibility and draft urgency

### 2. Remaining Players Value (0-20 points)
- **Positional Scarcity (0-10 pts)**: How rare similar players are in the remaining pool
- **Tier Scarcity (0-5 pts)**: Availability of same-tier alternatives
- **Quality Drop-off (0-5 pts)**: Whether better alternatives remain available

### 3. Budget Situation (0-20 points)
- **Budget Health (0-8 pts)**: Your financial flexibility after the bid
- **Value vs Cost (0-7 pts)**: Deal quality relative to projected value
- **Competitive Advantage (0-5 pts)**: Your budget position vs other teams

### 4. Value Efficiency (0-20 points)
- **Base Efficiency (0-12 pts)**: Projected value vs bid cost
- **Tier Premium (0-4 pts)**: Elite player value adjustments
- **Phase Timing (0-4 pts)**: Draft phase considerations

### 5. Punt Strategy (0-15 points)
- **Auto-punt Detection (0-8 pts)**: Identifies emerging punt strategies from your roster
- **Strategy Alignment (0-7 pts)**: Fits your selected roster strategy

## Bidding Recommendations

| Score Range | Recommendation | Max Bid |
|-------------|----------------|---------|
| 85-105 | 🔥 **EXCEPTIONAL** - Highly recommended | Up to 110% of value |
| 75-84 | ⭐ **EXCELLENT** - Strongly recommended | Up to 105% of value |
| 65-74 | ✅ **GOOD** - Recommended | Up to full value |
| 55-64 | ⚖️ **FAIR** - Consider bidding | Up to 95% of value |
| 45-54 | ⚠️ **BELOW AVERAGE** - Proceed with caution | Up to 90% of value |
| 35-44 | ❌ **POOR** - Not recommended | Up to 80% of value |
| 0-34 | 🚫 **AVOID** - Very poor opportunity | Up to 70% of value |

**Note**: Scores can exceed 100 due to timing bonus points (0-5) awarded when high-tier players are nominated at unexpected times.

## Usage Example

```typescript
import { getBiddingRecommendation, createTeamBudgetInfo } from './utils/draftLogic';

// Set up other teams' budget tracking (optional but recommended)
const otherTeams = [
  createTeamBudgetInfo("Team A", 150, 5), // $150 left, 5 players owned
  createTeamBudgetInfo("Team B", 120, 7), // $120 left, 7 players owned
  createTeamBudgetInfo("Team C", 80, 9),  // $80 left, 9 players owned
];

// Update draft state with budget tracking
const draftState = {
  ...yourDraftState,
  otherTeamsBudgets: otherTeams
};

// Get bidding recommendation
const recommendation = getBiddingRecommendation(player, currentBid, draftState);

console.log(`Bidding Score: ${recommendation.biddingScore}/100`);
console.log(`Should Bid: ${recommendation.shouldBid}`);
console.log(`Max Bid: $${recommendation.maxBid}`);
console.log(`Confidence: ${recommendation.confidence}`);

// Detailed breakdown
console.log('Score Breakdown:');
console.log(`- Roster Fit: ${recommendation.scoreBreakdown.rosterFit}/25`);
console.log(`- Remaining Players: ${recommendation.scoreBreakdown.remainingPlayersValue}/20`);
console.log(`- Budget Situation: ${recommendation.scoreBreakdown.budgetSituation}/20`);
console.log(`- Value Efficiency: ${recommendation.scoreBreakdown.valueEfficiency}/20`);
console.log(`- Punt Strategy: ${recommendation.scoreBreakdown.puntStrategy}/15`);

// Reasoning
recommendation.reasoning.forEach(reason => console.log(`- ${reason}`));
```

## Key Features

### 1. **Automatic Punt Detection**
The system automatically detects when you're developing a punt strategy based on your roster's category weaknesses and adjusts recommendations accordingly.

### 2. **Budget Competition Analysis**
When you provide other teams' budget information, the system factors in your competitive advantage or disadvantage in bidding wars.

### 3. **Dynamic Strategy Adaptation**
As your roster develops, the system adapts its recommendations to fit emerging strategies and fill remaining needs.

### 4. **Scarcity Analysis**
The system analyzes both positional and tier-based scarcity to identify when you need to act quickly on rare opportunities.

### 5. **Smart Timing Analysis**
The system analyzes nomination timing vs. expected player quality, awarding bonus points when high-tier players are nominated unexpectedly. This means a Tier 2 player nominated early gets full consideration, not a penalty for "wrong" timing.

## Helper Functions

### Track Other Teams' Budgets
```typescript
// Create team budget info
const teamA = createTeamBudgetInfo("Team A", 150, 5);

// Update after a player is drafted
const updatedTeamA = updateTeamBudget(teamA, 25); // Team A spent $25
```

### Monitor Your Strategy
The system will automatically suggest strategy pivots based on your roster development:
- If you have 3+ weak categories → Consider punt strategies
- If you have 2+ strong categories with high budget → Consider stars & scrubs
- Otherwise → Maintain balanced approach

## Tips for Maximum Effectiveness

1. **Track Competitor Budgets**: The more accurate budget information you provide, the better the competitive analysis
2. **Update Strategy Selection**: Don't be afraid to change your strategy as the draft progresses
3. **Trust the Scarcity Signals**: High scarcity scores often indicate must-bid situations
4. **Monitor Category Balance**: The system will guide you toward addressing roster weaknesses
5. **Use Score Breakdown**: The detailed breakdown helps you understand why certain bids are recommended

This granular system provides the sophisticated analysis needed for competitive fantasy basketball drafts while remaining intuitive and actionable.
