export const generatePitchPrompt = (idea, tone, deckType) => `
You are an expert business consultant and pitch deck creator.

Business Idea: ${idea}
Tone: ${tone}
Deck Type: ${deckType}

Generate a detailed business plan in JSON format with exactly these fields:

{
  "title": "Business name and tagline",
  "problem": "What problem does this business solve?",
  "solution": "How does this business solve the problem?",
  "target_audience": "Who are the customers?",
  "market_size": "TAM, SAM, SOM estimates",
  "business_model": "How does the business make money?",
  "competitors": ["competitor1", "competitor2", "competitor3"],
  "swot": {
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "opportunities": ["opportunity1", "opportunity2"],
    "threats": ["threat1", "threat2"]
  },
  "financials": {
    "startup_cost": "estimated startup cost in INR",
    "monthly_revenue": "estimated monthly revenue in INR",
    "monthly_expenses": "estimated monthly expenses in INR",
    "profit_loss": "estimated monthly profit or loss in INR",
    "break_even": "when will the business break even?"
  },
  "go_to_market": "Launch strategy and marketing plan",
  "call_to_action": "What do you want from investors or partners?"
}

Return ONLY valid JSON. No extra text, no markdown, no code blocks.
`;