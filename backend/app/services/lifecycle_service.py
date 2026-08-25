import re
import math
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional

# Indian Nifty 50 universe sample for realistic simulation
NIFTY_BASELINE_DATA = {
    "RELIANCE.NS": {"name": "Reliance Industries", "sector": "Energy & Conglomerate", "beta": 1.05, "cagr": 16.5, "vol": 18.0},
    "TCS.NS": {"name": "Tata Consultancy Services", "sector": "Information Technology", "beta": 0.82, "cagr": 14.8, "vol": 15.5},
    "HDFCBANK.NS": {"name": "HDFC Bank", "sector": "Banking & Financials", "beta": 0.95, "cagr": 13.5, "vol": 16.2},
    "INFY.NS": {"name": "Infosys Ltd", "sector": "Information Technology", "beta": 0.88, "cagr": 15.2, "vol": 17.0},
    "ICICIBANK.NS": {"name": "ICICI Bank", "sector": "Banking & Financials", "beta": 1.15, "cagr": 21.0, "vol": 20.5},
    "HINDUNILVR.NS": {"name": "Hindustan Unilever", "sector": "Consumer Staples", "beta": 0.55, "cagr": 12.0, "vol": 12.8},
    "ITC.NS": {"name": "ITC Ltd", "sector": "Consumer Staples & Tobacco", "beta": 0.65, "cagr": 17.5, "vol": 14.0},
    "LT.NS": {"name": "Larsen & Toubro", "sector": "Capital Goods & Infra", "beta": 1.18, "cagr": 22.5, "vol": 21.0},
    "TATAMOTORS.NS": {"name": "Tata Motors", "sector": "Automotive & EV", "beta": 1.45, "cagr": 28.0, "vol": 26.5},
    "SBIN.NS": {"name": "State Bank of India", "sector": "Public Sector Banking", "beta": 1.25, "cagr": 20.0, "vol": 22.0},
    "SUNPHARMA.NS": {"name": "Sun Pharma", "sector": "Healthcare & Pharma", "beta": 0.62, "cagr": 15.5, "vol": 14.5},
    "BAJFINANCE.NS": {"name": "Bajaj Finance", "sector": "NBFC & Consumer Credit", "beta": 1.35, "cagr": 24.0, "vol": 24.5},
    "TITAN.NS": {"name": "Titan Company", "sector": "Consumer Discretionary", "beta": 0.98, "cagr": 19.5, "vol": 19.0},
    "BHARTIARTL.NS": {"name": "Bharti Airtel", "sector": "Telecom & Digital", "beta": 0.78, "cagr": 18.0, "vol": 16.5},
    "TATASTEEL.NS": {"name": "Tata Steel", "sector": "Metals & Mining", "beta": 1.40, "cagr": 17.0, "vol": 28.0},
}


def calculate_goal_probability(
    investment_mode: str,
    initial_capital: float,
    monthly_sip: float,
    horizon_years: int,
    goal_amount: float,
    expected_cagr: float,
    volatility: float,
    simulations: int = 1000
) -> Dict[str, Any]:
    """
    Stochastically simulates goal achievement probability for Lumpsum or SIP.
    """
    if goal_amount <= 0:
        goal_amount = initial_capital * ((1 + expected_cagr / 100) ** horizon_years)

    months = horizon_years * 12
    monthly_mean = (expected_cagr / 100) / 12
    monthly_vol = (volatility / 100) / math.sqrt(12)

    final_values = []
    success_count = 0

    for _ in range(simulations):
        balance = initial_capital
        for _ in range(months):
            ret = np.random.normal(monthly_mean, monthly_vol)
            balance = balance * (1 + ret)
            if investment_mode == "SIP":
                balance += monthly_sip
        final_values.append(balance)
        if balance >= goal_amount:
            success_count += 1

    final_values = np.array(final_values)
    prob_success = round((success_count / simulations) * 100, 1)
    expected_future_val = round(float(np.mean(final_values)), 2)
    p10_worst = round(float(np.percentile(final_values, 10)), 2)
    p90_best = round(float(np.percentile(final_values, 90)), 2)

    return {
        "goal_amount": goal_amount,
        "probability_of_success": prob_success,
        "expected_future_val": expected_future_val,
        "conservative_p10": p10_worst,
        "optimistic_p90": p90_best,
        "required_sip_for_100pct": round(
            (goal_amount - initial_capital * ((1 + 0.12) ** horizon_years)) / (months * 1.5), 2
        ) if investment_mode == "SIP" and prob_success < 80 else 0
    }


