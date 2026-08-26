from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from app.schemas.portfolio import StockAnalysisRequest
from app.services.market_data import (
    get_cached_companies,
    analyze_stock,
    get_financial_analysis,
    download_statement_csv,
    get_batch_quotes,
    get_single_quote
)

router = APIRouter()


class BatchQuotesRequest(BaseModel):
    tickers: List[str]


@router.get("/companies")
def get_companies():
    return get_cached_companies()


@router.post("/quotes")
@router.post("/stocks/quotes")
def fetch_batch_quotes(data: BatchQuotesRequest):
    try:
        return get_batch_quotes(data.tickers)
    except Exception as e:
        return {"error": str(e)}


@router.get("/quote/{ticker}")
@router.get("/stocks/quote/{ticker}")
def fetch_single_quote(ticker: str):
    try:
        return get_single_quote(ticker)
    except Exception as e:
        return {"error": str(e)}


@router.post("/analyze")
def analyze(data: StockAnalysisRequest):
    try:
        return analyze_stock(data.ticker)
    except Exception as e:
        return {"error": str(e)}


@router.post("/financial-analysis")
def financial_analysis(data: StockAnalysisRequest):
    try:
        return get_financial_analysis(data.ticker)
    except Exception as e:
        return {"error": str(e)}


@router.get("/download/{statement_type}/{ticker}")
def download_statement(statement_type: str, ticker: str):
    try:
        csv_data = download_statement_csv(ticker, statement_type)
        response = StreamingResponse(
            iter([csv_data]),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = f"attachment; filename={ticker}_{statement_type}.csv"
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

