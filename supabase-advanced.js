// ===== نظام Supabase المتقدم مع Realtime والمزامنة =====
// Advanced Supabase System with Realtime, Offline Support & Auto Sync

const SUPABASE_URL = "https://ezektgzwesrtezeghmrs.supabase.co";
const SUPABASE_KEY = "sb_publishable_yxYW7KsjVtq_0kMYuaODng_4yvhyRum";

export class SupabaseManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.listeners = new Map();
    this.syncQueue = [];
    this.isSyncing = false;
    
    this._initSupabase();
  }

  // ===== التهيئة =====
  async _initSupabase() {
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      this.client = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      
      // اختبار الاتصال
      const { error } = await this.client.from("accounts").select("id").limit(1);
      
      if (error) throw error;
      
      this.isConnected = true;
      console.log('✅ Supabase متصل - يعمل بدون VPN في اليمن 🇾🇪');
      
      // بدء المراقبة
      this._setupOfflineDetection();
      
    } catch (error) {
      console.warn('⚠️ خطأ في الاتصال بـ Supabase:', error.message);
      this.isConnected = false;
    }
  }

  // ===== الكشف عن حالة الإنترنت =====
  _setupOfflineDetection() {
    window.addEventListener('online', () => {
      console.log('📡 عاد الإنترنت - بدء المزامنة');
      this.isConnected = true;
      this._notifyListeners('onOnline');
      this.startSync();
    });

    window.addEventListener('offline', () => {
      console.log('📵 انقطع الإنترنت');
      this.isConnected = false;
      this._notifyListeners('onOffline');
    });
  }

  // ===== الاستماع للتغييرات الحية (Realtime) =====
  subscribeToAccounts(callback) {
    const channel = this.client
      .channel('public:accounts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        (payload) => {
          console.log('📊 تحديث في الحسابات:', payload);
          callback(payload);
        }
      )
      .subscribe();
    
    this.subscriptions.set('accounts', channel);
    return () => channel.unsubscribe();
  }

  subscribeToTransfers(callback) {
    const channel = this.client
      .channel('public:transfers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfers' },
        (payload) => {
          console.log('💸 تحديث في الحوالات:', payload);
          callback(payload);
        }
      )
      .subscribe();
    
    this.subscriptions.set('transfers', channel);
    return () => channel.unsubscribe();
  }

  subscribeToProfits(callback) {
    const channel = this.client
      .channel('public:profits')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profits' },
        (payload) => {
          console.log('📈 تحديث في الأرباح:', payload);
          callback(payload);
        }
      )
      .subscribe();
    
    this.subscriptions.set('profits', channel);
    return () => channel.unsubscribe();
  }

  // ===== جلب البيانات =====
  async getAccounts(filters = {}) {
    if (!this.isConnected) {
      return this._getLocalData('accounts');
    }

    try {
      let query = this.client.from('accounts').select('*');

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      this._setLocalData('accounts', data);
      return data || [];
    } catch (error) {
      console.warn('خطأ في جلب الحسابات:', error);
      return this._getLocalData('accounts');
    }
  }

  async getTransfers(filters = {}) {
    if (!this.isConnected) {
      return this._getLocalData('transfers');
    }

    try {
      let query = this.client.from('transfers').select('*');

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.beneficiaryId) query = query.eq('beneficiary_id', filters.beneficiaryId);
      if (filters.code) query = query.eq('transfer_code', filters.code);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 200);

      if (error) throw error;

      this._setLocalData('transfers', data);
      return data || [];
    } catch (error) {
      console.warn('خطأ في جلب الحوالات:', error);
      return this._getLocalData('transfers');
    }
  }

  async getProfits(filters = {}) {
    if (!this.isConnected) {
      return this._getLocalData('profits');
    }

    try {
      let query = this.client.from('profits').select('*');

      if (filters.accountId) query = query.eq('account_id', filters.accountId);
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 500);

      if (error) throw error;

      this._setLocalData('profits', data);
      return data || [];
    } catch (error) {
      console.warn('خطأ في جلب الأرباح:', error);
      return this._getLocalData('profits');
    }
  }

  // ===== إضافة/تحديث البيانات =====
  async addAccount(data) {
    const accountData = {
      name: data.name,
      phone: data.phone || '',
      balance: Number(data.balance) || 0,
      balance_sar: Number(data.balance_sar) || 0,
      status: data.status || 'active',
      notes: data.notes || ''
    };

    if (this.isConnected) {
      try {
        const { data: result, error } = await this.client
          .from('accounts')
          .insert([accountData])
          .select()
          .single();

        if (error) throw error;

        console.log('✅ تم إضافة الحساب بنجاح');
        return result;
      } catch (error) {
        console.warn('خطأ في إضافة الحساب:', error);
        this.addToSyncQueue('addAccount', accountData);
      }
    } else {
      this.addToSyncQueue('addAccount', accountData);
    }

    return accountData;
  }

  async addTransfer(data) {
    const transferData = {
      transfer_code: data.transferCode || this._generateTransferCode(),
      beneficiary: data.beneficiary,
      beneficiary_phone: data.beneficiaryPhone || '',
      beneficiary_id: data.beneficiaryId || null,
      amount: Number(data.amount) || 0,
      currency: data.currency || 'YER',
      commission: Number(data.commission) || 0,
      profit: Number(data.profit) || 0,
      total: Number(data.total) || 0,
      transfer_type: data.transferType || 'تحويل عادي',
      payment_method: data.paymentMethod || 'cash',
      status: data.status || 'pending',
      notes: data.notes || ''
    };

    if (this.isConnected) {
      try {
        const { data: result, error } = await this.client
          .from('transfers')
          .insert([transferData])
          .select()
          .single();

        if (error) throw error;

        console.log('✅ تم إضافة الحوالة بنجاح');
        
        // إضافة الربح
        if (transferData.profit > 0) {
          this.addProfit({
            transferId: result.id,
            accountId: result.beneficiary_id,
            amount: transferData.amount,
            profit: transferData.profit,
            currency: transferData.currency
          });
        }

        return result;
      } catch (error) {
        console.warn('خطأ في إضافة الحوالة:', error);
        this.addToSyncQueue('addTransfer', transferData);
      }
    } else {
      this.addToSyncQueue('addTransfer', transferData);
    }

    return transferData;
  }

  async addProfit(data) {
    const profitData = {
      transfer_id: data.transferId,
      account_id: data.accountId,
      amount: Number(data.amount) || 0,
      profit: Number(data.profit) || 0,
      profit_currency: data.currency || 'YER',
      exchange_rate: Number(data.exchangeRate) || 1.0
    };

    if (this.isConnected) {
      try {
        const { error } = await this.client
          .from('profits')
          .insert([profitData]);

        if (error) throw error;
        console.log('✅ تم تسجيل الربح');
      } catch (error) {
        console.warn('خطأ في تسجيل الربح:', error);
      }
    }

    return profitData;
  }

  async updateAccount(id, data) {
    const updateData = {
      name: data.name,
      phone: data.phone,
      balance: Number(data.balance) || 0,
      balance_sar: Number(data.balance_sar) || 0,
      status: data.status,
      notes: data.notes,
      updated_at: new Date().toISOString()
    };

    if (this.isConnected) {
      try {
        const { error } = await this.client
          .from('accounts')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
        console.log('✅ تم تحديث الحساب');
      } catch (error) {
        console.warn('خطأ في تحديث الحساب:', error);
        this.addToSyncQueue('updateAccount', { id, ...updateData });
      }
    } else {
      this.addToSyncQueue('updateAccount', { id, ...updateData });
    }
  }

  // ===== قائمة المزامنة =====
  addToSyncQueue(operation, data) {
    this.syncQueue.push({
      id: this._generateId(),
      operation,
      data,
      timestamp: Date.now(),
      retries: 0
    });

    this._saveSyncQueue();
    console.log(`📝 تمت إضافة "${operation}" إلى قائمة المزامنة`);
    this._notifyListeners('queueUpdated');
  }

  async startSync() {
    if (this.isSyncing || !this.isConnected || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    console.log('🔄 بدء المزامنة...');

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of queue) {
      try {
        await this._executeSyncItem(item);
        console.log(`✅ تمت المزامنة: ${item.operation}`);
      } catch (error) {
        item.retries++;
        if (item.retries < 3) {
          this.syncQueue.push(item);
        } else {
          console.error(`❌ فشلت المزامنة بعد ${item.retries} محاولات:`, item.operation);
        }
      }
    }

    this._saveSyncQueue();
    this.isSyncing = false;
    this._notifyListeners('syncComplete');
  }

  async _executeSyncItem(item) {
    switch (item.operation) {
      case 'addAccount':
        return this.addAccount(item.data);
      case 'addTransfer':
        return this.addTransfer(item.data);
      case 'updateAccount':
        const { id, ...data } = item.data;
        return this.updateAccount(id, data);
      default:
        throw new Error('عملية غير معروفة');
    }
  }

  // ===== التخزين المحلي =====
  _getLocalData(key) {
    try {
      const data = localStorage.getItem(`supabase_${key}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _setLocalData(key, data) {
    localStorage.setItem(`supabase_${key}`, JSON.stringify(data));
  }

  _saveSyncQueue() {
    localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
  }

  _loadSyncQueue() {
    try {
      this.syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    } catch {
      this.syncQueue = [];
    }
  }

  // ===== Utilities =====
  _generateTransferCode() {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `حو-${yy}${mm}${dd}-${rand}`;
  }

  _generateId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // ===== Listeners =====
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  _notifyListeners(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error('خطأ في معالج الحدث:', e);
      }
    });
  }

  // ===== معلومات الحالة =====
  getStatus() {
    return {
      isConnected: this.isConnected,
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      isOnline: navigator.onLine
    };
  }
}

// ===== Global Instance =====
export const supabase = new SupabaseManager();
