import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from app.services.market_data import get_returns
from app.services.optimizer import compute_efficient_frontier

MAX_MONTE_CARLO_SIMULATIONS = 800
MAX_PATHS_TO_RETURN = 30
MAX_FINAL_VALUES_TO_RETURN = 500


def run_monte_carlo_simulation(
    tickers: List[str],
    years: int,
    investment: float,
    expected_return: Optional[float] = None,
    volatility: Optional[float] = None,
    simulations: int = 600,
    weights: Optional[List[float]] = None
) -> Dict[str, Any]:
    years = max(1, years)
    investment = max(100.0, investment)
    simulations = max(100, min(int(simulations or 600), MAX_MONTE_CARLO_SIMULATIONS))

    returns = get_returns(tickers)
    if returns.empty:
        raise ValueError("Unable to fetch historical return series for simulation")

    actual_tickers = list(returns.columns)
    num_assets = len(actual_tickers)

    mean_returns = returns.mean().values
    cov_matrix = returns.cov().values

    frontier_data = compute_efficient_frontier(mean_returns, cov_matrix)

    if weights and len(weights) == num_assets:
        w = np.array(weights, dtype=float)
        if np.sum(w) > 0:
            w = w / np.sum(w)
        else:
            w = np.array([1.0 / num_assets] * num_assets)
    else:
        w = np.array([1.0 / num_assets] * num_assets)

    days = 252 * years

    # Scenario Engine
    if expected_return is not None:
        shock = (float(expected_return) / 100.0) / 252.0
        mean_returns = mean_returns + shock

    if volatility is not None:
        base_vol = np.mean(np.sqrt(np.diag(cov_matrix))) * np.sqrt(252) * 100
        if base_vol > 0:
            vol_multiplier = float(volatility) / base_vol
            cov_matrix = cov_matrix * (vol_multiplier ** 2)

    # Stochastic generation
    simulated_returns = np.random.multivariate_normal(
        mean_returns,
        cov_matrix,
        (simulations, days)
    )

    portfolio_returns = np.dot(simulated_returns, w)
    portfolio_growth = np.cumprod(1 + portfolio_returns, axis=1)
    paths = investment * portfolio_growth

    final_values = paths[:, -1]
    returns_pct = ((final_values - investment) / investment) * 100.0

    expected_value = float(np.mean(final_values))
    best_case = float(np.percentile(final_values, 95))
    worst_case = float(np.percentile(final_values, 5))
    probability_of_loss = float(np.mean(final_values < investment))

    prob_loss_pct = probability_of_loss * 100.0

    if prob_loss_pct > 50:
        risk_level = "Very High Risk"
    elif prob_loss_pct > 30:
        risk_level = "High Risk"
    elif prob_loss_pct > 15:
        risk_level = "Moderate Risk"
    else:
        risk_level = "Low Risk"

    max_drawdown = ((investment - worst_case) / investment) * 100.0
    target = investment * 2.0
    target_probability = float(np.mean(final_values >= target) * 100.0)

    median_value = float(np.median(final_values))
    skewness = expected_value - median_value

    if skewness > 0:
        distribution_view = "Positively skewed (higher upside potential)"
    else:
        distribution_view = "Negatively skewed (higher downside risk)"

    insights = []
    if prob_loss_pct > 40:
        insights.append("High probability of loss — consider reducing exposure to volatile assets")
    if max_drawdown > 30:
        insights.append("Severe downside risk detected — diversification recommended")
    if target_probability < 30:
        insights.append("Low probability of achieving target — consider increasing return-generating assets")
    if best_case / expected_value < 1.2:
        insights.append("Limited upside potential — portfolio may be too conservative")
    if prob_loss_pct < 20 and target_probability > 50:
        insights.append("Well-balanced portfolio with strong risk-return profile")
    if len(insights) == 0:
        insights.append("Portfolio appears stable under current conditions")

    # Improvement Engine
    if prob_loss_pct > 35:
        improvement = {
            "suggested_return": max(8, (expected_return or 12) - 2),
            "suggested_volatility": max(10, (volatility or 20) - 5),
            "reason": "Reduce volatility to lower downside risk"
        }
    elif target_probability < 40:
        improvement = {
            "suggested_return": (expected_return or 12) + 3,
            "suggested_volatility": (volatility or 20) + 2,
            "reason": "Increase return potential to improve goal probability"
        }
    else:
        improvement = {
            "suggested_return": expected_return or 12,
            "suggested_volatility": volatility or 20,
            "reason": "Portfolio already balanced"
        }

    # Alternative Portfolio Benchmark
    diag_cov = np.diag(cov_matrix)
    vol = np.sqrt(np.where(diag_cov > 0, diag_cov, 1e-6))
    inv_vol = 1.0 / vol
    alt_weights = inv_vol / np.sum(inv_vol)

    alt_returns = np.dot(simulated_returns, alt_weights)
    alt_growth = np.cumprod(1 + alt_returns, axis=1)
    alt_paths = investment * alt_growth
    alt_final = alt_paths[:, -1]

    comparison = {
        "expected_value": round(float(np.mean(alt_final)), 2),
        "probability_of_loss": round(float(np.mean(alt_final < investment) * 100.0), 2),
        "weights": alt_weights.tolist()
    }

    # Downsample paths
    sample_paths = paths[:MAX_PATHS_TO_RETURN]
    if days > 80:
        step_indices = np.linspace(0, days - 1, 80, dtype=int)
        sample_paths = sample_paths[:, step_indices]

    return {
        "expected_value": round(expected_value, 2),
        "best_case": round(best_case, 2),
        "worst_case": round(worst_case, 2),
        "probability_of_loss": round(prob_loss_pct, 2),
        "risk_level": risk_level,
        "max_drawdown": round(max_drawdown, 2),
        "target_probability": round(target_probability, 2),
        "distribution": distribution_view,
        "insights": insights,
        "improvement": improvement,
        "comparison": comparison,
        "final_values": [round(float(v), 2) for v in final_values[:MAX_FINAL_VALUES_TO_RETURN]],
        "paths": [[round(float(v), 2) for v in p] for p in sample_paths],
        "returns": [round(float(r), 2) for r in returns_pct[:MAX_FINAL_VALUES_TO_RETURN]],
        "efficient_frontier": frontier_data["frontier"][:300],
        "optimal_weights": frontier_data["optimal_weights"],
    }


