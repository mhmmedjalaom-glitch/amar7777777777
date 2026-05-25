/**
 * ⚙️ إعدادات Supabase للنظام السحابي الكامل
 * - جميع البيانات تحفظ في Supabase مباشرة
 * - المزامنة اللحظية Realtime مفعلة
 * - دعم Offline-First مع المزامنة التلقائية
 */

// ✅ تثبيت supabase-js
// npm install @supabase/supabase-js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// 🔐 بيانات Supabase (استبدل بـ بيانات مشروعك)
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// ✅ إنشاء عميل Supabase مع تفعيل Realtime
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * 📊 جداول Supabase المطلوبة:
 * 
 * 1️⃣ accounts - الحسابات
 * Columns: id, name, phone, balance, debt, deposits, withdrawals, notes, createdAt, updatedAt
 * 
 * 2️⃣ transfers - الحوالات
 * Columns: id, transferNumber, accountId, beneficiary, amount, currency, exchangeRate, status, profit, notes, createdAt, updatedAt
 * 
 * 3️⃣ profits - الأرباح
 * Columns: id, transferId, accountId, profitAmount, currency, profitDate, notes, createdAt
 * 
 * 4️⃣ activity_logs - سجل النشاط
 * Columns: id, action, accountId, transferId, details, timestamp
 */

/**
 * 🔐 إعدادات Row Level Security (RLS)
 * 
 * ✅ في Supabase Dashboard:
 * 1. اذهب إلى Database > RLS Policies
 * 2. فعّل RLS لكل جدول
 * 3. أضف السياسات:
 */

export const RLSPolicies = {
  // ✅ السماح بالقراءة العامة للجميع
  selectAll: `
    CREATE POLICY "Allow select all" ON accounts
    FOR SELECT USING (true);
  `,
  
  // ✅ السماح بالإدراج للجميع
  insertAll: `
    CREATE POLICY "Allow insert all" ON accounts
    FOR INSERT WITH CHECK (true);
  `,
  
  // ✅ السماح بالتحديث للجميع
  updateAll: `
    CREATE POLICY "Allow update all" ON accounts
    FOR UPDATE USING (true) WITH CHECK (true);
  `,
  
  // ✅ السماح بالحذف للجميع
  deleteAll: `
    CREATE POLICY "Allow delete all" ON accounts
    FOR DELETE USING (true);
  `
};

/**
 * 🚀 Proxy API للعمل في اليمن (إذا كانت Supabase محجوبة)
 * استخدم Edge Functions من Supabase أو Cloudflare
 */
export const ENABLE_PROXY = false; // غيّر إلى true إذا كانت Supabase محجوبة
export const PROXY_URL = 'https://your-proxy.workers.dev';

/**
 * 💾 Offline-First Configuration
 * - تخزين مؤقت محلي عند انقطاع الإنترنت
 * - مزامنة تلقائية عند العودة للإنترنت
 */
export const OFFLINE_FIRST_CONFIG = {
  enableOfflineSupport: true,
  maxCacheTime: 24 * 60 * 60 * 1000, // 24 ساعة
  autoSyncInterval: 5000, // 5 ثواني
  conflictResolution: 'last-write-wins' // آخر تعديل يفوز
};

/**
 * 🌍 إعدادات المتوافقية مع اليمن
 */
export const YEMEN_CONFIG = {
  currencies: ['YER', 'SAR'], // الريال اليمني والسعودي
  defaultCurrency: 'YER',
  exchangeRates: {
    YER: 1,
    SAR: 0.0013 // تقريبي
  },
  supportedLanguages: ['ar', 'en'],
  defaultLanguage: 'ar',
  timeZone: 'Asia/Aden',
  
  // 📱 تحسينات الاتصال الضعيف
  weakConnection: {
    retryAttempts: 5,
    retryDelay: 2000, // 2 ثانية
    timeout: 30000, // 30 ثانية
    compressData: true // ضغط البيانات
  }
};

/**
 * ✅ التحقق من الاتصال بـ Supabase
 */
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('accounts').select('count()', { count: 'exact' });
    if (error) {
      console.error('❌ خطأ الاتصال بـ Supabase:', error);
      return false;
    }
    console.log('✅ متصل بـ Supabase بنجاح');
    return true;
  } catch (e) {
    console.error('❌ فشل الاتصال:', e);
    return false;
  }
}

/**
 * 🔄 فعّل Realtime Subscriptions تلقائياً
 */
export function enableRealtimeSync() {
  // الاستماع لتغييرات الحسابات
  supabase
    .channel('accounts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, (payload) => {
      console.log('📡 تحديث الحسابات:', payload);
      window.dispatchEvent(new CustomEvent('accountsUpdated', { detail: payload }));
    })
    .subscribe();
  
  // ال��ستماع لتغييرات الحوالات
  supabase
    .channel('transfers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, (payload) => {
      console.log('📡 تحديث الحوالات:', payload);
      window.dispatchEvent(new CustomEvent('transfersUpdated', { detail: payload }));
    })
    .subscribe();
  
  // الاستماع لتغييرات الأرباح
  supabase
    .channel('profits')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profits' }, (payload) => {
      console.log('📡 تحديث الأرباح:', payload);
      window.dispatchEvent(new CustomEvent('profitsUpdated', { detail: payload }));
    })
    .subscribe();
  
  console.log('✅ تفعيل Realtime Sync تم');
}

/**
 * 🔌 مراقبة حالة الاتصال
 */
export function monitorConnection() {
  window.addEventListener('online', () => {
    console.log('🟢 الإنترنت متصل');
    window.dispatchEvent(new CustomEvent('connectionRestored'));
    syncOfflineChanges();
  });
  
  window.addEventListener('offline', () => {
    console.log('🔴 الإنترنت منقطع - الوضع المحلي مفعّل');
    window.dispatchEvent(new CustomEvent('connectionLost'));
  });
}

/**
 * 💾 مزامنة التغييرات المحفوظة محلياً عند العودة للإنترنت
 */
async function syncOfflineChanges() {
  const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
  if (!pendingChanges.length) return;
  
  console.log('🔄 جاري المزامنة...', pendingChanges.length, 'تغييرات');
  
  for (const change of pendingChanges) {
    try {
      if (change.type === 'insert') {
        await supabase.from(change.table).insert(change.data);
      } else if (change.type === 'update') {
        await supabase.from(change.table).update(change.data).eq('id', change.id);
      }
    } catch (e) {
      console.error('❌ خطأ المزامنة:', e);
    }
  }
  
  localStorage.removeItem('pendingChanges');
  console.log('✅ اكتملت المزامنة');
}

/**
 * 🌐 تحديث قائمة الصرف تلقائياً
 */
export async function updateExchangeRates() {
  try {
    // يمكن استخدام API خارجي للحصول على أسعار الصرف الحقيقية
    // مثل: openexchangerates.org أو fixer.io
    // في الوقت الحالي نستخدم قيم ثابتة
    console.log('💱 تحديث أسعار الصرف');
  } catch (e) {
    console.error('❌ خطأ تحديث الأسعار:', e);
  }
}

export default supabase;
