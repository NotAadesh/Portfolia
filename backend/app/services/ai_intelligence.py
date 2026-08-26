import json
import re
import time
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from app.core.config import settings

# In-memory synthesis cache (15-minute TTL)
_SYNTHESIS_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 900


def _get_gemini_api_keys() -> List[str]:
    keys = []
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        keys.append(settings.GEMINI_API_KEY.strip())
    if settings.GEMINI_FALLBACK_API_KEY and settings.GEMINI_FALLBACK_API_KEY.strip():
        fallback = settings.GEMINI_FALLBACK_API_KEY.strip()
        if fallback not in keys:
            keys.append(fallback)
    return keys


def _init_gemini(api_key: Optional[str] = None):
    key_to_use = api_key or (settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else "")
    if not key_to_use and settings.GEMINI_FALLBACK_API_KEY:
        key_to_use = settings.GEMINI_FALLBACK_API_KEY.strip()
    if key_to_use:
        genai.configure(api_key=key_to_use)
        return True
    return False


def _heuristic_synthesis(
    ticker: str,
    company_name: str,
    fundamentals: Dict[str, Any],
    news: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Intelligent institutional quantitative synthesis when Gemini API key is not configured or offline.
    """
    ratios = fundamentals.get("ratios", {})
    roe = ratios.get("roe", 15.0)
    roa = ratios.get("roa", 8.0)
    margin = ratios.get("margin", 12.0)

    # Sentiment Score Calculation
    score = 0.0
    if roe > 18:
        score += 0.35
    elif roe > 12:
        score += 0.15
    else:
        score -= 0.2

    if margin > 15:
        score += 0.35
    elif margin > 8:
        score += 0.15
    else:
        score -= 0.2

    if roa > 10:
        score += 0.2
    elif roa > 5:
        score += 0.1
    else:
        score -= 0.1

    # News sentiment factor
    news_titles = " ".join([n.get("title", "") for n in news[:5]]).lower()
    if any(w in news_titles for w in ["growth", "record", "profit", "rises", "dividend", "order", "expands", "surges"]):
        score += 0.15
    if any(w in news_titles for w in ["fall", "slumps", "penalty", "loss", "probe", "down", "lawsuit", "decline"]):
        score -= 0.15

    score = max(min(round(score, 2), 0.95), -0.95)

    if score >= 0.5:
        sentiment_label = "Strongly Bullish"
        rating = "Strong Buy"
        conviction = "High"
    elif score >= 0.15:
        sentiment_label = "Moderately Bullish"
        rating = "Accumulate on Dips"
        conviction = "Moderate-High"
    elif score >= -0.15:
        sentiment_label = "Neutral / Hold"
        rating = "Hold"
        conviction = "Moderate"
    elif score >= -0.5:
        sentiment_label = "Cautious"
        rating = "Underweight"
        conviction = "Moderate"
    else:
        sentiment_label = "Bearish"
        rating = "Reduce / Avoid"
        conviction = "High"

    name = company_name if company_name else ticker.replace(".NS", "")

    # Top news highlights
    recent_events = [n.get("title", "") for n in news[:3] if n.get("title")]
    event_context = f" Recent corporate developments like '{recent_events[0]}' indicate active market participation." if recent_events else ""

    summary = (
        f"{name} ({ticker}) exhibits a Return on Equity (ROE) of {roe}% alongside an operating net profit margin of {margin}%. "
        f"The capital efficiency profile demonstrates {'robust institutional fundamentals' if roe > 15 else 'moderate capital compounding'}."
        f"{event_context} The asset turnover and ROA of {roa}% align with the broader sector benchmarks, providing steady downside support."
    )

    catalysts = [
        {
            "title": "Capital Compounding & ROE Strength",
            "description": f"Maintains a high-tier ROE of {roe}%, enabling self-funded operational reinvestment without diluting equity holders.",
            "impact": "High",
        },
        {
            "title": "Margin Expansion & Pricing Power",
            "description": f"Net margins holding steady at {margin}%, reflecting supply chain efficiencies and defendable pricing power.",
            "impact": "Medium",
        },
        {
            "title": "Institutional Flow & Domestic Demand",
            "description": f"Positive market sentiment with expanding institutional allocations in benchmark Indian bluechips.",
            "impact": "High" if score > 0 else "Medium",
        },
    ]

    risks = [
        {
            "title": "Macroeconomic & Interest Rate Sensitivity",
            "description": "Prolonged high interest rates and global liquidity cycles could moderate discretionary expansion multiples.",
            "severity": "Medium",
        },
        {
            "title": "Input Cost Inflation",
            "description": f"Any unexpected spike in operating overhead could exert pressure on current {margin}% profit margins.",
            "severity": "High" if margin < 10 else "Low",
        },
        {
            "title": "Sectoral Valuation Re-rating",
            "description": "High baseline valuation leaves limited room for quarterly earnings execution misses.",
            "severity": "Medium",
        },
    ]

    thesis = (
        f"Our quantitative model assigns a '{rating}' rating on {name} with a 12 to 24-month horizon. "
        f"The risk-reward ratio is tilted favorably due to sustained capital efficiency, provided quarterly margin trajectory remains above {margin * 0.85:.1f}%."
    )

    return {
        "sentiment_score": score,
        "sentiment_label": sentiment_label,
        "sentiment_rationale": f"Calculated based on {roe}% ROE, {margin}% net margin, and recent media catalysts.",
        "executive_summary": summary,
        "growth_catalysts": catalysts,
        "key_risks": risks,
        "analyst_verdict": {
            "rating": rating,
            "target_horizon": "12-24 Months",
            "conviction": conviction,
            "thesis": thesis,
        },
        "suggested_questions": [
            f"What are the major growth catalysts for {name} over the next 3 years?",
            f"How does {name}'s {roe}% ROE compare to other Indian sector leaders?",
            f"What would cause the analyst verdict on {name} to downgrade?",
            f"Explain the recent news headlines for {name}.",
        ],
        "powered_by": "Quantitative Intelligence Engine (Gemini Ready)",
    }


def generate_gemini_financial_synthesis(
    ticker: str,
    company_name: str,
    fundamentals: Dict[str, Any],
    news: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Generates a structured qualitative and quantitative financial intelligence synthesis using Google Gemini.
    """
    cache_key = f"{ticker.upper()}-synthesis"
    now = time.time()
    if cache_key in _SYNTHESIS_CACHE:
        cached = _SYNTHESIS_CACHE[cache_key]
        if now - cached["timestamp"] < CACHE_TTL:
            return cached["data"]

    # Try all configured Gemini keys with automatic failover
    keys = _get_gemini_api_keys()
    for key in keys:
        try:
            genai.configure(api_key=key)
            model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
            model = genai.GenerativeModel(model_name)

            news_snippets = "\n".join([
                f"- [{n.get('publisher', 'Media')}] {n.get('title', '')} ({n.get('relative_time', '')})"
                for n in news[:8]
            ])

            ratios = fundamentals.get("ratios", {})
            years = fundamentals.get("years", [])
            revenue_trend = fundamentals.get("revenue_trend", [])
            profit_trend = fundamentals.get("profit_trend", [])

            prompt = f"""
You are a senior equity research analyst at a top-tier investment bank covering the Indian stock market (NSE / BSE).
Analyze the company '{company_name}' (Ticker: {ticker}) based on the following verified financial data and recent live news.

FINANCIAL METRICS:
- Return on Equity (ROE): {ratios.get('roe', 'N/A')}%
- Return on Assets (ROA): {ratios.get('roa', 'N/A')}%
- Net Profit Margin: {ratios.get('margin', 'N/A')}%
- Historical Fiscal Years: {years}
- Revenue Trend: {revenue_trend}
- Net Profit Trend: {profit_trend}

RECENT LIVE NEWS & CORPORATE ANNOUNCEMENTS:
{news_snippets if news_snippets else "No recent breaking corporate news."}

INSTRUCTIONS:
Provide a rigorous, unbiased, institutional-grade equity research briefing.
You MUST respond with valid, raw JSON only (no markdown code blocks, no backticks, just pure parseable JSON) matching this EXACT schema:
{{
  "sentiment_score": <float between -1.0 and 1.0>,
  "sentiment_label": "<Strongly Bullish | Moderately Bullish | Neutral | Cautious | Bearish>",
  "sentiment_rationale": "<1-sentence summary of why this score was assigned>",
  "executive_summary": "<Comprehensive 2-paragraph analysis covering fundamentals, recent news, and market positioning>",
  "growth_catalysts": [
    {{
      "title": "<Catalyst Title>",
      "description": "<Detailed explanation with specific data points>",
      "impact": "<High | Medium>"
    }},
    {{
      "title": "<Catalyst Title>",
      "description": "<Detailed explanation>",
      "impact": "<High | Medium>"
    }},
    {{
      "title": "<Catalyst Title>",
      "description": "<Detailed explanation>",
      "impact": "<High | Medium>"
    }}
  ],
  "key_risks": [
    {{
      "title": "<Risk Title>",
      "description": "<Specific downside vulnerability>",
      "severity": "<High | Medium | Low>"
    }},
    {{
      "title": "<Risk Title>",
      "description": "<Specific downside vulnerability>",
      "severity": "<High | Medium | Low>"
    }},
    {{
      "title": "<Risk Title>",
      "description": "<Specific downside vulnerability>",
      "severity": "<High | Medium | Low>"
    }}
  ],
  "analyst_verdict": {{
    "rating": "<Strong Buy | Accumulate on Dips | Hold | Underweight | Avoid>",
    "target_horizon": "12-24 Months",
    "conviction": "<High | Moderate-High | Moderate>",
    "thesis": "<Actionable investment thesis concluding with key monitorables>"
  }},
  "suggested_questions": [
    "<Engaging financial question 1>",
    "<Engaging financial question 2>",
    "<Engaging financial question 3>",
    "<Engaging financial question 4>"
  ]
}}
"""
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if match:
                raw_text = match.group(0)

            parsed_data = json.loads(raw_text.strip())
            parsed_data["powered_by"] = f"Google Gemini ({model_name})"

            _SYNTHESIS_CACHE[cache_key] = {
                "timestamp": now,
                "data": parsed_data,
            }
            return parsed_data

        except Exception as e:
            print(f"Gemini API error with key for {ticker}: {e}. Trying fallback key if available.")

    # Fallback to quantitative heuristic synthesis
    fallback_data = _heuristic_synthesis(ticker, company_name, fundamentals, news)
    _SYNTHESIS_CACHE[cache_key] = {
        "timestamp": now,
        "data": fallback_data,
    }
    return fallback_data


def chat_with_financial_copilot(
    ticker: str,
    company_name: str,
    user_question: str,
    fundamentals: Dict[str, Any],
    news: List[Dict[str, Any]],
    conversation_history: List[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Answers investor and analyst questions about the stock using Google Gemini with financial domain grounding.
    """
    ratios = fundamentals.get("ratios", {})
    years = fundamentals.get("years", [])
    rev_trend = fundamentals.get("revenue_trend", [])
    profit_trend = fundamentals.get("profit_trend", [])
    name = company_name if company_name else ticker

    keys = _get_gemini_api_keys()
    for key in keys:
        try:
            genai.configure(api_key=key)
            model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
            model = genai.GenerativeModel(model_name)

            news_snippets = "\n".join([
                f"- [{n.get('publisher', 'Media')}] {n.get('title', '')}"
                for n in news[:6]
            ])

            history_str = ""
            if conversation_history:
                for msg in conversation_history[-6:]:
                    role = "User" if msg.get("role") == "user" else "Copilot"
                    history_str += f"{role}: {msg.get('content', '')}\n"

            system_prompt = f"""
You are the Financial AI Copilot, a helpful, deeply knowledgeable equity research assistant specialized in Indian equities (NSE/BSE).
Current Stock Context:
- Company: {name} ({ticker})
- Return on Equity (ROE): {ratios.get('roe', 'N/A')}%
- Return on Assets (ROA): {ratios.get('roa', 'N/A')}%
- Net Margin: {ratios.get('margin', 'N/A')}%
- Years: {years}
- Revenue Trend: {rev_trend}
- Profit Trend: {profit_trend}

Recent News:
{news_snippets}

Previous Conversation:
{history_str}

User Question: {user_question}

INSTRUCTIONS:
1. Provide a direct, professional, and clear answer grounded in the verified metrics and news above.
2. Use markdown formatting (bolding, bullet points, concise tables where helpful).
3. If the user asks for investment advice, give an objective analytical breakdown and include a standard disclaimer.
4. Keep the answer concise, insightful, and actionable (2-4 paragraphs maximum).
"""
            response = model.generate_content(system_prompt)
            return {
                "response": response.text.strip(),
                "model": f"Google Gemini ({model_name})",
                "ticker": ticker,
            }
        except Exception as e:
            print(f"Gemini Copilot chat error: {e}. Trying fallback key.")

    # Grounded heuristic fallback response
    roe = ratios.get("roe", 15.0)
    margin = ratios.get("margin", 10.0)
    q_lower = user_question.lower()

    if "roe" in q_lower or "return on equity" in q_lower or "dupont" in q_lower:
        ans = (
            f"**{name}'s Return on Equity (ROE) stands at {roe}%.**\n\n"
            f"- **Capital Efficiency**: An ROE of {roe}% indicates that for every ₹100 of shareholders' equity, the company generates ₹{roe:.2f} in net profit.\n"
            f"- **DuPont Breakdown**: This is driven by an operating margin of **{margin}%** and effective asset turnover.\n"
            f"- **Benchmark**: In the Indian market, sustained ROE above 15% is typically considered the threshold for high-quality compounding bluechips."
        )
    elif "risk" in q_lower or "bear" in q_lower or "downside" in q_lower:
        ans = (
            f"**Key Downside Risks for {name} ({ticker}):**\n\n"
            f"1. **Margin Volatility**: Net margins currently sit at **{margin}%**. Any raw material or operational inflation could compress bottom-line growth.\n"
            f"2. **Valuation Sensitivity**: Benchmark multiples leave limited tolerance for quarterly revenue misses.\n"
            f"3. **Macro Interest Rates**: Shifting RBI policy rates impact broader corporate borrowing costs and expansion timelines."
        )
    elif "catalyst" in q_lower or "growth" in q_lower or "bull" in q_lower or "future" in q_lower:
        ans = (
            f"**Key Growth Catalysts for {name} ({ticker}):**\n\n"
            f"1. **Core Market Leadership**: High brand equity and market share in its primary operating segments.\n"
            f"2. **Strong Cash Flow Reinvestment**: With an ROE of **{roe}%**, the firm can self-fund expansion projects without taking on high leverage.\n"
            f"3. **Indian Domestic Demand**: Benefiting from broader domestic capital expenditure cycles and institutional inflows."
        )
    else:
        recent_headline = news[0]["title"] if news else f"Sustained quarterly performance for {name}"
        ans = (
            f"**Financial Analysis Overview for {name} ({ticker}):**\n\n"
            f"- **Return on Equity (ROE)**: **{roe}%**\n"
            f"- **Net Profit Margin**: **{margin}%**\n"
            f"- **Latest Development**: *\"{recent_headline}\"*\n\n"
            f"Overall, {name} demonstrates healthy fundamental strength with solid compounding characteristics. "
            f"Feel free to ask about specific valuation multiples, Dupont breakdown, or risk factors!"
        )

    return {
        "response": ans,
        "model": "Financial AI Assistant",
        "ticker": ticker,
    }


def generate_gemini_portfolio_insights(portfolio_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates multi-asset portfolio optimization intelligence and rebalancing critiques using Google Gemini with multi-key failover.
    """
    tickers = portfolio_data.get("tickers", [])
    optimal_weights = portfolio_data.get("optimal_weights", {})
    exp_return = portfolio_data.get("expected_return", 15.0)
    volatility = portfolio_data.get("volatility", 18.0)
    sharpe = portfolio_data.get("sharpe_ratio", 0.8)
    weak_stocks = portfolio_data.get("weak_stocks", [])
    years = portfolio_data.get("years", 3)
    investment = portfolio_data.get("investment", 100000)

    keys = _get_gemini_api_keys()
    for key in keys:
        try:
            genai.configure(api_key=key)
            model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
            model = genai.GenerativeModel(model_name)

            prompt = f"""
You are a senior quantitative portfolio manager at an institutional asset management firm specializing in Indian equities (NSE/BSE).
Analyze this multi-asset portfolio constructed using Markowitz Modern Portfolio Theory (MPT) and SLSQP optimization:

PORTFOLIO PROFILE:
- Assets: {tickers}
- Markowitz Optimal Weights: {optimal_weights}
- Expected Annualized Return: {exp_return}%
- Portfolio Volatility (Risk): {volatility}%
- Sharpe Ratio: {sharpe}
- Target Horizon: {years} Years
- Initial Capital: ₹{investment}
- Underperforming / Low-Sharpe Assets: {weak_stocks if weak_stocks else "None"}

INSTRUCTIONS:
Provide an institutional portfolio review. For each underperforming asset (if any), diagnose why it is lagging and generate 2-3 superior alternative Indian bluechips to replace it with real fundamental rationale (e.g. ROE, margin trajectory, sector momentum).
You MUST respond with valid, raw JSON only (no markdown code blocks, no backticks, just pure parseable JSON) matching this EXACT schema:
{{
  "diversification_score": <integer from 1 to 100>,
  "diversification_rating": "<Optimal | Well Diversified | Moderately Concentrated | Highly Concentrated>",
  "executive_allocation_summary": "<2-paragraph quantitative critique evaluating asset correlations, risk-return efficiency, and capital compounding potential>",
  "rebalancing_strategy": "<Specific advice on asset weight rebalancing, identifying which positions to trim or expand>",
  "sector_concentration_risks": "<Detailed analysis of sectoral exposures, interest rate sensitivity, and macro vulnerabilities>",
  "actionable_recommendations": [
    "<Concrete action step 1>",
    "<Concrete action step 2>",
    "<Concrete action step 3>"
  ],
  "weak_asset_diagnostics": [
    {{
      "ticker": "<Underperforming Ticker>",
      "why_underperforming": "<Detailed 1-2 sentence fundamental explanation of why this stock is lagging behind the rest of the basket>",
      "suggested_replacements": [
        {{
          "ticker": "<Alternative Ticker e.g. ICICIBANK.NS>",
          "name": "<Company Name e.g. ICICI Bank Ltd>",
          "sharpe": <Estimated Sharpe e.g. 0.98>,
          "rationale": "<High-conviction rationale for why this stock provides superior risk-adjusted return>",
          "catalyst": "<Specific growth driver e.g. Core NIM expansion & corporate capex cycle>"
        }}
      ]
    }}
  ]
}}
"""
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if match:
                raw_text = match.group(0)

            parsed = json.loads(raw_text.strip())
            parsed["powered_by"] = f"Google Gemini ({model_name})"
            return parsed
        except Exception as e:
            print(f"Gemini Portfolio Insights error with key: {e}. Trying fallback key if available.")

    # Heuristic fallback
    num_assets = len(tickers)
    div_score = min(95, max(30, num_assets * 18 + int(sharpe * 20)))
    if div_score >= 80:
        div_rating = "Optimal Diversification"
    elif div_score >= 60:
        div_rating = "Well Diversified"
    else:
        div_rating = "Moderately Concentrated"

    summary = (
        f"This basket of {num_assets} Indian equities delivers an expected annualized return of {exp_return}% with a portfolio volatility of {volatility}%, "
        f"yielding a Sharpe ratio of {sharpe}. The SLSQP quadratic optimizer has weighted high-efficiency assets to maximize the risk-adjusted return across your {years}-year horizon. "
        f"{'Assets like ' + ', '.join(weak_stocks) + ' exhibit lower standalone risk-adjusted returns and warrant periodic tracking.' if weak_stocks else 'All assets contribute positively to the portfolio frontier.'}"
    )

    rebalance = (
        f"Maintain target weights within a ±5% tolerance band. Rebalance semi-annually to harvest volatility gains without incurring excess transaction overhead."
    )

    risks = (
        f"Primary vulnerabilities stem from broader Indian market beta and sector-specific valuation compressions. "
        f"Monitoring corporate earnings delivery and RBI rate trajectory will be critical for sustaining the projected {exp_return}% return."
    )

    recommendations = [
        f"Maintain core allocation in top-weighted assets and review lower-Sharpe holdings ({', '.join(weak_stocks) if weak_stocks else 'bottom holdings'}).",
        f"Implement scheduled semi-annual rebalancing to lock in asset outperformance.",
        f"Consider testing the basket under stress scenarios using the Monte Carlo Simulation engine."
    ]

    # Dynamic fallback diagnostics for weak stocks
    diagnostics = []
    for w in weak_stocks:
        if "HDFC" in w:
            diagnostics.append({
                "ticker": w,
                "why_underperforming": "Constrained by post-merger net interest margin (NIM) dilution and elevated credit-to-deposit ratio pressure.",
                "suggested_replacements": [
                    {
                        "ticker": "ICICIBANK.NS",
                        "name": "ICICI Bank Ltd",
                        "sharpe": 0.98,
                        "rationale": "Superior core operating profitability, expanding ROA (2.3%), and lower asset-quality drag.",
                        "catalyst": "Strong retail loan demand and branch expansion monetization."
                    },
                    {
                        "ticker": "SBIN.NS",
                        "name": "State Bank of India",
                        "sharpe": 0.96,
                        "rationale": "Discounted valuation multiple with dominant public capex underwriting pipeline.",
                        "catalyst": "Corporate loan book re-pricing and low cost-to-income ratio."
                    }
                ]
            })
        elif "TCS" in w or "INFY" in w:
            diagnostics.append({
                "ticker": w,
                "why_underperforming": "Slower discretionary IT budget approvals from global BFSI clients and margin absorption on AI re-skilling.",
                "suggested_replacements": [
                    {
                        "ticker": "LT.NS",
                        "name": "Larsen & Toubro Ltd",
                        "sharpe": 0.95,
                        "rationale": "Strong multi-year order book in domestic infrastructure and Middle East energy capex.",
                        "catalyst": "Government infrastructure spending and private industrial expansion."
                    },
                    {
                        "ticker": "RELIANCE.NS",
                        "name": "Reliance Industries Ltd",
                        "sharpe": 0.92,
                        "rationale": "Diversified cashflow stream spanning retail, telecom tariff monetization, and new green energy.",
                        "catalyst": "ARPU expansion in telecom and 5G enterprise adoption."
                    }
                ]
            })
        else:
            diagnostics.append({
                "ticker": w,
                "why_underperforming": f"{w} exhibits higher localized price volatility and lower return-to-risk efficiency relative to the basket.",
                "suggested_replacements": [
                    {
                        "ticker": "ICICIBANK.NS",
                        "name": "ICICI Bank Ltd",
                        "sharpe": 0.98,
                        "rationale": "Consistently generates superior risk-adjusted returns across market cycles.",
                        "catalyst": "Market share gains in private banking."
                    },
                    {
                        "ticker": "LT.NS",
                        "name": "Larsen & Toubro Ltd",
                        "sharpe": 0.95,
                        "rationale": "High earnings visibility with robust record order backlog.",
                        "catalyst": "Sustained domestic capex cycle."
                    }
                ]
            })

    return {
        "diversification_score": div_score,
        "diversification_rating": div_rating,
        "executive_allocation_summary": summary,
        "rebalancing_strategy": rebalance,
        "sector_concentration_risks": risks,
        "actionable_recommendations": recommendations,
        "weak_asset_diagnostics": diagnostics,
        "powered_by": "Quantitative Allocation Engine",
    }


def generate_gemini_simulation_insights(simulation_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates stochastic Monte Carlo simulation intelligence and tail-risk stress analysis using Google Gemini with multi-key failover.
    """
    tickers = simulation_data.get("tickers", [])
    investment = simulation_data.get("investment", 100000)
    years = simulation_data.get("years", 3)
    exp_val = simulation_data.get("expected_value", investment * 1.5)
    best_case = simulation_data.get("best_case", investment * 2.2)
    worst_case = simulation_data.get("worst_case", investment * 0.8)
    prob_loss = simulation_data.get("probability_of_loss", 15.0)
    max_dd = simulation_data.get("max_drawdown", 25.0)
    target_prob = simulation_data.get("target_probability", 60.0)
    backtest = simulation_data.get("backtest", {})

    keys = _get_gemini_api_keys()
    for key in keys:
        try:
            genai.configure(api_key=key)
            model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
            model = genai.GenerativeModel(model_name)

            prompt = f"""
You are a quantitative risk management director analyzing a multivariate stochastic Monte Carlo simulation on an Indian equity portfolio:

SIMULATION PARAMETERS:
- Assets: {tickers}
- Initial Capital: ₹{investment}
- Horizon: {years} Years
- Expected Future Value: ₹{exp_val}
- 95th Percentile Best Case: ₹{best_case}
- 5th Percentile Worst Case (Tail Risk): ₹{worst_case}
- Probability of Portfolio Loss (VaR): {prob_loss}%
- Maximum Simulated Drawdown: {max_dd}%
- Probability of Doubling Capital (Target): {target_prob}%
- Historical Backtest CAGR: {backtest.get('cagr', 'N/A')}%
- Historical Max Drawdown: {backtest.get('max_drawdown', 'N/A')}%

INSTRUCTIONS:
Provide an institutional stress testing and tail-risk report.
You MUST respond with valid, raw JSON only (no markdown code blocks, no backticks, just pure parseable JSON) matching this EXACT schema:
{{
  "stress_test_verdict": "<Concise rating and summary of risk-return feasibility>",
  "tail_risk_analysis": "<Deep-dive explanation of the 5th percentile worst-case scenario and market conditions that could trigger it>",
  "probability_assessment": "<Realistic probabilistic assessment of capital compounding and achieving the target growth>",
  "risk_mitigation_plan": [
    "<Actionable step 1 to reduce tail-risk>",
    "<Actionable step 2 to improve risk-adjusted Sharpe>",
    "<Actionable step 3 for drawdown protection>"
  ]
}}
"""
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if match:
                raw_text = match.group(0)

            parsed = json.loads(raw_text.strip())
            parsed["powered_by"] = f"Google Gemini ({model_name})"
            return parsed
        except Exception as e:
            print(f"Gemini Simulation Insights error with key: {e}. Trying fallback key if available.")

    # Heuristic fallback
    verdict = (
        f"Moderate Risk Profile with {100 - prob_loss:.1f}% probability of capital preservation over {years} years."
        if prob_loss < 25 else
        f"Elevated Downside Volatility with {prob_loss:.1f}% probability of loss under severe stress conditions."
    )

    tail_risk = (
        f"In the 5th percentile worst-case scenario, the portfolio capital contracts to ₹{worst_case:,.0f} (maximum drawdown of {max_dd}%). "
        f"This scenario reflects a compounding bear market accompanied by domestic earnings contraction or sustained institutional outflows."
    )

    prob_eval = (
        f"The simulation yields an expected future valuation of ₹{exp_val:,.0f} with a {target_prob:.1f}% probability of achieving target 2x capital expansion. "
        f"The upside distribution demonstrates strong right-skewness peaking at ₹{best_case:,.0f} under favorable bull cycles."
    )

    mitigation = [
        f"Implement dynamic stop-loss or systematic profit-taking triggers at 25% run-up intervals.",
        f"Incorporate defensive or low-beta sector allocations to cap maximum drawdown below 20%.",
        f"Utilize staggered dollar-cost averaging (SIP) to smooth out path volatility across the {years}-year horizon."
    ]

    return {
        "stress_test_verdict": verdict,
        "tail_risk_analysis": tail_risk,
        "probability_assessment": prob_eval,
        "risk_mitigation_plan": mitigation,
        "powered_by": "Stochastic Risk Engine",
    }


def generate_gemini_goal_baselines(
    goal_amount: float,
    horizon_years: int,
    risk_scale: int,
    investment_mode: str,
    initial_investment: float,
    monthly_sip: float
) -> Dict[str, Any]:
    """
    Dynamically generates 3 goal-tailored Indian asset baseline allocations using Google Gemini.
    """
    keys = _get_gemini_api_keys()
    candidate_models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    if settings.GEMINI_MODEL and settings.GEMINI_MODEL not in candidate_models:
        candidate_models.insert(0, settings.GEMINI_MODEL)

    for key in keys:
        genai.configure(api_key=key)
        for model_name in candidate_models:
            try:
                model = genai.GenerativeModel(model_name)

                prompt = f"""
You are a senior quantitative wealth advisor specializing in Indian financial planning (NSE equities, Markowitz Modern Portfolio Theory).
Construct 3 customized investment allocations (Conservative, Balanced, Aggressive) specifically designed for this investor's target:

GOAL PARAMETERS:
- Financial Target: ₹{goal_amount:,.0f}
- Horizon: {horizon_years} Years
- User Risk Tolerance (1=Defensive to 5=High Beta): {risk_scale}/5
- Investment Mode: {investment_mode} (SIP: ₹{monthly_sip:,.0f}/mo, Initial Capital: ₹{initial_investment:,.0f})

INSTRUCTIONS:
Select realistic, liquid Indian stock tickers (e.g. RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, ICICIBANK.NS, LT.NS, TATAMOTORS.NS, SBIN.NS, SUNPHARMA.NS, BAJFINANCE.NS, TITAN.NS, ITC.NS, BHARTIARTL.NS, TATASTEEL.NS, MARUTI.NS, etc.).
Ensure weights in each portfolio sum to exactly 1.0 (100%).
You MUST respond with valid, raw JSON only (no markdown code blocks, no backticks) matching this EXACT schema:
{{
  "Conservative": {{
    "title": "<Concise profile title e.g. Capital Preservation & Compounder>",
    "tagline": "<1-sentence strategy description>",
    "expected_cagr": <float e.g. 13.5>,
    "volatility": <float e.g. 12.0>,
    "sharpe_ratio": <float e.g. 0.58>,
    "max_drawdown": <float e.g. -11.5>,
    "var_95": <float e.g. -7.2>,
    "strategy_rationale": "<Detailed explanation of why these specific assets were selected for this goal>",
    "assets": [
      {{"ticker": "TCS.NS", "name": "Tata Consultancy Services", "weight": 0.25, "sector": "IT Bluechip", "rationale": "Resilient free cash flow"}},
      {{"ticker": "HDFCBANK.NS", "name": "HDFC Bank", "weight": 0.25, "sector": "Banking", "rationale": "High tier-1 capital safety"}},
      {{"ticker": "ITC.NS", "name": "ITC Ltd", "weight": 0.25, "sector": "FMCG", "rationale": "Steady dividend yield"}},
      {{"ticker": "SUNPHARMA.NS", "name": "Sun Pharma", "weight": 0.25, "sector": "Healthcare", "rationale": "Defensive pharmaceutical demand"}}
    ]
  }},
  "Balanced": {{
    "title": "<Concise profile title e.g. Optimal Tangency Growth>",
    "tagline": "<1-sentence strategy description>",
    "expected_cagr": <float e.g. 17.5>,
    "volatility": <float e.g. 16.2>,
    "sharpe_ratio": <float e.g. 0.68>,
    "max_drawdown": <float e.g. -16.0>,
    "var_95": <float e.g. -10.2>,
    "strategy_rationale": "<Detailed explanation>",
    "assets": [
      {{"ticker": "RELIANCE.NS", "name": "Reliance Industries", "weight": 0.25, "sector": "Conglomerate", "rationale": "Diversified cash flow"}},
      {{"ticker": "ICICIBANK.NS", "name": "ICICI Bank", "weight": 0.25, "sector": "Private Banking", "rationale": "High operating profitability"}},
      {{"ticker": "LT.NS", "name": "Larsen & Toubro", "weight": 0.25, "sector": "Infra & Capex", "rationale": "Record order book backlog"}},
      {{"ticker": "BHARTIARTL.NS", "name": "Bharti Airtel", "weight": 0.25, "sector": "Telecom", "rationale": "Expanding digital ARPU"}}
    ]
  }},
  "Aggressive": {{
    "title": "<Concise profile title e.g. High-Alpha Cyclicals>",
    "tagline": "<1-sentence strategy description>",
    "expected_cagr": <float e.g. 22.8>,
    "volatility": <float e.g. 23.0>,
    "sharpe_ratio": <float e.g. 0.71>,
    "max_drawdown": <float e.g. -24.5>,
    "var_95": <float e.g. -16.5>,
    "strategy_rationale": "<Detailed explanation>",
    "assets": [
      {{"ticker": "TATAMOTORS.NS", "name": "Tata Motors", "weight": 0.30, "sector": "Automotive & EV", "rationale": "Electric mobility market leadership"}},
      {{"ticker": "BAJFINANCE.NS", "name": "Bajaj Finance", "weight": 0.25, "sector": "Consumer Lending", "rationale": "Omnichannel consumer credit growth"}},
      {{"ticker": "SBIN.NS", "name": "State Bank of India", "weight": 0.25, "sector": "PSU Banking", "rationale": "Corporate capex loan book expansion"}},
      {{"ticker": "TATASTEEL.NS", "name": "Tata Steel", "weight": 0.20, "sector": "Metals", "rationale": "Domestic infrastructure steel demand"}}
    ]
  }}
}}
"""
                response = model.generate_content(prompt)
                raw_text = response.text.strip()
                match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                if match:
                    raw_text = match.group(0)

                parsed = json.loads(raw_text.strip())
                return parsed
            except Exception as e:
                continue

    return {}


def generate_gemini_tax_rebalance_insights(rebalance_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates an institutional AI tax-harvesting and rebalancing critique under Union Budget 2024.
    """
    keys = _get_gemini_api_keys()
    candidate_models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    if settings.GEMINI_MODEL and settings.GEMINI_MODEL not in candidate_models:
        candidate_models.insert(0, settings.GEMINI_MODEL)

    summary = rebalance_data.get("rebalance_summary", {})
    sell_orders = rebalance_data.get("sell_orders", [])
    buy_orders = rebalance_data.get("buy_orders", [])

    for key in keys:
        genai.configure(api_key=key)
        for model_name in candidate_models:
            try:
                model = genai.GenerativeModel(model_name)

                prompt = f"""
You are a senior tax-aware portfolio manager specializing in Indian equity taxation (Union Budget 2024: STCG 20%, LTCG 12.5% with ₹1.25L exemption).
Analyze this portfolio rebalance execution:

REBALANCE METRICS:
- Total Portfolio Value: ₹{summary.get('total_portfolio_value', 0):,.0f}
- Total Trims (Sells): ₹{summary.get('total_sells_value', 0):,.0f} ({len(sell_orders)} orders)
- Total Reallocations (Buys): ₹{summary.get('total_buys_value', 0):,.0f} ({len(buy_orders)} orders)
- STCG Realized: ₹{summary.get('total_stcg_realized', 0):,.0f} (Tax: ₹{summary.get('net_stcg_tax', 0):,.0f})
- LTCG Realized: ₹{summary.get('total_ltcg_realized', 0):,.0f} (Exemption Utilized: ₹{summary.get('ltcg_exemption_utilized', 0):,.0f})
- Tax Loss Harvested Offset: ₹{summary.get('tax_loss_harvested', 0):,.0f}
- Net Tax Liability: ₹{summary.get('total_tax_bill', 0):,.0f}

SELL ORDERS TO TRIM:
{json.dumps(sell_orders[:5], default=str)}

BUY ORDERS TO ALLOCATE:
{json.dumps(buy_orders[:5], default=str)}

INSTRUCTIONS:
Provide an executive tax-efficiency review.
You MUST respond with valid, raw JSON only (no markdown code blocks, no backticks) matching this EXACT schema:
{{
  "tax_efficiency_rating": "<Optimal Tax Efficiency | Highly Efficient | Moderate Tax Drag>",
  "executive_summary": "<2-paragraph analysis detailing why trimming these specific holdings and deploying capital to target assets is post-tax accretive>",
  "harvesting_analysis": "<Specific breakdown of the ₹{summary.get('tax_loss_harvested', 0)} tax-loss harvest and the ₹1.25L LTCG tax-free exemption>",
  "actionable_tax_tips": [
    "<Practical tip 1 e.g. timing of remaining long-term lots>",
    "<Practical tip 2 e.g. setting aside net tax bill amount>",
    "<Practical tip 3 e.g. broker STT and exit load efficiency>"
  ]
}}
"""
                response = model.generate_content(prompt)
                raw_text = response.text.strip()
                match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                if match:
                    raw_text = match.group(0)

                parsed = json.loads(raw_text.strip())
                parsed["powered_by"] = f"Google Gemini ({model_name})"
                return parsed
            except Exception as e:
                continue

    # Heuristic fallback
    harvested = summary.get("tax_loss_harvested", 0)
    tax_bill = summary.get("total_tax_bill", 0)
    ltcg_ex = summary.get("ltcg_exemption_utilized", 0)

    return {
        "tax_efficiency_rating": "Optimal Tax Efficiency",
        "executive_summary": (
            f"This rebalance executes disciplined portfolio trimming of overweight positions while capturing "
            f"₹{ltcg_ex:,.0f} in 100% tax-free long-term gains under the Union Budget 2024 ₹1.25 Lakh exemption. "
            f"By synchronizing sell lots with the SLSQP optimal frontier, the net tax bill of ₹{tax_bill:,.0f} is "
            f"substantially outweighed by the projected risk-adjusted alpha expansion."
        ),
        "harvesting_analysis": (
            f"Harvested ₹{harvested:,.0f} in capital losses to directly offset short-term capital gains at the 20% rate, "
            f"effectively shielding profits from immediate fiscal drag."
        ),
        "actionable_tax_tips": [
            "Execute sell orders before quarterly advance tax due dates to maintain compliant withholding.",
            f"Reinvest released proceeds of ₹{summary.get('total_sells_value', 0):,.0f} in high-conviction tangency assets.",
            "Review holding age dates to ensure future sales qualify for the lower 12.5% LTCG threshold (>365 days)."
        ],
        "powered_by": "Tax Optimization Intelligence",
    }


def generate_gemini_comparison_verdict(comparison_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a qualitative multi-portfolio comparison verdict using Google Gemini.
    """
    keys = _get_gemini_api_keys()
    user_p = comparison_data.get("user_portfolio", {})
    ai_p = comparison_data.get("ai_optimal", {})
    nifty = comparison_data.get("nifty_50_benchmark", {})
    peer = comparison_data.get("peer_portfolio")

    for key in keys:
        try:
            genai.configure(api_key=key)
            model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
            model = genai.GenerativeModel(model_name)

            prompt = f"""
You are an institutional portfolio strategist comparing 3-4 distinct investment portfolios:

1. USER HOLDINGS: CAGR {user_p.get('expected_cagr')}%, Volatility {user_p.get('volatility')}%, Sharpe {user_p.get('sharpe_ratio')}, Max Drawdown {user_p.get('max_drawdown')}%
2. AI MARKOWITZ TANGENCY: CAGR {ai_p.get('expected_cagr')}%, Volatility {ai_p.get('volatility')}%, Sharpe {ai_p.get('sharpe_ratio')}, Max Drawdown {ai_p.get('max_drawdown')}%
3. NIFTY 50 INDEX BENCHMARK: CAGR {nifty.get('expected_cagr')}%, Volatility {nifty.get('volatility')}%, Sharpe {nifty.get('sharpe_ratio')}, Max Drawdown {nifty.get('max_drawdown')}%
{f'4. PEER SHARED PORTFOLIO: CAGR {peer.get("expected_cagr")}%, Volatility {peer.get("volatility")}%, Sharpe {peer.get("sharpe_ratio")}%' if peer else ''}

INSTRUCTIONS:
Provide an institutional comparative verdict.
You MUST respond with valid, raw JSON only (no markdown code blocks, no backticks) matching this EXACT schema:
{{
  "winning_portfolio": "<e.g. AI Optimal Tangency Portfolio>",
  "executive_verdict": "<2-paragraph analysis highlighting the structural return-to-risk advantages, sector diversification, and tail-risk resilience>",
  "key_advantages": [
    "<Specific advantage 1>",
    "<Specific advantage 2>",
    "<Specific advantage 3>"
  ],
  "recommendation": "<Clear guidance for the investor on how to bridge the gap between their current holdings and the optimal frontier>"
}}
"""
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if match:
                raw_text = match.group(0)

            parsed = json.loads(raw_text.strip())
            parsed["powered_by"] = f"Google Gemini ({model_name})"
            return parsed
        except Exception as e:
            print(f"Gemini Comparison Verdict error: {e}.")
            break

    # Heuristic fallback
    return {
        "winning_portfolio": "AI Optimal Tangency Portfolio",
        "executive_verdict": (
            f"The AI Optimal Tangency Portfolio outperforms both current demat holdings (Sharpe {user_p.get('sharpe_ratio')}) "
            f"and the Nifty 50 Index (Sharpe {nifty.get('sharpe_ratio')}) by delivering an expected CAGR of {ai_p.get('expected_cagr')}% "
            f"at a well-contained volatility of {ai_p.get('volatility')}%. By dampening single-stock covariance drag, it provides "
            f"superior downside preservation (-{abs(ai_p.get('max_drawdown', 15.4))}%) during macro drawdowns."
        ),
        "key_advantages": [
            f"Enhanced Sharpe Ratio of {ai_p.get('sharpe_ratio')} (+{round((ai_p.get('sharpe_ratio', 0.74) - user_p.get('sharpe_ratio', 0.52)), 2)} vs Demat)",
            f"Lower Max Drawdown risk ({ai_p.get('max_drawdown')}% vs {user_p.get('max_drawdown')}%)",
            "Optimal cross-sectoral correlation across Indian financial, industrial, and technology leaders"
        ],
        "recommendation": "Rebalance your current demat holdings into tangency frontier weights using the 1-Click Tax Rebalance module to capture this alpha expansion.",
        "powered_by": "Quantitative Benchmark Engine",
    }


def generate_gemini_stock_recommendations(
    current_tickers: List[str],
    goal_type: str = "Growth",
    horizon_years: int = 3
) -> Dict[str, Any]:
    """
    Analyzes current portfolio constituents, identifies sector gaps/synergies, and suggests 3-4 high-conviction Indian equities using Google Gemini.
    """
    keys = _get_gemini_api_keys()
    for key in keys:
        try:
            genai.configure(api_key=key)
            model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
            model = genai.GenerativeModel(model_name)

            prompt = f"""
You are a senior quantitative stock picker covering Indian equities (NSE/BSE).
An investor has the following stocks in their portfolio basket: {current_tickers}
Their primary strategy is '{goal_type}' over a {horizon_years}-year time horizon.

INSTRUCTIONS:
1. Identify the missing sectors, diversification gaps, or high-conviction growth themes not represented in their current basket.
2. Suggest 3 to 4 distinct Indian stocks (NSE tickers ending in .NS e.g. ICICIBANK.NS, LT.NS, TATAMOTORS.NS, SUNPHARMA.NS, BAJFINANCE.NS, TITAN.NS, ITC.NS, BHARTIARTL.NS, TATASTEEL.NS, MARUTI.NS, BEL.NS, NTPC.NS, HAL.NS) that DO NOT already exist in their current basket.
3. For each suggested stock, provide an expected CAGR, Sharpe estimate, key catalyst, and sector synergy rationale.
You MUST respond with valid, raw JSON only (no markdown code blocks, no backticks) matching this EXACT schema:
{{
  "sector_gap_analysis": "<1-2 sentence analysis of what sectors/factors this portfolio is currently missing>",
  "theme": "<Strategic Theme e.g. Capex & High-ROE Compounding>",
  "recommendations": [
    {{
      "ticker": "<NSE Ticker e.g. ICICIBANK.NS>",
      "name": "<Company Name e.g. ICICI Bank Ltd>",
      "sector": "<Sector e.g. Private Banking>",
      "expected_cagr": <float e.g. 19.5>,
      "estimated_sharpe": <float e.g. 0.94>,
      "rationale": "<Why this stock strengthens the portfolio>",
      "catalyst": "<Specific upcoming catalyst e.g. Sustained 18%+ ROE and credit demand>"
    }}
  ]
}}
"""
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if match:
                raw_text = match.group(0)

            parsed = json.loads(raw_text.strip())
            parsed["powered_by"] = f"Google Gemini ({model_name})"
            return parsed
        except Exception as e:
            print(f"Gemini Stock Recommendations error: {e}.")
            break

    # Heuristic fallback
    pool = [
        {"ticker": "ICICIBANK.NS", "name": "ICICI Bank Ltd", "sector": "Private Banking", "expected_cagr": 20.5, "estimated_sharpe": 0.95, "rationale": "Industry-leading ROE (18.5%) and strong net interest margins.", "catalyst": "Private credit growth and digital market share gains."},
        {"ticker": "LT.NS", "name": "Larsen & Toubro Ltd", "sector": "Capital Goods & Defense", "expected_cagr": 21.0, "estimated_sharpe": 0.92, "rationale": "Unrivaled record order backlog spanning domestic infrastructure and Middle East capex.", "catalyst": "Government infrastructure outlays and private capex."},
        {"ticker": "SUNPHARMA.NS", "name": "Sun Pharma Ltd", "sector": "Healthcare & Pharma", "expected_cagr": 16.5, "estimated_sharpe": 0.88, "rationale": "High-margin global specialty pharma portfolio offering defensive stability.", "catalyst": "Global specialty dermatology pipeline monetization."},
        {"ticker": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd", "sector": "Telecom & Digital", "expected_cagr": 18.0, "estimated_sharpe": 0.86, "rationale": "Consistent ARPU expansion and high 5G enterprise adoption.", "catalyst": "Tariff monetization and cloud enterprise services."}
    ]

    filtered_recs = [s for s in pool if s["ticker"] not in current_tickers][:3]
    return {
        "sector_gap_analysis": "Portfolio exhibits concentration in current sectors. Adding diversified bluechips enhances the Sharpe frontier.",
        "theme": "Core Compounding & Industrial Alpha",
        "recommendations": filtered_recs,
        "powered_by": "Quantitative Stock Discovery Engine",
    }


def generate_gemini_compare_portfolios(portfolios: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compares up to 4 user-saved portfolios side-by-side using Google Gemini.
    Provides detailed comparative ranking, macro scenario sensitivities (bull, bear, inflation),
    asset overlap diagnostics, and actionable allocation advice.
    """
    if not portfolios:
        return {
            "winning_portfolio": "None",
            "executive_summary": "No portfolios selected for comparison.",
            "comparative_ranking": [],
            "macro_sensitivities": [],
            "diversification_and_overlaps": "N/A",
            "actionable_recommendations": [],
            "powered_by": "Quantitative Engine",
        }

    keys = _get_gemini_api_keys()
    for key in keys:
        try:
            genai.configure(api_key=key)
            model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
            model = genai.GenerativeModel(model_name)

            portfolios_summary = json.dumps(portfolios, indent=2)

            prompt = f"""
You are a Chief Investment Officer and Quantitative Portfolio Strategist analyzing up to 4 distinct Indian investment portfolios:

PORTFOLIOS TO COMPARE:
{portfolios_summary}

INSTRUCTIONS:
1. Conduct an institutional, side-by-side comparative analysis of these portfolios.
2. Evaluate risk-adjusted return (Sharpe ratio), expected CAGR, volatility, tail-risk (drawdowns), and asset overlap.
3. Identify which portfolio is the overall winner and rank each portfolio from #1 to #{len(portfolios)}.
4. Evaluate how each portfolio is positioned across 3 macroeconomic scenarios: (A) Bull Market Rally, (B) Bear Market / Economic Recession, (C) High Inflation / RBI Rate Hikes.
5. Identify any concentration risks or overlapping securities across the baskets.
6. Provide 3-4 concrete strategic recommendations on how the investor should allocate or blend between these portfolios.

You MUST respond with valid, raw JSON only (no markdown code blocks, no backticks, just pure parseable JSON) matching this EXACT schema:
{{
  "winning_portfolio": "<Name of the top-performing overall portfolio>",
  "executive_summary": "<Comprehensive 2-paragraph analysis evaluating the structural trade-offs, Sharpe efficiencies, and CAGR differences across the selected portfolios>",
  "comparative_ranking": [
    {{
      "rank": 1,
      "portfolio_name": "<Name of #1 portfolio>",
      "score": 94,
      "key_edge": "<1-sentence summary of why this portfolio ranked #1>",
      "best_for": "<Type of investor e.g. Balanced long-term compounders>"
    }},
    {{
      "rank": 2,
      "portfolio_name": "<Name of #2 portfolio>",
      "score": 88,
      "key_edge": "<1-sentence summary of key strength>",
      "best_for": "<Target investor profile>"
    }}
  ],
  "macro_sensitivities": [
    {{
      "scenario": "Bull Market Rally (+20% Nifty Expansion)",
      "top_performing_portfolio": "<Portfolio Name>",
      "analysis": "<Why this portfolio outperforms in aggressive bull runs>"
    }},
    {{
      "scenario": "Market Correction & Bear Drawdown (-15% Crash)",
      "top_performing_portfolio": "<Portfolio Name>",
      "analysis": "<Which portfolio offers the highest downside capital protection>"
    }},
    {{
      "scenario": "High Inflation & Rising Rate Environment",
      "top_performing_portfolio": "<Portfolio Name>",
      "analysis": "<Which portfolio holds the pricing power and low debt necessary to withstand rates>"
    }}
  ],
  "diversification_and_overlaps": "<1-2 paragraph assessment of overlapping stocks, sector concentration, and correlation between the selected portfolios>",
  "actionable_recommendations": [
    "<Concrete action step 1>",
    "<Concrete action step 2>",
    "<Concrete action step 3>"
  ]
}}
"""
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if match:
                raw_text = match.group(0)

            parsed = json.loads(raw_text.strip())
            parsed["powered_by"] = f"Google Gemini ({model_name})"
            return parsed
        except Exception as e:
            print(f"Gemini Multi-Portfolio Comparison error: {e}. Trying fallback.")

    # Quantitative fallback
    sorted_p = sorted(
        portfolios,
        key=lambda p: float(p.get("sharpe_ratio", 0) or 0) * 1.5 + float(p.get("expected_return", 0) or p.get("expected_cagr", 0) or 0) * 0.1,
        reverse=True
    )
    winner = sorted_p[0].get("name", "Top Portfolio")

    ranking = []
    for idx, p in enumerate(sorted_p):
        ranking.append({
            "rank": idx + 1,
            "portfolio_name": p.get("name", f"Portfolio {idx + 1}"),
            "score": max(50, 95 - idx * 8),
            "key_edge": f"Sharpe ratio of {p.get('sharpe_ratio', '0.8')} with {p.get('expected_return', p.get('expected_cagr', 15))}% expected CAGR.",
            "best_for": "Core wealth accumulation and disciplined compounding."
        })

    return {
        "winning_portfolio": winner,
        "executive_summary": (
            f"Comparing {len(portfolios)} portfolios reveals meaningful differences in risk-adjusted capital efficiency. "
            f"'{winner}' ranks highest due to its optimized Sharpe profile and balanced sectoral allocation. "
            f"Lower-volatility portfolios provide defensive drawdown buffers, while higher-growth baskets offer greater compounding potential during bullish momentum."
        ),
        "comparative_ranking": ranking,
        "macro_sensitivities": [
            {
                "scenario": "Bull Market Rally (+20% Nifty Expansion)",
                "top_performing_portfolio": sorted(portfolios, key=lambda x: float(x.get("expected_return", x.get("expected_cagr", 0)) or 0), reverse=True)[0].get("name", winner),
                "analysis": "Maximizes upside capture with higher beta cyclicals and high-CAGR Indian market leaders."
            },
            {
                "scenario": "Market Correction & Bear Drawdown (-15% Crash)",
                "top_performing_portfolio": sorted(portfolios, key=lambda x: float(x.get("volatility", 100) or 100))[0].get("name", winner),
                "analysis": "Exhibits minimum variance and lowest portfolio volatility, preserving capital during market pullbacks."
            },
            {
                "scenario": "High Inflation & Rising Rate Environment",
                "top_performing_portfolio": winner,
                "analysis": "Well-diversified across financial institutions and cash-rich bluechips that benefit from higher yields."
            }
        ],
        "diversification_and_overlaps": "The portfolios exhibit complementary exposures across Indian banking, IT, infrastructure, and consumer goods. Blending high-Sharpe baskets with lower-volatility defensive strategies creates an all-weather portfolio.",
        "actionable_recommendations": [
            f"Adopt '{winner}' as your primary core holding (50-60% allocation).",
            "Allocate 20-30% into your highest-CAGR portfolio during confirmed bull cycles.",
            "Keep the lowest-volatility portfolio as a defensive volatility anchor to protect against market drawdowns."
        ],
        "powered_by": "Quantitative Comparative Engine"
    }



