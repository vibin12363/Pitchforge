def generate_questions_prompt(idea):
    return f"""
You are an expert business consultant. A user has given you this business idea:

"{idea}"

First check if this is a valid, meaningful business idea written in English or any Indian language.
If it is NOT a valid business idea (random characters, gibberish, nonsense text, too vague, less than 3 real words), return this exact JSON:
{{"invalid": true, "message": "Please describe a real business idea. For example: 'A food delivery app for college students in Tamil Nadu'"}}

If it IS a valid business idea, generate exactly 7 smart clarifying questions specific to their idea and return this JSON:
{{"invalid": false, "questions": [
  {{"id": "budget", "question": "What is your estimated budget or investment for this business?", "placeholder": "e.g. 50,000 INR"}},
  {{"id": "location", "question": "Which state or city are you targeting first?", "placeholder": "e.g. Tamil Nadu, Chennai"}},
  {{"id": "audience", "question": "Who is your primary target audience?", "placeholder": "e.g. College students aged 18-25"}},
  {{"id": "usp", "question": "What makes your idea different from existing options?", "placeholder": "e.g. Cheaper, faster delivery, local focus"}},
  {{"id": "revenue", "question": "How do you plan to earn money from this?", "placeholder": "e.g. Subscription, commission, one-time sales"}},
  {{"id": "specific", "question": "A question specific to their business type", "placeholder": "Relevant placeholder"}},
  {{"id": "timeline", "question": "When are you planning to launch and what is your first goal?", "placeholder": "e.g. Launch in 3 months, goal is 1000 customers"}}
]}}

Rules for the questions:
- Question 6 ("specific") MUST be custom-made for their exact business type. Examples: for a food vlog ask "Will you focus on veg, non-veg or both, and which platform will you post on (YouTube/Instagram)?", for a delivery app ask "What delivery radius will you cover and what vehicles will you use?", for a clothing store ask "Will you sell ready-made or custom tailored clothes, and online or physical store?"
- Write each question as a FULL, polite, professional sentence exactly like these examples:
  "What is your estimated budget or investment for this business?"
  "Which state or city are you targeting first?"
  "Who is your primary target audience?"
  "What makes your idea different from existing options in the market?"
  "How do you plan to earn money from this business?"
  "When are you planning to launch and what is your first goal?"
- NEVER write short fragments like "Which city?" or "How earn money?" — always complete sentences
- Placeholders must show realistic Indian examples with INR
Return ONLY valid JSON. No extra text.
"""

def generate_prompt(idea, tone, deck_type, answers=None):
    context = ""
    if answers:
        context = "\n\nUSER'S ANSWERS (you MUST use every one of these in the deck):"
        for q, a in answers.items():
            context += f"\n- {q}: {a}"

    return f"""
You are an expert business consultant and pitch deck creator with 15 years of experience in the Indian startup ecosystem.

Business Idea: {idea}
Tone: {tone}
Deck Type: {deck_type}{context}

CRITICAL RULES — the deck will be REJECTED if any of these are violated:
1. EVERY field in the JSON must be present and non-empty. Never skip a field.
2. Use the user's EXACT budget in financials. If they said 50,000 INR, startup_cost must be at or near 50,000 INR — never 10x more. If their budget is too small for the idea, say so in validation and improvements.
3. Competitors MUST be real, well-known businesses that are CURRENTLY ACTIVE in India in 2026. Never list shut-down or exited companies (e.g. Foodpanda exited India, Burrp shut down — never list such dead companies). If you are not sure a local competitor exists in their exact city, use currently-active national platforms (e.g. Swiggy, Zomato, YouTube creators) and add "local players in [city]" as one competitor.
4. Every number must be realistic for the Indian market and internally consistent (revenue - expenses = profit_loss).
5. Use the user's stated revenue model, USP, audience, timeline and specific answers directly in business_model, go_to_market, solution and target_audience.
6. Market size must be in simple language: "Total potential customers", "Customers you can realistically reach", "Customers you will get in year 1". NO TAM/SAM/SOM jargon.
7. Match the {tone} tone throughout and structure content for a {deck_type} deck.

Generate a detailed business plan in JSON format with exactly these fields:
{{
  "title": "Business name only (short, catchy, no tagline)",
  "tagline": "A short catchy one-liner tagline (max 10 words)",
  "problem": "4-5 specific pain points separated by periods, tailored to the user's location and audience.",
  "solution": "4 key features or benefits separated by periods, directly using the user's USP answer.",
  "target_audience": "Primary and secondary customers with demographics, matching the user's audience and location answers.",
  "market_size": "Total potential customers: [realistic number for their location]. Customers you can realistically reach: [number]. Customers you will get in year 1: [number matching their stated goal]. Simple language only.",
  "business_model": "4-6 revenue streams separated by periods, built around the user's stated revenue model and budget. Include specific INR pricing.",
  "competitors": ["real competitor in their location", "real competitor 2", "real competitor 3"],
  "swot": {{
    "strengths": ["strength based on their USP", "strength 2", "strength 3"],
    "weaknesses": ["honest weakness considering their budget", "weakness 2", "weakness 3"],
    "opportunities": ["opportunity in their location", "opportunity 2", "opportunity 3"],
    "threats": ["threat from the named competitors", "threat 2", "threat 3"]
  }},
  "financials": {{
    "startup_cost": "cost in INR matching the user's stated budget",
    "monthly_revenue": "realistic monthly revenue in INR for month 3-6",
    "monthly_expenses": "realistic monthly expenses in INR",
    "profit_loss": "monthly_revenue minus monthly_expenses in INR",
    "break_even": "realistic break-even timeline given their budget and revenue"
  }},
  "go_to_market": "4-5 sentence launch strategy: Q1 prototype, Q2 pilot in their stated city, Q3 expansion, Q4 scale. Marketing channels must match their audience (e.g. Instagram for students). End with their stated first goal.",
  "call_to_action": "Funding ask in INR based on their budget, with breakdown of what it will be used for.",
  "validation": {{
    "viability_score": "Score out of 10 with one honest sentence explanation",
    "market_readiness": "Score out of 10 with one sentence explanation",
    "competition_level": "Low / Medium / High with one sentence naming their strongest competitor",
    "overall_verdict": "2-3 honest sentences. If budget is unrealistic for the idea, say it here clearly."
  }},
  "improvements": [
    "Improvement for pricing/revenue based on their stated model and budget",
    "Improvement for scalability beyond their first city",
    "Improvement for reaching their specific audience faster",
    "Improvement to defend against the named competitors"
  ],
 "similar_startups": [
    {{"name": "Real Indian startup that is CURRENTLY ACTIVE and successful in 2026 (never dead/exited companies like Foodpanda or Burrp)", "description": "One sentence on what they do and their success", "relevance": "Why relevant to this idea"}},
    {{"name": "Real currently-active startup 2", "description": "One sentence", "relevance": "Why relevant"}},
    {{"name": "Real currently-active startup 3", "description": "One sentence", "relevance": "Why relevant"}}
  ]
}}

Return ONLY valid JSON. No extra text, no markdown, no code blocks.
"""