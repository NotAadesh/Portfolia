from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.portfolio import StockAnalysisRequest
from app.services.market_data import (
    get_cached_companies,
    analyze_stock,
    get_financial_analysis,
    download_statement_csv
)

router = APIRouter()


@router.get("/companies")
def get_companies():
    return get_cached_companies()


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
