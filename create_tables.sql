-- =====================================================
-- نظام محمد سالم — إنشاء الجداول الناقصة في Supabase
-- انسخ هذا الكود كاملاً وشغّله في:
-- Supabase Dashboard → SQL Editor → New Query
-- =====================================================

-- جدول السندات (القبض والصرف)
CREATE TABLE IF NOT EXISTS public.vouchers (
  id          text PRIMARY KEY,
  account_id  text,
  type        text NOT NULL DEFAULT 'receipt',  -- 'receipt' قبض | 'payment' صرف
  amount      numeric NOT NULL DEFAULT 0,
  currency    text NOT NULL DEFAULT 'YER',       -- YER | SAR
  reason      text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- جدول الإعدادات
CREATE TABLE IF NOT EXISTS public.settings (
  key         text PRIMARY KEY,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- جدول سجلات الواتساب
CREATE TABLE IF NOT EXISTS public.wa_logs (
  id           text PRIMARY KEY,
  type         text,
  account_name text,
  phone        text,
  message      text,
  sent_at      timestamptz NOT NULL DEFAULT now()
);

-- تفعيل الوصول العام (RLS)
ALTER TABLE public.vouchers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_logs   ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول — اسمح لأي شخص بالقراءة والكتابة (نفس سياسة accounts و transfers)
CREATE POLICY IF NOT EXISTS "allow_all_vouchers"  ON public.vouchers  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "allow_all_settings"  ON public.settings  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "allow_all_wa_logs"   ON public.wa_logs   FOR ALL USING (true) WITH CHECK (true);

-- رسالة تأكيد
SELECT 'تم إنشاء الجداول بنجاح ✅' AS result;
