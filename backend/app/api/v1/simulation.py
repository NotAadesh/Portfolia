from fastapi import APIRouter
from app.schemas.portfolio import PortfolioAnalyzeRequest
from app.services.monte_carlo import run_monte_carlo_simulation, run_backtest

router = APIRouter()


@router.post("/monte-carlo")
def monte_carlo_endpoint(data: PortfolioAnalyzeRequest):
    try:
        return run_monte_carlo_simulation(
            tickers=data.tickers,
            years=data.years,
            investment=data.investment,
            expected_return=data.expected_return,
            volatility=data.volatility,
            simulations=data.simulations or 600,
            weights=data.weights
        )
    except Exception as e:
        return {"error": str(e)}


@router.post("/backtest")
def backtest_endpoint(data: PortfolioAnalyzeRequest):
    try:
        return run_backtest(
            tickers=data.tickers,
            years=data.years,
            investment=data.investment,
            weights=data.weights
        )
    except Exception as e:
        return {"error": str(e)}
