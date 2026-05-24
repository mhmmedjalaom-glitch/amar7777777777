// ===== نظام محمد سالم — قاعدة البيانات المحلية =====
  const KEYS = { transfers:'ms_transfers', accounts:'ms_accounts', wa_logs:'ms_wa_logs', settings:'ms_settings' };
  const KEY_MAP = { ms_transfers:'transfers', ms_accounts:'accounts', ms_wa_logs:'wa_logs' };
  const listeners = { transfers:[], accounts:[], wa_logs:[] };

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  function loadObj(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
  }
  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    const lk = KEY_MAP[key] || key;
    (listeners[lk] || []).forEach(cb => {
      try { cb([...data]); } catch(e) { console.error('listener error', e); }
    });
  }

  // ===== إعدادات =====
  export async function saveSettings(data) {
    const s = loadObj(KEYS.settings);
    localStorage.setItem(KEYS.settings, JSON.stringify({ ...s, ...data }));
  }
  export async function loadSettings() { return loadObj(KEYS.settings); }
  export function getSetting(key, fallback='') { return loadObj(KEYS.settings)[key] || fallback; }
  export function getAdminWA() { return loadObj(KEYS.settings).waNumber || '967733231636'; }

  // ===== الحوالات =====
  export async function addTransfer(data) {
    const list = load(KEYS.transfers);
    const item = { id:uid(), ...data, status:data.status||'pending', createdAt:new Date().toISOString() };
    list.unshift(item);
    save(KEYS.transfers, list);
    if (data.beneficiary) {
      await logWA({ type:'transfer_new', accountName:data.beneficiary, phone:data.beneficiaryPhone||'',
        message:'حوالة جديدة بمبلغ ' + Number(data.amount||0).toLocaleString('ar-SA') + ' ' + (data.currency||'ر.ي') });
    }
    return item;
  }
  export async function getTransfers(n=500) { return load(KEYS.transfers).slice(0,n); }
  export function listenTransfers(cb) {
    listeners.transfers.push(cb);
    try { cb(load(KEYS.transfers)); } catch(e) {}
    return () => { listeners.transfers = listeners.transfers.filter(f => f!==cb); };
  }
  export async function updateTransferStatus(id, status) {
    const list = load(KEYS.transfers).map(t => t.id===id ? {...t, status, updatedAt:new Date().toISOString()} : t);
    save(KEYS.transfers, list);
  }
  export async function deleteTransfer(id) {
    save(KEYS.transfers, load(KEYS.transfers).filter(t => t.id!==id));
  }

  // ===== الحسابات =====
  export async function addAccount(data) {
    const list = load(KEYS.accounts);
    const item = { id:uid(), ...data, balance:Number(data.balance)||0, status:data.status||'active', createdAt:new Date().toISOString() };
    list.unshift(item);
    save(KEYS.accounts, list);
    return item;
  }
  export async function getAccounts() { return load(KEYS.accounts); }
  export function listenAccounts(cb) {
    listeners.accounts.push(cb);
    try { cb(load(KEYS.accounts)); } catch(e) {}
    return () => { listeners.accounts = listeners.accounts.filter(f => f!==cb); };
  }
  export async function updateAccount(id, data) {
    const list = load(KEYS.accounts).map(a => a.id===id ? {...a, ...data, updatedAt:new Date().toISOString()} : a);
    save(KEYS.accounts, list);
  }
  export async function deleteAccount(id) {
    save(KEYS.accounts, load(KEYS.accounts).filter(a => a.id!==id));
  }

  // ===== سجل الواتساب =====
  export async function logWA(data) {
    const list = load(KEYS.wa_logs);
    list.unshift({ id:uid(), ...data, sentAt:new Date().toISOString() });
    save(KEYS.wa_logs, list.slice(0,100));
  }
  export function listenWALogs(cb) {
    listeners.wa_logs.push(cb);
    try { cb(load(KEYS.wa_logs)); } catch(e) {}
    return () => { listeners.wa_logs = listeners.wa_logs.filter(f => f!==cb); };
  }

  // ===== إحصاءات =====
  export async function getStats() {
    const transfers = load(KEYS.transfers);
    const accounts  = load(KEYS.accounts);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayT = transfers.filter(t => new Date(t.createdAt) >= today);
    return {
      totalBalance:   accounts.reduce((s,a) => s+(Number(a.balance)||0), 0),
      todayCompleted: todayT.filter(t => t.status==='completed').length,
      todayPending:   todayT.filter(t => t.status==='pending').length,
      todayProfit:    todayT.reduce((s,t) => s+(Number(t.commission)||0), 0),
      lateAccounts:   accounts.filter(a => a.status==='late').length,
      totalAccounts:  accounts.length,
      activeAccounts: accounts.filter(a => a.status!=='late').length
    };
  }

  // ===== واتساب =====
  export function openWA(phone, text) {
    const clean = String(phone||'').replace(/[^0-9]/g,'');
    if (!clean) return;
    const num = clean.startsWith('00') ? clean.slice(2) : clean.startsWith('0') ? '967'+clean.slice(1) : clean;
    window.open('https://wa.me/'+num+'?text='+encodeURIComponent(text), '_blank');
  }
  export function openAdminWA(text) { openWA(getAdminWA(), text); }
  