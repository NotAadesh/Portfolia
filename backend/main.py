import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import engine, SessionLocal, Base
import app.db.base  # Ensures all models are registered
from app.models.user import User, UserRole

# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.stocks import router as stocks_router
from app.api.v1.portfolio import router as portfolio_router
from app.api.v1.simulation import router as simulation_router
from app.api.v1.admin import router as admin_router
from app.api.v1.ai import router as ai_router
from app.api.v1.lifecycle import router as lifecycle_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # Seed default superadmin if not present
        admin_email = settings.FIRST_SUPERADMIN_EMAIL
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            superadmin = User(
                email=admin_email,
                full_name="Platform Superadmin",
                hashed_password=get_password_hash(settings.FIRST_SUPERADMIN_PASSWORD),
                role=UserRole.SUPERADMIN.value,
                is_active=True,
                is_verified=True
            )
            db.add(superadmin)
            db.commit()
            logger.info(f"Initialized default superadmin: {admin_email}")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# -------------------------------
# CORS Configuration
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Financial AI Agent API Running (Modular Architecture)",
        "version": "2.0.0",
        "docs": "/docs"
    }


# Mount API V1 Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(stocks_router, prefix=settings.API_V1_STR, tags=["Stocks"])
app.include_router(portfolio_router, prefix=settings.API_V1_STR, tags=["Portfolios"])
app.include_router(simulation_router, prefix=settings.API_V1_STR, tags=["Simulations"])
app.include_router(ai_router, prefix=settings.API_V1_STR, tags=["AI Intelligence"])
app.include_router(lifecycle_router, prefix=settings.API_V1_STR, tags=["Lifecycle"])

# Mount Legacy Root Routes for backwards compatibility with existing frontend calls
app.include_router(stocks_router, tags=["Legacy"])
app.include_router(portfolio_router, tags=["Legacy"])
app.include_router(simulation_router, tags=["Legacy"])
app.include_router(ai_router, tags=["Legacy"])
app.include_router(lifecycle_router, tags=["Legacy"])