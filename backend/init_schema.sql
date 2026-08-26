-- =========================================================
-- Portfolia - Production Supabase PostgreSQL Schema
-- =========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

-- 2. Email Verification OTPs Table
CREATE TABLE IF NOT EXISTS email_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Portfolios Table
CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    initial_investment DOUBLE PRECISION DEFAULT 100000.0 NOT NULL,
    horizon_years INTEGER DEFAULT 3 NOT NULL,
    goal_amount DOUBLE PRECISION,
    risk_scale INTEGER DEFAULT 3 NOT NULL,
    investment_mode VARCHAR(20) DEFAULT 'LUMP_SUM' NOT NULL,
    monthly_sip DOUBLE PRECISION DEFAULT 0.0,
    expected_return DOUBLE PRECISION,
    volatility DOUBLE PRECISION,
    sharpe_ratio DOUBLE PRECISION,
    max_drawdown DOUBLE PRECISION,
    var_95 DOUBLE PRECISION,
    goal_probability DOUBLE PRECISION,
    share_token VARCHAR(32) UNIQUE,
    is_public BOOLEAN DEFAULT FALSE,
    drift_threshold DOUBLE PRECISION DEFAULT 0.05,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_portfolios_share_token ON portfolios(share_token);

-- 4. Portfolio Assets Table
CREATE TABLE IF NOT EXISTS portfolio_assets (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
    ticker VARCHAR(50) NOT NULL,
    weight DOUBLE PRECISION NOT NULL,
    allocation_amount DOUBLE PRECISION
);

-- 5. User Holdings Table
CREATE TABLE IF NOT EXISTS user_holdings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    quantity DOUBLE PRECISION DEFAULT 1.0 NOT NULL,
    avg_buy_price DOUBLE PRECISION NOT NULL,
    buy_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    broker VARCHAR(50) DEFAULT 'MANUAL' NOT NULL,
    current_price DOUBLE PRECISION,
    invested_amount DOUBLE PRECISION,
    current_value DOUBLE PRECISION,
    unrealized_pnl DOUBLE PRECISION,
    unrealized_pnl_percent DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_user_holdings_ticker ON user_holdings(ticker);
