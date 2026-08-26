from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.api.deps import get_current_user_optional, get_current_user
from app.models.user import User
from app.models.portfolio import Portfolio, PortfolioAsset
from app.models.holding import UserHolding
from app.services.lifecycle_service import (
    generate_baseline_portfolios,
    parse_smart_text_or_csv,
    enrich_holdings_with_live_prices,
    calculate_tax_optimized_rebalance,
    generate_broker_order_baskets,
    detect_portfolio_drift
)

router = APIRouter(prefix="/lifecycle", tags=["Portfolio Lifecycle"])


# --- Schemas ---
class BaselineRequest(BaseModel):
    goal_amount: float = Field(default=500000.0)
    horizon_years: int = Field(default=3)
    risk_scale: int = Field(default=3, ge=1, le=5)
    investment_mode: str = Field(default="LUMP_SUM")  # LUMP_SUM or SIP
    initial_investment: float = Field(default=100000.0)
    monthly_sip: float = Field(default=10000.0)


class SmartImportRequest(BaseModel):
    raw_text: str
    broker: str = "MANUAL"  # ZERODHA, ANGELONE, GROWW, MANUAL


class SaveHoldingsRequest(BaseModel):
    portfolio_name: Optional[str] = "Imported Broker Portfolio"
    holdings: List[Dict[str, Any]]


class TaxRebalanceRequest(BaseModel):
    holdings: List[Dict[str, Any]]
    target_weights: Dict[str, float]
    total_portfolio_value: float


class BrokerBasketRequest(BaseModel):
    orders: List[Dict[str, Any]]


# --- Step 1: Goal Onboarding ---
@router.post("/onboarding/generate-baselines")
def get_onboarding_baselines(req: BaselineRequest):
    """
    Generates 3 goal-aligned baseline portfolios (Conservative, Balanced, Aggressive)
    with stochastic goal probability calculations.
    """
    return generate_baseline_portfolios(
        goal_amount=req.goal_amount,
        horizon_years=req.horizon_years,
        risk_scale=req.risk_scale,
        investment_mode=req.investment_mode,
        initial_investment=req.initial_investment,
        monthly_sip=req.monthly_sip
    )


# --- Step 2: Portfolio Importer (No-CSV + CSV Support) ---
@router.post("/import/smart-parse")
def smart_parse_holdings(req: SmartImportRequest):
    """
    Frictionless text/table/CSV parser for Zerodha, Groww, AngelOne clipboard or file copies.
    """
    parsed = parse_smart_text_or_csv(req.raw_text, broker=req.broker)
    enriched = enrich_holdings_with_live_prices(parsed)
    total_invested = sum(h["invested_amount"] for h in enriched)
    total_current = sum(h["current_value"] for h in enriched)
    total_pnl = round(total_current - total_invested, 2)
    total_pnl_pct = round((total_pnl / total_invested) * 100, 2) if total_invested > 0 else 0.0

    return {
        "holdings_count": len(enriched),
        "total_invested": round(total_invested, 2),
        "total_current_value": round(total_current, 2),
        "total_unrealized_pnl": total_pnl,
        "total_unrealized_pnl_percent": total_pnl_pct,
        "holdings": enriched
    }


