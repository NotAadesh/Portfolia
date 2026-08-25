from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from pydantic import BaseModel

import app.db.base
from app.db.session import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.portfolio import Portfolio, PortfolioAsset
from app.schemas.portfolio import (
    PortfolioAnalyzeRequest,
    PortfolioSaveRequest,
    PortfolioResponse
)
from app.services.optimizer import analyze_portfolio

router = APIRouter()


class PortfolioUserSummary(BaseModel):
    total_portfolios: int
    total_capital_invested: float
    average_horizon_years: float
    top_holdings: List[Dict[str, Any]]


@router.post("/portfolio-analyze")
def run_portfolio_analysis(data: PortfolioAnalyzeRequest):
    try:
        return analyze_portfolio(
            tickers=data.tickers,
            years=data.years,
            investment=data.investment
        )
    except Exception as e:
        return {"error": str(e)}


@router.get("/portfolios/summary", response_model=PortfolioUserSummary)
def get_user_portfolio_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    user_portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()
    count = len(user_portfolios)
    if count == 0:
        return {
            "total_portfolios": 0,
            "total_capital_invested": 0.0,
            "average_horizon_years": 0.0,
            "top_holdings": []
        }

    total_capital = sum(p.initial_investment for p in user_portfolios)
    avg_horizon = sum(p.horizon_years for p in user_portfolios) / count

    # Aggregate asset weights
    portfolio_ids = [p.id for p in user_portfolios]
    assets = db.query(
        PortfolioAsset.ticker,
        func.count(PortfolioAsset.id).label("count"),
        func.sum(PortfolioAsset.allocation_amount).label("total_allocated")
    ).filter(PortfolioAsset.portfolio_id.in_(portfolio_ids)).group_by(PortfolioAsset.ticker).order_by(func.sum(PortfolioAsset.allocation_amount).desc()).limit(8).all()

    top_holdings = [
        {
            "ticker": a[0],
            "count": a[1],
            "total_allocated": round(float(a[2] or 0), 2)
        }
        for a in assets
    ]

    return {
        "total_portfolios": count,
        "total_capital_invested": round(float(total_capital), 2),
        "average_horizon_years": round(float(avg_horizon), 1),
        "top_holdings": top_holdings
    }


@router.post("/portfolios", response_model=PortfolioResponse)
def save_portfolio(
    data: PortfolioSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    portfolio = Portfolio(
        user_id=current_user.id,
        name=data.name,
        initial_investment=data.initial_investment,
        horizon_years=data.horizon_years,
        expected_return=data.expected_return,
        volatility=data.volatility,
        sharpe_ratio=data.sharpe_ratio,
        notes=data.notes
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)

    for asset_data in data.assets:
        asset = PortfolioAsset(
            portfolio_id=portfolio.id,
            ticker=asset_data.ticker,
            weight=asset_data.weight,
            allocation_amount=asset_data.allocation_amount or (data.initial_investment * asset_data.weight)
        )
        db.add(asset)
    
    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.get("/portfolios", response_model=List[PortfolioResponse])
def get_user_portfolios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).order_by(Portfolio.created_at.desc()).all()
    return portfolios


@router.get("/portfolios/{portfolio_id}", response_model=PortfolioResponse)
def get_single_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")
    return portfolio


@router.delete("/portfolios/{portfolio_id}")
def delete_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")
    
    db.delete(portfolio)
    db.commit()
    return {"message": "Portfolio deleted successfully", "id": portfolio_id}
