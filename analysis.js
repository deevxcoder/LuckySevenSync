// Analysis of current vs proposed Lucky 7 game system
console.log("=== CURRENT CARD-BASED SYSTEM ANALYSIS ===");

// Current system probabilities (card numbers 1-13)
const currentProbs = {
  red: 0.5,        // 2 red suits out of 4
  black: 0.5,      // 2 black suits out of 4  
  high: 6/13,      // numbers 8-13
  low: 7/13,       // numbers 1-7
  lucky7: 1/13     // exactly 7
};

// Current payouts (total return including stake)
const currentPayouts = {
  red: 2,
  black: 2,
  high: 2,
  low: 2,
  lucky7: 6
};

console.log("Current System House Edges:");
for (const [betType, prob] of Object.entries(currentProbs)) {
  const expectedValue = prob * currentPayouts[betType];
  const houseEdge = (1 - expectedValue) * 100;
  console.log(`${betType}: ${houseEdge.toFixed(2)}% house edge (EV: $${expectedValue.toFixed(3)})`);
}

console.log("\n=== PROPOSED DICE-BASED SYSTEM ANALYSIS ===");

// Proposed system probabilities (two dice, sum 2-12)
// Below (sum 2-6): 15 ways out of 36
// Seven (sum 7): 6 ways out of 36  
// Above (sum 8-12): 15 ways out of 36
const proposedProbs = {
  below: 15/36,    // 41.67%
  seven: 6/36,     // 16.67%
  above: 15/36     // 41.67%
};

// Proposed payouts (total return including stake)
const proposedPayouts = {
  below: 1.944,
  seven: 4.86,
  above: 1.944
};

console.log("Proposed System House Edges:");
for (const [betType, prob] of Object.entries(proposedProbs)) {
  const expectedValue = prob * proposedPayouts[betType];
  const houseEdge = (1 - expectedValue) * 100;
  console.log(`${betType}: ${houseEdge.toFixed(2)}% house edge (EV: $${expectedValue.toFixed(3)})`);
}

console.log("\n=== COMPARISON ===");
console.log("Current system: Inconsistent house edges (0% to 53.8%)");
console.log("Proposed system: Consistent ~19% house edge across all bets");
console.log("Benefit: Predictable house profit margins and fair player experience");