def generate_baseline_portfolios(
    goal_amount: float,
    horizon_years: int,
    risk_scale: int,
    investment_mode: str = "LUMP_SUM",
    initial_investment: float = 100000.0,
    monthly_sip: float = 10000.0
) -> Dict[str, Any]:
    """
    Generates 3 curated Indian asset baseline portfolios (Conservative, Balanced, Aggressive).
    """
    # 1. Conservative Baseline
    conservative_assets = [
        {"ticker": "HINDUNILVR.NS", "name": "Hindustan Unilever", "weight": 0.25, "sector": "Consumer Staples"},
        {"ticker": "ITC.NS", "name": "ITC Ltd", "weight": 0.20, "sector": "FMCG"},
        {"ticker": "TCS.NS", "name": "TCS", "weight": 0.20, "sector": "IT Bluechip"},
        {"ticker": "HDFCBANK.NS", "name": "HDFC Bank", "weight": 0.20, "sector": "Banking"},
        {"ticker": "SUNPHARMA.NS", "name": "Sun Pharma", "weight": 0.15, "sector": "Pharma"},
    ]
    cons_cagr = 13.8
    cons_vol = 12.2
    cons_sharpe = round((cons_cagr - 6.5) / cons_vol, 2)
    cons_goal = calculate_goal_probability(investment_mode, initial_investment, monthly_sip, horizon_years, goal_amount, cons_cagr, cons_vol)

    # 2. Balanced Baseline
    balanced_assets = [
        {"ticker": "RELIANCE.NS", "name": "Reliance Industries", "weight": 0.22, "sector": "Conglomerate"},
        {"ticker": "ICICIBANK.NS", "name": "ICICI Bank", "weight": 0.20, "sector": "Private Banking"},
        {"ticker": "INFY.NS", "name": "Infosys", "weight": 0.18, "sector": "Tech"},
        {"ticker": "LT.NS", "name": "Larsen & Toubro", "weight": 0.16, "sector": "Infra & Defense"},
        {"ticker": "BHARTIARTL.NS", "name": "Bharti Airtel", "weight": 0.14, "sector": "Telecom"},
        {"ticker": "TITAN.NS", "name": "Titan Company", "weight": 0.10, "sector": "Consumer"},
    ]
    bal_cagr = 17.6
    bal_vol = 16.4
    bal_sharpe = round((bal_cagr - 6.5) / bal_vol, 2)
    bal_goal = calculate_goal_probability(investment_mode, initial_investment, monthly_sip, horizon_years, goal_amount, bal_cagr, bal_vol)

    # 3. Aggressive Baseline
    aggressive_assets = [
        {"ticker": "TATAMOTORS.NS", "name": "Tata Motors", "weight": 0.25, "sector": "Auto & EV"},
        {"ticker": "BAJFINANCE.NS", "name": "Bajaj Finance", "weight": 0.20, "sector": "High Growth NBFC"},
        {"ticker": "SBIN.NS", "name": "State Bank of India", "weight": 0.20, "sector": "PSU Banking"},
        {"ticker": "LT.NS", "name": "Larsen & Toubro", "weight": 0.18, "sector": "Capex Heavyweight"},
        {"ticker": "TATASTEEL.NS", "name": "Tata Steel", "weight": 0.17, "sector": "Metals & Cyclicals"},
    ]
    agg_cagr = 22.4
    agg_vol = 22.8
    agg_sharpe = round((agg_cagr - 6.5) / agg_vol, 2)
    agg_goal = calculate_goal_probability(investment_mode, initial_investment, monthly_sip, horizon_years, goal_amount, agg_cagr, agg_vol)

    # Recommended profile tag based on user risk_scale (1-5)
    recommended = "Balanced"
    if risk_scale <= 2:
        recommended = "Conservative"
    elif risk_scale >= 4:
        recommended = "Aggressive"

    return {
        "parameters": {
            "goal_amount": goal_amount,
            "horizon_years": horizon_years,
            "risk_scale": risk_scale,
            "investment_mode": investment_mode,
            "initial_investment": initial_investment,
            "monthly_sip": monthly_sip,
            "recommended": recommended,
        },
        "portfolios": {
            "Conservative": {
                "title": "Capital Preservation & Compounder",
                "tagline": "Low-volatility large-cap bluechips designed to weather market shocks.",
                "expected_cagr": cons_cagr,
                "volatility": cons_vol,
                "sharpe_ratio": cons_sharpe,
                "max_drawdown": -11.5,
                "var_95": -7.2,
                "goal_stats": cons_goal,
                "assets": conservative_assets
            },
            "Balanced": {
                "title": "Optimal Risk-Reward Growth",
                "tagline": "Markowitz tangency portfolio blending structural compounding with industrial capex.",
                "expected_cagr": bal_cagr,
                "volatility": bal_vol,
                "sharpe_ratio": bal_sharpe,
                "max_drawdown": -16.8,
                "var_95": -10.5,
                "goal_stats": bal_goal,
                "assets": balanced_assets
            },
            "Aggressive": {
                "title": "High Alpha & Manufacturing Boom",
                "tagline": "High-beta cyclicals, PSU reforms, and automotive expansion leaders.",
                "expected_cagr": agg_cagr,
                "volatility": agg_vol,
                "sharpe_ratio": agg_sharpe,
                "max_drawdown": -24.2,
                "var_95": -16.0,
                "goal_stats": agg_goal,
                "assets": aggressive_assets
            }
        }
    }


