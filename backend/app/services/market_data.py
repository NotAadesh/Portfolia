import io
import urllib.request
import pandas as pd
import yfinance as yf
from typing import List, Dict, Any

DEFAULT_COMPANIES = [
    {"name": "Reliance Industries Ltd", "ticker": "RELIANCE.NS"},
    {"name": "Tata Consultancy Services Ltd", "ticker": "TCS.NS"},
    {"name": "Infosys Ltd", "ticker": "INFY.NS"},
    {"name": "HDFC Bank Ltd", "ticker": "HDFCBANK.NS"},
    {"name": "ICICI Bank Ltd", "ticker": "ICICIBANK.NS"},
    {"name": "State Bank of India", "ticker": "SBIN.NS"},
    {"name": "Bharti Airtel Ltd", "ticker": "BHARTIARTL.NS"},
    {"name": "Larsen & Toubro Ltd", "ticker": "LT.NS"},
    {"name": "Hindustan Unilever Ltd", "ticker": "HINDUNILVR.NS"},
    {"name": "ITC Ltd", "ticker": "ITC.NS"},
    {"name": "Kotak Mahindra Bank Ltd", "ticker": "KOTAKBANK.NS"},
    {"name": "Axis Bank Ltd", "ticker": "AXISBANK.NS"},
    {"name": "Bajaj Finance Ltd", "ticker": "BAJFINANCE.NS"},
    {"name": "Asian Paints Ltd", "ticker": "ASIANPAINT.NS"},
    {"name": "Maruti Suzuki India Ltd", "ticker": "MARUTI.NS"},
    {"name": "Sun Pharmaceutical Industries Ltd", "ticker": "SUNPHARMA.NS"},
    {"name": "Titan Company Ltd", "ticker": "TITAN.NS"},
    {"name": "Tata Motors Ltd", "ticker": "TATAMOTORS.NS"},
    {"name": "NTPC Ltd", "ticker": "NTPC.NS"},
    {"name": "Oil & Natural Gas Corporation Ltd", "ticker": "ONGC.NS"},
    {"name": "Power Grid Corporation of India Ltd", "ticker": "POWERGRID.NS"},
    {"name": "Adani Enterprises Ltd", "ticker": "ADANIENT.NS"},
    {"name": "Adani Ports and Special Economic Zone Ltd", "ticker": "ADANIPORTS.NS"},
    {"name": "UltraTech Cement Ltd", "ticker": "ULTRACEMCO.NS"},
    {"name": "Mahindra & Mahindra Ltd", "ticker": "M&M.NS"},
    {"name": "Wipro Ltd", "ticker": "WIPRO.NS"},
    {"name": "HCL Technologies Ltd", "ticker": "HCLTECH.NS"},
    {"name": "Coal India Ltd", "ticker": "COALINDIA.NS"},
    {"name": "Tata Steel Ltd", "ticker": "TATASTEEL.NS"},
    {"name": "Bajaj Finserv Ltd", "ticker": "BAJAJFINSV.NS"},
]

_COMPANIES_CACHE = None


def format_currency(value: float) -> str:
    if not value or value != value:
        return "N/A"
    return f"₹{round(value / 1e5, 2)} L Cr"


def safe_float(value: Any) -> float:
    try:
        if value is None:
            return 0.0
        if value != value:
            return 0.0
        if value == float("inf") or value == float("-inf"):
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def extract_key_metrics(income_stmt, balance_sheet) -> Dict[str, float]:
    def safe_get(df, possible_keys):
        if df is None or df.empty:
            return 0.0
        for key in possible_keys:
            if key in df.index:
                row = df.loc[key]
                if isinstance(row, pd.Series):
                    val = row.iloc[0] if len(row) > 0 else 0
                elif isinstance(row, pd.DataFrame):
                    val = row.iloc[0, 0] if not row.empty else 0
                else:
                    val = row
                return safe_float(val)
        return 0.0

    revenue = safe_get(income_stmt, ["Total Revenue", "TotalRevenue", "Operating Revenue"])
    net_income = safe_get(income_stmt, ["Net Income", "NetIncome", "Net Income Common Stockholders"])
    total_equity = safe_get(balance_sheet, ["Stockholders Equity", "Total Equity", "Total Stockholder Equity", "Common Stock Equity"])

    return {
        "revenue": float(revenue),
        "net_income": float(net_income),
        "equity": float(total_equity),
    }


def get_cached_companies() -> List[Dict[str, str]]:
    global _COMPANIES_CACHE
    if _COMPANIES_CACHE is not None and len(_COMPANIES_CACHE) > 0:
        return _COMPANIES_CACHE

    try:
        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as response:
            df = pd.read_csv(response)

        df = df[["NAME OF COMPANY", "SYMBOL"]].dropna()

        companies = [
            {
                "name": str(row["NAME OF COMPANY"]).strip(),
                "ticker": f"{str(row['SYMBOL']).strip()}.NS"
            }
            for _, row in df.iterrows()
        ]

        top = [
            "RELIANCE", "TCS", "INFY", "HDFCBANK",
            "ICICIBANK", "SBIN", "BHARTIARTL",
            "LT", "HINDUNILVR", "ITC"
        ]

        companies.sort(
            key=lambda x: (x["ticker"].replace(".NS", "") not in top)
        )

        _COMPANIES_CACHE = companies
        return companies
    except Exception:
        _COMPANIES_CACHE = DEFAULT_COMPANIES
        return DEFAULT_COMPANIES


