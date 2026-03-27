-- Actualizar tabla google_ads_tokens para soportar múltiples cuentas
-- Primero, crear la tabla nueva con estructura correcta

CREATE TABLE IF NOT EXISTS google_ads_tokens_v2 (
  user_id UUID NOT NULL,
  customer_id VARCHAR NOT NULL,
  customer_display_name VARCHAR,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  manager_account BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMP DEFAULT NOW(),
  last_synced TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, customer_id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabla para almacenar campañas/cuentas de Google Ads
CREATE TABLE IF NOT EXISTS google_ads_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id VARCHAR NOT NULL,
  campaign_id VARCHAR NOT NULL,
  campaign_name VARCHAR,
  status VARCHAR,
  budget DECIMAL(12, 2),
  platform VARCHAR DEFAULT 'google_ads',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, customer_id, campaign_id),
  FOREIGN KEY (user_id, customer_id) REFERENCES google_ads_tokens_v2(user_id, customer_id) ON DELETE CASCADE
);

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_google_ads_tokens_user ON google_ads_tokens_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_accounts_user ON google_ads_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_accounts_customer ON google_ads_accounts(customer_id);

-- Tabla para almacenar datos históricos de campañas de Google Ads
CREATE TABLE IF NOT EXISTS google_ads_daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id VARCHAR NOT NULL,
  campaign_id VARCHAR NOT NULL,
  campaign_name VARCHAR,
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  cost DECIMAL(12, 4) DEFAULT 0,
  conversions DECIMAL(10, 2) DEFAULT 0,
  conversion_value DECIMAL(12, 2) DEFAULT 0,
  ctr DECIMAL(5, 3) DEFAULT 0,
  cpc DECIMAL(10, 4) DEFAULT 0,
  cpm DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, customer_id, campaign_id, date),
  FOREIGN KEY (user_id, customer_id) REFERENCES google_ads_tokens_v2(user_id, customer_id) ON DELETE CASCADE
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_google_ads_daily_metrics_date ON google_ads_daily_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_google_ads_daily_metrics_campaign ON google_ads_daily_metrics(campaign_id);

-- Migrar datos de la tabla antigua si existen
-- Esta parte se ejecuta solo si la tabla antigua existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_ads_tokens') THEN
    INSERT INTO google_ads_tokens_v2 (user_id, customer_id, access_token, refresh_token, token_expires_at, updated_at)
    SELECT user_id, customer_id, access_token, refresh_token, token_expires_at, updated_at
    FROM google_ads_tokens
    ON CONFLICT (user_id, customer_id) DO NOTHING;

    -- Eliminar tabla antigua después de migrar
    -- DROP TABLE google_ads_tokens;
  END IF;
END
$$;

-- Comentarios de tabla
COMMENT ON TABLE google_ads_tokens_v2 IS 'Tokens de OAuth de Google Ads con soporte para múltiples cuentas por usuario';
COMMENT ON TABLE google_ads_accounts IS 'Cuentas y campañas de Google Ads conectadas';
COMMENT ON TABLE google_ads_daily_metrics IS 'Métricas diarias de campañas de Google Ads para histórico y análisis';