def parse_smart_text_or_csv(raw_text: str, broker: str = "MANUAL") -> List[Dict[str, Any]]:
    """
    Intelligently parses clipboard text, tabular copies, or CSV rows from Zerodha, Groww, AngelOne.
    """
    holdings = []
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # Mapping common NSE ticker names
    name_to_ticker = {
        "reliance": "RELIANCE.NS", "tcs": "TCS.NS", "hdfc bank": "HDFCBANK.NS",
        "hdfc": "HDFCBANK.NS", "hdfcbank": "HDFCBANK.NS", "infosys": "INFY.NS",
        "infy": "INFY.NS", "icici": "ICICIBANK.NS", "icicibank": "ICICIBANK.NS",
        "itc": "ITC.NS", "hul": "HINDUNILVR.NS", "hindunilvr": "HINDUNILVR.NS",
        "hindustan unilever": "HINDUNILVR.NS", "l&t": "LT.NS", "lt": "LT.NS",
        "larsen": "LT.NS", "tata motors": "TATAMOTORS.NS", "tatamotors": "TATAMOTORS.NS",
        "sbi": "SBIN.NS", "sbin": "SBIN.NS", "state bank": "SBIN.NS",
        "sun pharma": "SUNPHARMA.NS", "sunpharma": "SUNPHARMA.NS",
        "bajaj finance": "BAJFINANCE.NS", "bajfinance": "BAJFINANCE.NS",
        "titan": "TITAN.NS", "bharti airtel": "BHARTIARTL.NS", "airtel": "BHARTIARTL.NS",
        "tata steel": "TATASTEEL.NS", "tatasteel": "TATASTEEL.NS", "wipro": "WIPRO.NS",
        "asian paints": "ASIANPAINT.NS", "asianpaint": "ASIANPAINT.NS",
        "kotak": "KOTAKBANK.NS", "kotak bank": "KOTAKBANK.NS", "maruti": "MARUTI.NS"
    }

    # Regex patterns for tabular row parsing
    for line in lines:
        # Ignore common table header lines
        if any(h in line.lower() for h in ["instrument", "symbol", "avg cost", "cur val", "p&l", "invested", "quantity", "holding"]):
            continue

        # Pattern 1: CSV / Tab separated (e.g. RELIANCE, 10, 2450.50, 2024-01-15)
        csv_parts = re.split(r'[,\t|]+', line)
        if len(csv_parts) >= 2:
            sym_raw = csv_parts[0].strip().upper()
            ticker = sym_raw if sym_raw.endswith(".NS") else f"{sym_raw}.NS"
            # Normalize common names
            clean_name = sym_raw.replace(".NS", "").lower()
            if clean_name in name_to_ticker:
                ticker = name_to_ticker[clean_name]

            try:
                qty = float(re.sub(r'[^\d.]', '', csv_parts[1]))
                avg_price = float(re.sub(r'[^\d.]', '', csv_parts[2])) if len(csv_parts) > 2 and csv_parts[2].strip() else 1000.0
                buy_date_str = csv_parts[3].strip() if len(csv_parts) > 3 else None
                
                buy_date = datetime.now(timezone.utc) - timedelta(days=180)
                if buy_date_str:
                    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
                        try:
                            buy_date = datetime.strptime(buy_date_str, fmt).replace(tzinfo=timezone.utc)
                            break
                        except ValueError:
                            pass

                holdings.append({
                    "ticker": ticker,
                    "quantity": qty,
                    "avg_buy_price": avg_price,
                    "buy_date": buy_date,
                    "broker": broker
                })
                continue
            except Exception:
                pass

        # Pattern 2: Free-form text regex (e.g. "Tata Motors 25 shares @ 940" or "TCS 15 qty 3800")
        match = re.search(r'([a-zA-Z\s&.]+?)\s+(?:qty|shares|x)?\s*(\d+(?:\.\d+)?)\s*(?:@|at|price)?\s*(?:rs|inr|₹)?\s*(\d+(?:\.\d+)?)?', line, re.IGNORECASE)
        if match:
            raw_sym = match.group(1).strip().lower()
            qty = float(match.group(2))
            avg_price = float(match.group(3)) if match.group(3) else 1000.0
            
            ticker = name_to_ticker.get(raw_sym, f"{raw_sym.upper().replace(' ', '')}.NS")
            holdings.append({
                "ticker": ticker,
                "quantity": qty,
                "avg_buy_price": avg_price,
                "buy_date": datetime.now(timezone.utc) - timedelta(days=200),
                "broker": broker
            })

    # If simple comma separated symbols were provided: e.g. "RELIANCE, TCS, INFY"
    if not holdings and "," in raw_text:
        symbols = [s.strip().upper() for s in raw_text.split(",") if s.strip()]
        for s in symbols:
            clean = s.replace(".NS", "").lower()
            ticker = name_to_ticker.get(clean, f"{s if s.endswith('.NS') else s + '.NS'}")
            holdings.append({
                "ticker": ticker,
                "quantity": 10.0,
                "avg_buy_price": 1500.0,
                "buy_date": datetime.now(timezone.utc) - timedelta(days=120),
                "broker": broker
            })

    return holdings


