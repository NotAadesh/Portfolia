from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class StockAnalysisRequest(BaseModel):
    ticker: str


class PortfolioAnalyzeRequest(BaseModel):
    tickers: List[str]
    years: int
    investment: float
    expected_return: Optional[float] = None
    volatility: Optional[float] = None
    simulations: Optional[int] = 600
    weights: Optional[List[float]] = None


class PortfolioAssetCreate(BaseModel):
    ticker: str
    weight: float
    allocation_amount: Optional[float] = None


class PortfolioAssetResponse(BaseModel):
    id: int
    ticker: str
    weight: float
    allocation_amount: Optional[float] = None

    class Config:
        from_attributes = True


class PortfolioSaveRequest(BaseModel):
    name: str
    initial_investment: float
    horizon_years: int
    assets: List[PortfolioAssetCreate]
    expected_return: Optional[float] = None
    volatility: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    notes: Optional[str] = None


class PortfolioResponse(BaseModel):
    id: int
    user_id: int
    name: str
    initial_investment: float
    horizon_years: int
    expected_return: Optional[float] = None
    volatility: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    assets: List[PortfolioAssetResponse] = []

    class Config:
        from_attributes = True