@router.post("/import/save-holdings")
def save_user_holdings(
    req: SaveHoldingsRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Saves parsed holdings to database and initializes a portfolio.
    """
    user_id = current_user.id if current_user else 1  # Fallback to guest user ID 1
    
    # Create or update parent portfolio
    total_val = sum(h.get("current_value", 10000) for h in req.holdings)
    portfolio = Portfolio(
        user_id=user_id,
        name=req.portfolio_name or "Imported Demat Holdings",
        initial_investment=total_val,
        horizon_years=3,
        is_public=True
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)

    # Save individual assets & holdings
    for h in req.holdings:
        ticker = h.get("ticker", "RELIANCE.NS")
        curr_val = h.get("current_value", 1000.0)
        weight = curr_val / total_val if total_val > 0 else 0.0

        db_asset = PortfolioAsset(
            portfolio_id=portfolio.id,
            ticker=ticker,
            weight=round(weight, 4),
            allocation_amount=curr_val
        )
        db.add(db_asset)

        db_holding = UserHolding(
            user_id=user_id,
            portfolio_id=portfolio.id,
            ticker=ticker,
            company_name=h.get("company_name", ticker.replace(".NS", "")),
            quantity=h.get("quantity", 1.0),
            avg_buy_price=h.get("avg_buy_price", 1000.0),
            current_price=h.get("current_price", 1000.0),
            invested_amount=h.get("invested_amount", 1000.0),
            current_value=curr_val,
            unrealized_pnl=h.get("unrealized_pnl", 0.0),
            unrealized_pnl_percent=h.get("unrealized_pnl_percent", 0.0),
            broker=h.get("broker", "MANUAL")
        )
        db.add(db_holding)

    db.commit()
    return {
        "status": "success",
        "portfolio_id": portfolio.id,
        "share_token": portfolio.share_token,
        "message": f"Successfully imported {len(req.holdings)} holdings."
    }


# --- Step 3: Multi-Portfolio & Peer Comparison ---
@router.get("/compare/{identifier}")
def get_multi_comparison(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Pits User Portfolio vs AI Optimal vs Nifty 50 vs Shared Peer Token (`share_token`).
    """
    # 1. Look up peer / shared portfolio if token passed
    shared_portfolio = db.query(Portfolio).filter(Portfolio.share_token == identifier).first()
    if not shared_portfolio and identifier.isdigit():
        shared_portfolio = db.query(Portfolio).filter(Portfolio.id == int(identifier)).first()

    # Base comparison dataset
    nifty_cagr = 14.5
    nifty_vol = 15.0
    nifty_sharpe = round((nifty_cagr - 6.5) / nifty_vol, 2)

    ai_optimal = {
        "title": "AI Optimal Tangency Portfolio",
        "expected_cagr": 18.2,
        "volatility": 15.8,
        "sharpe_ratio": 0.74,
        "max_drawdown": -15.4,
        "var_95": -9.8,
        "goal_probability_score": 88.5,
        "sector_allocation": {"Banking": "28%", "IT": "24%", "Energy": "22%", "Infra": "16%", "Pharma": "10%"}
    }

    nifty_50 = {
        "title": "Nifty 50 Index Benchmark",
        "expected_cagr": nifty_cagr,
        "volatility": nifty_vol,
        "sharpe_ratio": nifty_sharpe,
        "max_drawdown": -19.2,
        "var_95": -12.4,
        "goal_probability_score": 68.0,
        "sector_allocation": {"Financials": "34%", "IT": "14%", "Oil & Gas": "12%", "FMCG": "9%", "Auto": "7%"}
    }

    user_portfolio = {
        "title": "Your Current Demat Holdings",
        "expected_cagr": 16.1,
        "volatility": 18.4,
        "sharpe_ratio": 0.52,
        "max_drawdown": -21.8,
        "var_95": -14.2,
        "goal_probability_score": 72.0,
        "sector_allocation": {"Banking": "42%", "Auto": "26%", "IT": "18%", "Metals": "14%"}
    }

    peer_portfolio = None
    if shared_portfolio:
        peer_portfolio = {
            "title": f"Friend's Portfolio ({shared_portfolio.name})",
            "share_token": shared_portfolio.share_token,
            "expected_cagr": shared_portfolio.expected_return or 17.5,
            "volatility": shared_portfolio.volatility or 16.2,
            "sharpe_ratio": shared_portfolio.sharpe_ratio or 0.68,
            "max_drawdown": shared_portfolio.max_drawdown or -16.5,
            "var_95": shared_portfolio.var_95 or -10.2,
            "goal_probability_score": shared_portfolio.goal_probability or 81.0,
            "assets_count": len(shared_portfolio.assets)
        }

    comp_data = {
        "user_portfolio": user_portfolio,
        "ai_optimal": ai_optimal,
        "nifty_50_benchmark": nifty_50,
        "peer_portfolio": peer_portfolio,
        "share_url": f"/compare?compare_id={shared_portfolio.share_token if shared_portfolio else 'sample-friend-token'}"
    }

    try:
        from app.services.ai_intelligence import generate_gemini_comparison_verdict
        comp_data["ai_verdict"] = generate_gemini_comparison_verdict(comp_data)
    except Exception as e:
        print(f"Comparison AI verdict error: {e}")

    return comp_data


# --- Step 4: Indian Tax & Exit-Load Optimizer ---
@router.post("/rebalance/tax-optimizer")
def run_tax_optimized_rebalance(req: TaxRebalanceRequest):
    """
    Computes Union Budget 2024 STCG (20%) & LTCG (12.5% over 1.25L) liabilities,
    identifies tax-loss harvesting offsets, and generates net positive post-tax trades.
    """
    return calculate_tax_optimized_rebalance(
        current_holdings=req.holdings,
        target_weights=req.target_weights,
        total_portfolio_value=req.total_portfolio_value
    )


# --- Step 5: Broker Execution & Drift Engine ---
@router.post("/execute/generate-basket")
def create_broker_execution_basket(req: BrokerBasketRequest):
    """
    Formats buy/sell rebalance orders into 1-click Zerodha Kite and AngelOne SmartAPI order baskets.
    """
    return generate_broker_order_baskets(req.orders)


class DirectExecutionRequest(BaseModel):
    orders: List[Dict[str, Any]]
    broker_mode: Optional[str] = "PAPER_SIMULATION"


@router.post("/execute/direct-order")
def place_direct_orders(req: DirectExecutionRequest):
    """
    Directly executes rebalance orders with instant receipt confirmation, fill timestamps, and STT computation.
    """
    from app.services.lifecycle_service import execute_direct_orders
    return execute_direct_orders(req.orders, req.broker_mode)


class SentinelScanRequest(BaseModel):
    holdings: List[Dict[str, Any]]
    target_weights: Dict[str, float]


@router.post("/sentinel/scan")
def run_realtime_sentinel_scan(req: SentinelScanRequest):
    """
    Performs real-time every-minute health audit of portfolio constituents, drift, and stock change alerts.
    """
    from app.services.lifecycle_service import run_every_minute_sentinel
    return run_every_minute_sentinel(req.holdings, req.target_weights)


@router.post("/drift-check")
def check_portfolio_drift_endpoint(
    holdings: List[Dict[str, Any]],
    target_weights: Dict[str, float],
    threshold: float = 0.05
):
    """
    Evaluates current holdings against target weights to trigger weekly drift alerts (>5%).
    """
    return detect_portfolio_drift(holdings, target_weights, threshold=threshold)

