-- ===== نظام محمد سالم - مخطط قاعدة البيانات الكاملة =====
-- Complete Database Schema with Row Level Security (RLS)

-- ===== 1. جدول الحسابات (Accounts) =====
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  balance BIGINT DEFAULT 0,
  balance_sar BIGINT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- active, late, vip, archived
  notes TEXT DEFAULT '',
  total_deposits BIGINT DEFAULT 0,
  total_withdrawals BIGINT DEFAULT 0,
  total_profit BIGINT DEFAULT 0,
  last_transaction_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_all_access" ON accounts FOR ALL USING (true) WITH CHECK (true);

-- ===== 2. جدول الحوالات (Transfers) =====
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_code VARCHAR(50) UNIQUE NOT NULL,
  beneficiary VARCHAR(255) NOT NULL,
  beneficiary_phone VARCHAR(20),
  beneficiary_id UUID REFERENCES accounts(id),
  amount BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'YER',
  commission BIGINT DEFAULT 0,
  profit BIGINT DEFAULT 0,
  total BIGINT DEFAULT 0,
  exchange_rate NUMERIC(10,4) DEFAULT 1.0,
  buy_price NUMERIC(10,4),
  sell_price NUMERIC(10,4),
  transfer_type VARCHAR(100) DEFAULT 'تحويل عادي',
  payment_method VARCHAR(50) DEFAULT 'cash', -- cash, balance, debt
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, cancelled
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers_all_access" ON transfers FOR ALL USING (true) WITH CHECK (true);

-- ===== 3. جدول الأرباح (Profits) =====
CREATE TABLE IF NOT EXISTS profits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID REFERENCES transfers(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  amount BIGINT NOT NULL,
  profit BIGINT NOT NULL,
  profit_currency VARCHAR(10) DEFAULT 'YER',
  exchange_rate NUMERIC(10,4) DEFAULT 1.0,
  profit_type VARCHAR(50) DEFAULT 'transfer', -- transfer, fee, adjustment
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE profits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profits_all_access" ON profits FOR ALL USING (true) WITH CHECK (true);

-- ===== 4. جدول سندات القبض والصرف (Vouchers) =====
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  voucher_number VARCHAR(50) UNIQUE,
  type VARCHAR(50) NOT NULL, -- receipt, payment
  amount BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'YER',
  reason TEXT,
  reference_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vouchers_all_access" ON vouchers FOR ALL USING (true) WITH CHECK (true);

-- ===== 5. جدول السجل النشاط (Activity Logs) =====
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50), -- accounts, transfers, vouchers, etc
  entity_id UUID,
  user_action VARCHAR(50), -- create, update, delete
  details JSONB,
  ip_address VARCHAR(50),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_all_access" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

-- ===== 6. جدول سجل الواتساب (WhatsApp Logs) =====
CREATE TABLE IF NOT EXISTS wa_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100),
  account_name VARCHAR(255),
  phone VARCHAR(20),
  message TEXT,
  status VARCHAR(50) DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE wa_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_logs_all_access" ON wa_logs FOR ALL USING (true) WITH CHECK (true);

-- ===== 7. جدول الإعدادات (Settings) =====
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_all_access" ON settings FOR ALL USING (true) WITH CHECK (true);

-- ===== Views (المنظرات) =====

-- منظر إحصاءات اليوم
CREATE OR REPLACE VIEW today_stats AS
SELECT
  COUNT(DISTINCT transfers.id) FILTER (WHERE transfers.status = 'completed') as completed_today,
  COUNT(DISTINCT transfers.id) FILTER (WHERE transfers.status = 'pending') as pending_today,
  COALESCE(SUM(transfers.commission) FILTER (WHERE transfers.status = 'completed'), 0) as profit_today,
  COUNT(DISTINCT accounts.id) FILTER (WHERE accounts.status = 'late') as late_accounts
FROM transfers
LEFT JOIN accounts ON accounts.id = transfers.beneficiary_id
WHERE DATE(transfers.created_at) = CURRENT_DATE;

-- منظر إحصاءات الأسبوع
CREATE OR REPLACE VIEW week_stats AS
SELECT
  DATE_TRUNC('day', transfers.created_at)::DATE as day,
  COUNT(DISTINCT transfers.id) as transfer_count,
  COALESCE(SUM(transfers.amount), 0) as total_amount,
  COALESCE(SUM(transfers.commission), 0) as total_profit
