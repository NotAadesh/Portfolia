from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class UserHolding(Base):
    __tablename__ = "user_holdings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=True)
    
    ticker = Column(String(50), nullable=False, index=True)
    company_name = Column(String(255), nullable=True)
    quantity = Column(Float, nullable=False, default=1.0)
    avg_buy_price = Column(Float, nullable=False)
    buy_date = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    broker = Column(String(50), nullable=False, default="MANUAL")  # ZERODHA, ANGELONE, GROWW, MANUAL
    
    # Live Enrichment Cache
    current_price = Column(Float, nullable=True)
    invested_amount = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    unrealized_pnl = Column(Float, nullable=True)
    unrealized_pnl_percent = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")
    portfolio = relationship("Portfolio", back_populates="holdings")