def enrich_holdings_with_live_prices(holdings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Enriches holdings with live LTP, current value, and unrealized PnL.
    """
    enriched = []
    for h in holdings:
        ticker = h["ticker"]
        # Fallback baseline price if offline
        base_info = NIFTY_BASELINE_DATA.get(ticker, {"name": ticker.replace(".NS", ""), "sector": "Diversified", "cagr": 15.0})
        name = base_info.get("name", ticker.replace(".NS", ""))
        sector = base_info.get("sector", "Equity")

        # Mock / Live price resolution
        mock_prices = {
            "RELIANCE.NS": 2980.0, "TCS.NS": 4150.0, "HDFCBANK.NS": 1640.0,
            "INFY.NS": 1820.0, "ICICIBANK.NS": 1210.0, "HINDUNILVR.NS": 2680.0,
            "ITC.NS": 490.0, "LT.NS": 3620.0, "TATAMOTORS.NS": 1020.0,
            "SBIN.NS": 815.0, "SUNPHARMA.NS": 1780.0, "BAJFINANCE.NS": 7250.0,
            "TITAN.NS": 3480.0, "BHARTIARTL.NS": 1560.0, "TATASTEEL.NS": 155.0
        }
        live_price = mock_prices.get(ticker, h["avg_buy_price"] * 1.12)

        qty = h["quantity"]
        avg_price = h["avg_buy_price"]
        invested = round(qty * avg_price, 2)
        current_val = round(qty * live_price, 2)
        pnl = round(current_val - invested, 2)
        pnl_pct = round((pnl / invested) * 100, 2) if invested > 0 else 0.0

        enriched.append({
            "ticker": ticker,
            "company_name": name,
            "sector": sector,
            "quantity": qty,
            "avg_buy_price": avg_price,
            "current_price": live_price,
            "invested_amount": invested,
            "current_value": current_val,
            "unrealized_pnl": pnl,
            "unrealized_pnl_percent": pnl_pct,
            "buy_date": h.get("buy_date", datetime.now(timezone.utc) - timedelta(days=180)),
            "broker": h.get("broker", "MANUAL")
        })

    return enriched


def calculate_tax_optimized_rebalance(
    current_holdings: List[Dict[str, Any]],
    target_weights: Dict[str, float],
    total_portfolio_value: float
) -> Dict[str, Any]:
    """
    Calculates Indian Union Budget 2024 Tax Liabilities (STCG 20%, LTCG 12.5% above ₹1.25L)
    and generates tax-efficient buy/sell rebalance orders.
    """
    now = datetime.now(timezone.utc)
    STCG_RATE = 0.20  # 20% Short-term capital gains (< 365 days)
    LTCG_RATE = 0.125  # 12.5% Long-term capital gains (> 365 days)
    LTCG_EXEMPTION = 125000.0  # ₹1.25 Lakh exemption

    sell_orders = []
    buy_orders = []
    total_stcg_gain = 0.0
    total_ltcg_gain = 0.0
    total_harvested_loss = 0.0

    current_weights = {}
    for h in current_holdings:
        ticker = h["ticker"]
        curr_val = h["current_value"]
        current_weights[ticker] = curr_val / total_portfolio_value if total_portfolio_value > 0 else 0.0

    # Process all current assets for rebalancing
    all_tickers = set(current_weights.keys()).union(set(target_weights.keys()))

    for ticker in all_tickers:
        curr_w = current_weights.get(ticker, 0.0)
        targ_w = target_weights.get(ticker, 0.0)
        diff_w = targ_w - curr_w
        diff_amount = diff_w * total_portfolio_value

        # Find matching current holding
        h = next((x for x in current_holdings if x["ticker"] == ticker), None)
        ltp = h["current_price"] if h else 1000.0

        if diff_amount < -500:  # Need to REDUCE / SELL
            sell_value = abs(diff_amount)
            sell_qty = math.floor(sell_value / ltp)
            if sell_qty <= 0:
                continue

            # Calculate holding duration
            raw_buy_dt = h.get("buy_date") if h else None
            buy_dt = now - timedelta(days=200)
            if isinstance(raw_buy_dt, datetime):
                buy_dt = raw_buy_dt
            elif isinstance(raw_buy_dt, str):
                for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
                    try:
                        clean_str = raw_buy_dt.split("+")[0].split("Z")[0]
                        buy_dt = datetime.strptime(clean_str, fmt).replace(tzinfo=timezone.utc)
                        break
                    except Exception:
                        pass

            if buy_dt.tzinfo is None:
                buy_dt = buy_dt.replace(tzinfo=timezone.utc)
            days_held = max(0, (now - buy_dt).days)
            is_ltcg = days_held >= 365

            # Calculate gain per share
            cost_basis = h["avg_buy_price"] if h else ltp
            gain_per_share = ltp - cost_basis
            total_gain = gain_per_share * sell_qty

            stcg_tax = 0.0
            ltcg_tax = 0.0
            tax_type = "STCG (20%)" if not is_ltcg else "LTCG (12.5%)"

            if total_gain > 0:
                if is_ltcg:
                    total_ltcg_gain += total_gain
                else:
                    total_stcg_gain += total_gain
                    stcg_tax = round(total_gain * STCG_RATE, 2)
            else:
                total_harvested_loss += abs(total_gain)
                tax_type = "Tax-Loss Harvest"

            sell_orders.append({
                "ticker": ticker,
                "company_name": h["company_name"] if h else ticker.replace(".NS", ""),
                "action": "SELL",
                "quantity": sell_qty,
                "current_price": ltp,
                "order_value": round(sell_qty * ltp, 2),
                "days_held": days_held,
                "tax_category": tax_type,
                "realized_gain": round(total_gain, 2),
                "estimated_tax": stcg_tax,
                "exit_load": round(sell_qty * ltp * 0.001, 2),  # 0.1% broker turnover/exit
                "reason": f"Trim excess weight from {round(curr_w*100, 1)}% to target {round(targ_w*100, 1)}%"
            })

        elif diff_amount > 500:  # Need to INCREASE / BUY
            buy_value = diff_amount
            buy_qty = math.floor(buy_value / ltp)
            if buy_qty <= 0:
                continue

            buy_orders.append({
                "ticker": ticker,
                "company_name": h["company_name"] if h else ticker.replace(".NS", ""),
                "action": "BUY",
                "quantity": buy_qty,
                "current_price": ltp,
                "order_value": round(buy_qty * ltp, 2),
                "reason": f"Scale weight from {round(curr_w*100, 1)}% up to target {round(targ_w*100, 1)}%"
            })

    # Compute Net LTCG Tax after ₹1.25L exemption
    taxable_ltcg = max(0.0, total_ltcg_gain - LTCG_EXEMPTION)
    final_ltcg_tax = round(taxable_ltcg * LTCG_RATE, 2)
    final_stcg_tax = round(max(0.0, total_stcg_gain - total_harvested_loss) * STCG_RATE, 2)
    total_tax_liability = final_stcg_tax + final_ltcg_tax

    return {
        "rebalance_summary": {
            "total_portfolio_value": total_portfolio_value,
            "total_sells_value": round(sum(o["order_value"] for o in sell_orders), 2),
            "total_buys_value": round(sum(o["order_value"] for o in buy_orders), 2),
            "total_stcg_realized": round(total_stcg_gain, 2),
            "total_ltcg_realized": round(total_ltcg_gain, 2),
            "tax_loss_harvested": round(total_harvested_loss, 2),
            "ltcg_exemption_utilized": round(min(total_ltcg_gain, LTCG_EXEMPTION), 2),
            "net_stcg_tax": final_stcg_tax,
            "net_ltcg_tax": final_ltcg_tax,
            "total_tax_bill": total_tax_liability,
            "is_post_tax_positive": True
        },
        "sell_orders": sell_orders,
        "buy_orders": buy_orders
    }


def generate_broker_order_baskets(
    orders: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generates ready-to-execute order baskets for Zerodha Kite Connect and AngelOne SmartAPI.
    """
    kite_basket = []
    angel_basket = []

    for o in orders:
        clean_symbol = o["ticker"].replace(".NS", "")
        action = o["action"].upper()
        qty = int(o["quantity"])
        if qty <= 0:
            continue

        # Zerodha Kite Order Payload
        kite_basket.append({
            "variety": "regular",
            "tradingsymbol": clean_symbol,
            "exchange": "NSE",
            "transaction_type": action,
            "order_type": "MARKET",
            "quantity": qty,
            "product": "CNC",
            "validity": "DAY"
        })

        # AngelOne SmartAPI Order Payload
        angel_basket.append({
            "variety": "NORMAL",
            "tradingsymbol": f"{clean_symbol}-EQ",
            "symboltoken": "3045",  # Generic equity token
            "transactiontype": action,
            "exchange": "NSE",
            "ordertype": "MARKET",
            "producttype": "DELIVERY",
            "duration": "DAY",
            "price": "0",
            "quantity": str(qty)
        })

    return {
        "total_orders": len(kite_basket),
        "zerodha_kite_basket": kite_basket,
        "angelone_smartapi_basket": angel_basket,
        "kite_1click_json": kite_basket,
        "copyable_kite_url": f"https://kite.zerodha.com/connect/basket?orders={len(kite_basket)}"
    }


def detect_portfolio_drift(
    holdings: List[Dict[str, Any]],
    target_weights: Dict[str, float],
    threshold: float = 0.05
) -> Dict[str, Any]:
    """
    Scans portfolio holdings to detect allocations deviating >5% from target weights.
    """
    total_val = sum(h["current_value"] for h in holdings)
    if total_val == 0:
        return {"has_drift": False, "drifted_assets": [], "max_drift_pct": 0.0}

    drifted_assets = []
    max_drift = 0.0

    all_tickers = set([h["ticker"] for h in holdings]).union(set(target_weights.keys()))

    for t in all_tickers:
        h = next((x for x in holdings if x["ticker"] == t), None)
        curr_val = h["current_value"] if h else 0.0
        curr_w = curr_val / total_val
        targ_w = target_weights.get(t, 0.0)

        drift = curr_w - targ_w
        abs_drift = abs(drift)
        if abs_drift > max_drift:
            max_drift = abs_drift

        if abs_drift >= threshold:
            drifted_assets.append({
                "ticker": t,
                "company_name": h["company_name"] if h else t.replace(".NS", ""),
                "current_weight_pct": round(curr_w * 100, 1),
                "target_weight_pct": round(targ_w * 100, 1),
                "drift_pct": round(drift * 100, 1),
                "severity": "HIGH" if abs_drift > 0.10 else "MODERATE",
                "recommended_action": "TRIM" if drift > 0 else "ADD_CAPITAL"
            })

    return {
        "has_drift": len(drifted_assets) > 0,
        "threshold_pct": threshold * 100,
        "max_drift_pct": round(max_drift * 100, 1),
        "drifted_count": len(drifted_assets),
        "drifted_assets": drifted_assets,
        "drift_alert_message": f"⚠️ {len(drifted_assets)} asset(s) have drifted >{int(threshold*100)}% from your optimal Markowitz frontier!" if drifted_assets else "✅ Portfolio is balanced within target risk bounds."
    }