FROM transfers
WHERE transfers.created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', transfers.created_at)
ORDER BY day DESC;

-- منظر الحسابات المتأخرة
CREATE OR REPLACE VIEW overdue_accounts AS
SELECT
  accounts.*,
  COUNT(DISTINCT transfers.id) as transfer_count,
  COALESCE(SUM(transfers.commission), 0) as total_profit
FROM accounts
LEFT JOIN transfers ON transfers.beneficiary_id = accounts.id
WHERE accounts.status = 'late'
GROUP BY accounts.id
ORDER BY accounts.created_at DESC;

-- منظر تقرير الأرباح
CREATE OR REPLACE VIEW profit_report AS
SELECT
  DATE_TRUNC('day', profits.created_at)::DATE as day,
  COUNT(DISTINCT profits.id) as transaction_count,
  SUM(profits.profit) FILTER (WHERE profits.profit_currency = 'YER') as profit_yer,
  SUM(profits.profit) FILTER (WHERE profits.profit_currency = 'SAR') as profit_sar,
  COUNT(DISTINCT profits.account_id) as unique_accounts
FROM profits
GROUP BY DATE_TRUNC('day', profits.created_at)
ORDER BY day DESC;

-- ===== Indexes (الفهارس) =====
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_created ON accounts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_code ON transfers(transfer_code);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_beneficiary ON transfers(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profits_transfer ON profits(transfer_id);
CREATE INDEX IF NOT EXISTS idx_profits_account ON profits(account_id);
CREATE INDEX IF NOT EXISTS idx_profits_created ON profits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vouchers_account ON vouchers(account_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_created ON vouchers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_entity ON activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at DESC);

-- ===== Functions (الدوال) =====

-- دالة لحساب الرصيد النهائي
CREATE OR REPLACE FUNCTION calculate_account_balance(account_id UUID)
RETURNS BIGINT AS $$
DECLARE
  deposits BIGINT;
  withdrawals BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO deposits
  FROM vouchers
  WHERE account_id = $1 AND type = 'receipt';

  SELECT COALESCE(SUM(amount), 0) INTO withdrawals
  FROM vouchers
  WHERE account_id = $1 AND type = 'payment';

  RETURN deposits - withdrawals;
END;
$$ LANGUAGE plpgsql;

-- دالة لحساب إجمالي الأرباح
CREATE OR REPLACE FUNCTION calculate_total_profit(account_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(profit)
    FROM profits
    WHERE account_id = $1 AND profit_currency = 'YER'
  ), 0);
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث إحصاءات الحساب
CREATE OR REPLACE FUNCTION update_account_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    UPDATE accounts
    SET updated_at = NOW(),
        last_transaction_date = NOW()
    WHERE id = COALESCE(NEW.beneficiary_id, OLD.beneficiary_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ===== Triggers (المحفزات) =====

-- محفز لتحديث الحسابات عند الحوالات
CREATE TRIGGER transfer_update_account_stats
AFTER INSERT OR DELETE ON transfers
FOR EACH ROW
EXECUTE FUNCTION update_account_stats();

-- محفز لتسجيل النشاط
CREATE OR REPLACE TRIGGER log_account_changes
AFTER INSERT OR UPDATE OR DELETE ON accounts
FOR EACH ROW
EXECUTE FUNCTION log_activity();

CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (action, entity_type, entity_id, user_action, details)
  VALUES (
    TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ===== البيانات الافتراضية =====
INSERT INTO accounts (name, phone, balance, status, notes)
VALUES
  ('أحمد محمد الوادعي', '967712345678', 850000, 'active', 'عميل منتظم'),
  ('خالد سالم العمري', '967798765432', 1200000, 'active', 'VIP'),
  ('محمد علي الشمري', '967733445566', 320000, 'late', 'متأخر 7 أيام'),
  ('عبد الرحمن عقلان', '967755667788', 2500000, 'vip', 'VIP كبير'),
  ('سالم القحطاني', '967722334455', 650000, 'late', 'متأخر 5 أيام'),
  ('فهد ناصر المالكي', '967788990011', 480000, 'active', '')
ON CONFLICT DO NOTHING;

-- ===== تفعيل Realtime =====
-- لتفعيل Realtime على كل جدول:
-- 1. اذهب إلى Supabase Console
-- 2. انقر على Replication في القائمة اليسرى
-- 3. فعّل Realtime للجداول:
--    - accounts
--    - transfers
--    - profits
--    - vouchers
--    - activity_logs
--    - wa_logs
