from datetime import datetime, timezone
import secrets
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base


def generate_share_token():
    return secrets.token_urlsafe(8)


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    initial_investment = Column(Float, nullable=False, default=100000.0)
    horizon_years = Column(Integer, nullable=False, default=3)
    
    # Goal Lifecycle Fields
    goal_amount = Column(Float, nullable=True)
    risk_scale = Column(Integer, nullable=False, default=3)  # 1 (Conservative) to 5 (Very Aggressive)
    investment_mode = Column(String(20), nullable=False, default="LUMP_SUM")  # LUMP_SUM or SIP
    monthly_sip = Column(Float, nullable=True, default=0.0)
    
    # Quantitative Risk Metrics
    expected_return = Column(Float, nullable=True)
    volatility = Column(Float, nullable=True)
    sharpe_ratio = Column(Float, nullable=True)
    max_drawdown = Column(Float, nullable=True)
    var_95 = Column(Float, nullable=True)
    goal_probability = Column(Float, nullable=True)
    
    # Sharing & Drift Monitoring
    share_token = Column(String(32), unique=True, index=True, default=generate_share_token)
    is_public = Column(Boolean, default=False)
    drift_threshold = Column(Float, default=0.05)  # 5% drift threshold
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="portfolios")
    assets = relationship("PortfolioAsset", back_populates="portfolio", cascade="all, delete-orphan")
    holdings = relationship("UserHolding", back_populates="portfolio", cascade="all, delete-orphan")


class PortfolioAsset(Base):
    __tablename__ = "portfolio_assets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(50), nullable=False)
    weight = Column(Float, nullable=False)  # e.g., 0.35 for 35%
    allocation_amount = Column(Float, nullable=True)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="assets")
