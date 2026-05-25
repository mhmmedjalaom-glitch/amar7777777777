// 📋 نموذج سريع للإعدادات
// استخدم هذا الملف لتسهيل الإعداد السريع

export const CONFIG = {
  // 🔐 بيانات Supabase (احفظها من Settings > API Keys)
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key-here'
  },
  
  // 🌍 إعدادات المحلية
  locale: {
    language: 'ar',
    direction: 'rtl',
    currency: {
      default: 'YER',
      supported: ['YER', 'SAR']
    },
    timeZone: 'Asia/Aden',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss'
  },
  
  // ⚙️ إعدادات التطبيق
  app: {
    name: 'نظام محمد سالم للحوالات',
    version: '1.0.0',
    author: 'محمد سالم',
    supportEmail: 'support@example.com'
  },
  
  // 🔄 إعدادات المزامنة
  sync: {
    autoRefreshInterval: 30000, // 30 ثواني
    offlineSupport: true,
    maxCacheAge: 86400000, // 24 ساعة
    retryAttempts: 5,
    retryDelay: 2000
  },
  
  // 📱 إعدادات الواجهة
  ui: {
    theme: 'light',
    animationsEnabled: true,
    notificationsEnabled: true,
    soundEnabled: false
  },
  
  // 🎤 إعدادات الأوامر الصوتية
  voice: {
    language: 'ar-SA',
    enabled: true,
    autoStart: false,
    timeout: 5000
  },
  
  // 🌐 إعدادات الحجب والبدائل
  proxy: {
    enabled: false,
    url: 'https://your-proxy.workers.dev'
  }
};

export default CONFIG;
