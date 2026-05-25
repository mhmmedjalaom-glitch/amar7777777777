// ===== نظام المزامنة الذكية والعمل بدون إنترنت =====
// Smart Sync System - Offline First Architecture

export class OfflineSync {
  constructor() {
    this.syncQueue = [];
    this.lastSyncTime = 0;
    this.isSyncing = false;
    this.conflictResolution = 'lastWrite'; // lastWrite, serverWins, clientWins
    this.localData = new Map();
    this.listeners = new Map();
    
    this._initOfflineDetection();
    this._loadSyncQueue();
  }

  // ===== الكشف عن حالة الإنترنت =====
  _initOfflineDetection() {
    window.addEventListener('online', () => {
      console.log('📡 عاد الإنترنت - بدء المزامنة');
      this._notifyListeners('onOnline');
      this.startSync();
    });

    window.addEventListener('offline', () => {
      console.log('📵 انقطع الإنترنت - الوضع المحلي فعّال');
      this._notifyListeners('onOffline');
    });

    // اختبار الاتصال الدوري
    setInterval(() => this._checkConnection(), 30000);
  }

  async _checkConnection() {
    try {
      const response = await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      return true;
    } catch {
      return false;
    }
  }

  // ===== إدارة قائمة المزامنة =====
  _loadSyncQueue() {
    try {
      const queue = localStorage.getItem('syncQueue');
      this.syncQueue = queue ? JSON.parse(queue) : [];
    } catch {
      this.syncQueue = [];
    }
  }

  _saveSyncQueue() {
    localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
  }

  addToQueue(operation) {
    const item = {
      id: this._generateId(),
      timestamp: Date.now(),
      ...operation,
      retries: 0,
      maxRetries: 3
    };
    
    this.syncQueue.push(item);
    this._saveSyncQueue();
    console.log('📝 تمت إضافة عملية للقائمة:', item.id);
    
    this._notifyListeners('queueUpdated', { length: this.syncQueue.length });
  }

  removeFromQueue(operationId) {
    this.syncQueue = this.syncQueue.filter(op => op.id !== operationId);
    this._saveSyncQueue();
  }

  getQueueLength() {
    return this.syncQueue.length;
  }

  // ===== المزامنة =====
  async startSync() {
    if (this.isSyncing || !navigator.onLine) return;
    
    this.isSyncing = true;
    this._notifyListeners('syncStart');
    
    try {
      let successCount = 0;
      let failureCount = 0;

      for (const operation of this.syncQueue) {
        try {
          await this._executeOperation(operation);
          this.removeFromQueue(operation.id);
          successCount++;
          this._notifyListeners('operationSynced', { operation });
        } catch (error) {
          failureCount++;
          operation.retries = (operation.retries || 0) + 1;
          
          if (operation.retries >= operation.maxRetries) {
            this._notifyListeners('operationFailed', { operation, error });
            this.removeFromQueue(operation.id);
          } else {
            this._saveSyncQueue();
          }
        }
      }

      console.log(`✅ المزامنة: ${successCount} نجح، ${failureCount} فشل`);
      this._notifyListeners('syncComplete', { successCount, failureCount });
    } catch (error) {
      console.error('Sync error:', error);
      this._notifyListeners('syncError', { error });
    } finally {
      this.isSyncing = false;
    }
  }

  async _executeOperation(operation) {
    // يتم تنفيذ العملية من خلال الدالة المحددة
    if (operation.handler && typeof operation.handler === 'function') {
      return await operation.handler(operation.data);
    }
    throw new Error('لا توجد دالة للعملية');
  }

  // ===== التخزين المحلي =====
  setLocalData(key, value) {
    this.localData.set(key, {
      value,
      timestamp: Date.now(),
      synced: false
    });
    localStorage.setItem(`local_${key}`, JSON.stringify({
      value,
      timestamp: Date.now()
    }));
  }

  getLocalData(key) {
    const item = this.localData.get(key);
    if (item) return item.value;
    
    try {
      const stored = localStorage.getItem(`local_${key}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.localData.set(key, { ...data, synced: false });
        return data.value;
      }
    } catch {
      // ignore
    }
    return null;
  }

  markAsSynced(key) {
    const item = this.localData.get(key);
    if (item) {
      item.synced = true;
    }
  }

  // ===== حل التضاربات =====
  async resolveConflict(localData, serverData, field) {
    switch (this.conflictResolution) {
      case 'lastWrite':
        return localData.timestamp > serverData.timestamp ? localData : serverData;
      
      case 'serverWins':
        return serverData;
      
      case 'clientWins':
        return localData;
      
      default:
        return serverData;
    }
  }

  // ===== الاستماع للتغييرات =====
  onSyncEvent(event, callback) {
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
        console.error('Listener error:', e);
      }
    });
  }

  // ===== Utilities =====
  _generateId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      isOnline: navigator.onLine,
      lastSyncTime: this.lastSyncTime
    };
  }

  clearQueue() {
    this.syncQueue = [];
    this._saveSyncQueue();
  }

  clearLocalData() {
    this.localData.clear();
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('local_')) {
        localStorage.removeItem(key);
      }
    });
  }
}

// ===== Service Worker Support =====
export class ServiceWorkerManager {
  constructor() {
    this.sw = null;
  }

  async register() {
    if (!('serviceWorker' in navigator)) return false;

    try {
      this.sw = await navigator.serviceWorker.register('service-worker.js');
      console.log('✅ Service Worker مسجل');
      return true;
    } catch (e) {
      console.warn('❌ خطأ في تسجيل Service Worker:', e);
      return false;
    }
  }

  async unregister() {
    if (this.sw) {
      await this.sw.unregister();
      console.log('🔴 تم إلغاء تسجيل Service Worker');
    }
  }

  async sendMessage(data) {
    if (!this.sw?.controller) return;
    this.sw.controller.postMessage(data);
  }

  onMessage(callback) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', callback);
    }
  }
}

// ===== Export =====
export const offlineSync = new OfflineSync();
export const swManager = new ServiceWorkerManager();

// ===== Global Functions =====
window.getOfflineStatus = () => offlineSync.getSyncStatus();
window.startOfflineSync = () => offlineSync.startSync();
window.getQueueLength = () => offlineSync.getQueueLength();