def get_returns(tickers: List[str]) -> pd.DataFrame:
    if isinstance(tickers, str):
        tickers = [tickers]
    tickers = [t.strip() for t in tickers if t and t.strip()]
    if not tickers:
        return pd.DataFrame()

    try:
        data = yf.download(tickers, period="5y", progress=False)
        if data.empty:
            return pd.DataFrame()

        if "Close" in data:
            prices = data["Close"]
        else:
            prices = data

        if isinstance(prices, pd.Series):
            prices = prices.to_frame(name=tickers[0])
        elif len(tickers) == 1 and isinstance(prices, pd.DataFrame) and prices.shape[1] > 1:
            prices = prices.iloc[:, [0]]
            prices.columns = [tickers[0]]

        returns = prices.pct_change(fill_method=None).dropna()
        return returns
    except Exception:
        return pd.DataFrame()


def analyze_stock(ticker: str) -> Dict[str, Any]:
    stock = yf.Ticker(ticker)

    income_stmt = stock.financials
    balance_sheet = stock.balance_sheet

    metrics = extract_key_metrics(income_stmt, balance_sheet)

    revenue = metrics["revenue"]
    net_income = metrics["net_income"]
    roe = net_income / metrics["equity"] if metrics["equity"] else 0

    history = stock.history(period="5y")
    history = history.dropna()

    if history.empty or "Close" not in history:
        raise ValueError(f"No historical price data found for {ticker}")

    prices = [round(p, 2) for p in history["Close"].tolist()]
    dates = history.index.strftime("%Y-%m-%d").tolist()

    return {
        "revenue": format_currency(revenue),
        "net_profit": format_currency(net_income),
        "roe": f"{round(roe * 100, 2)}%",
        "prices": prices,
        "dates": dates,
    }


def get_financial_analysis(ticker: str) -> Dict[str, Any]:
    stock = yf.Ticker(ticker)

    income = stock.financials
    balance = stock.balance_sheet

    if income is None or income.empty:
        raise ValueError(f"No financial statements found for {ticker}")

    def get_series_reversed(df, keys):
        for k in keys:
            if k in df.index:
                return df.loc[k].tolist()[::-1]
        return []

    revenue = get_series_reversed(income, ["Total Revenue", "TotalRevenue", "Operating Revenue"])
    profit = get_series_reversed(income, ["Net Income", "NetIncome", "Net Income Common Stockholders"])

    years = list(income.columns.strftime("%Y"))[::-1] if hasattr(income.columns, 'strftime') else [str(c) for c in income.columns][::-1]

    def get_first_val(df, keys):
        if df is None or df.empty:
            return 0
        for k in keys:
            if k in df.index:
                row = df.loc[k]
                return row.iloc[0] if isinstance(row, pd.Series) else (row.iloc[0, 0] if isinstance(row, pd.DataFrame) else row)
        return 0

    equity = safe_float(get_first_val(balance, ["Stockholders Equity", "Total Equity", "Common Stock Equity"]))
    net_income = safe_float(get_first_val(income, ["Net Income", "NetIncome"]))
    total_assets = safe_float(get_first_val(balance, ["Total Assets", "TotalAssets"]))
    total_rev = safe_float(get_first_val(income, ["Total Revenue", "TotalRevenue"]))

    roe = net_income / equity if equity != 0 else 0
    roa = net_income / total_assets if total_assets != 0 else 0
    margin = net_income / total_rev if total_rev != 0 else 0

    return {
        "years": years,
        "revenue_trend": [safe_float(x) for x in revenue],
        "profit_trend": [safe_float(x) for x in profit],
        "ratios": {
            "roe": round(safe_float(roe) * 100, 2),
            "roa": round(safe_float(roa) * 100, 2),
            "margin": round(safe_float(margin) * 100, 2),
        },
        "insights": [
            "Strong return on equity." if roe > 0.15 else "Low return on equity.",
            "Healthy profit margins." if margin > 0.1 else "Weak profit margins.",
            "Efficient asset usage." if roa > 0.05 else "Low asset efficiency.",
        ],
    }


def download_statement_csv(ticker: str, statement_type: str) -> str:
    stock = yf.Ticker(ticker)
    if statement_type == "income":
        df = stock.financials
    elif statement_type == "balance":
        df = stock.balance_sheet
    elif statement_type == "cashflow":
        df = stock.cashflow
    else:
        raise ValueError("Invalid statement type")

    if df is None or df.empty:
        df = pd.DataFrame({"Message": [f"No statement data available for {ticker}"]})

    stream = io.StringIO()
    df.to_csv(stream)
    return stream.getvalue()