def run_backtest(
    tickers: List[str],
    years: int,
    investment: float,
    weights: Optional[List[float]] = None
) -> Dict[str, Any]:
    years = max(1, years)
    investment = max(100.0, investment)

    returns = get_returns(tickers)
    if returns.empty:
        raise ValueError("Unable to fetch historical backtest data")

    actual_tickers = list(returns.columns)
    num_assets = len(actual_tickers)

    if weights and len(weights) == num_assets:
        w = np.array(weights, dtype=float)
        if np.sum(w) > 0:
            w = w / np.sum(w)
        else:
            w = np.array([1.0 / num_assets] * num_assets)
    else:
        w = np.array([1.0 / num_assets] * num_assets)

    days = 252 * years
    returns = returns.tail(days)

    portfolio_returns = returns.values @ w
    cumulative = np.cumprod(1 + portfolio_returns)
    final_value = investment * cumulative[-1]

    total_return = cumulative[-1] - 1.0
    cagr = ((1.0 + total_return) ** (1.0 / years)) - 1.0

    volatility = float(np.std(portfolio_returns) * np.sqrt(252))
    std_ret = np.std(portfolio_returns)
    sharpe = float((np.mean(portfolio_returns) / std_ret) * np.sqrt(252)) if std_ret > 0 else 0.0

    peak = np.maximum.accumulate(cumulative)
    drawdown = (cumulative - peak) / peak
    max_drawdown = float(np.min(drawdown))

    return {
        "final_value": round(float(final_value), 2),
        "cagr": round(float(cagr * 100.0), 2),
        "volatility": round(float(volatility * 100.0), 2),
        "sharpe": round(float(sharpe), 2),
        "max_drawdown": round(float(max_drawdown * 100.0), 2),
    }
