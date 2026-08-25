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
