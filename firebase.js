// ============================================================
// نظام محمد سالم — يعمل في اليمن بدون VPN
// localStorage أولاً دائماً — Supabase بـ fetch() مباشرة بدون CDN
// ============================================================

const SUPA_URL      = "https://ezektgzwesrtezeghmrs.supabase.co";
const SUPA_KEY      = "sb_publishable_yxYW7KsjVtq_0kMYuaODng_4yvhyRum";
const DEFAULT_PROXY = "https://constsupabaseurlhttpsezektgzwesrtezeghmrssupabaseco.bdkylh0.workers.dev"; // بروكسي Cloudflare — يعمل بدون VPN
const TIMEOUT       = 15000; // 15 ثانية — وقت كافٍ لليمن

// ══════════════════════════════════════════
// تفعيل البروكسي تلقائياً إذا لم يكن مضبوطاً
(function _initProxy() {
  if (!localStorage.getItem('s_proxy_url')) {
    localStorage.setItem('s_proxy_url', DEFAULT_PROXY);
  }
})();
// ══════════════════════════════════════════

// ===== LocalStorage =====
function _lsGet(k)      { try { return JSON.parse(localStorage.getItem("ms_"+k)||"[]"); } catch { return []; } }
function _lsSet(k, v)   { localStorage.setItem("ms_"+k, JSON.stringify(v)); }
function _uid()         { return Math.random().toString(36).slice(2)+Date.now().toString(36); }

const _listeners = {};
function _notify(col) {
  (_listeners[col]||[]).forEach(cb => { try { cb(_lsGet(col)); } catch {} });
}

// ===== بيانات أولية =====
function _seedLocalData() {
  if (localStorage.getItem("ms_seeded_v2")) return;
  const now = Date.now(), day = 86400000;
  const uid = _uid;
  _lsSet("accounts", [
    { id:uid(), name:"أحمد محمد الوادعي",  phone:"967712345678", balance:850000,  balanceSAR:0, status:"active", notes:"عميل منتظم",    createdAt:now-10*day },
    { id:uid(), name:"خالد سالم العمري",    phone:"967798765432", balance:1200000, balanceSAR:0, status:"active", notes:"VIP",           createdAt:now-8*day  },
    { id:uid(), name:"محمد علي الشمري",     phone:"967733445566", balance:320000,  balanceSAR:0, status:"late",   notes:"متأخر 7 أيام", createdAt:now-15*day },
    { id:uid(), name:"عبد الرحمن عقلان",    phone:"967755667788", balance:2500000, balanceSAR:0, status:"vip",   notes:"VIP كبير",      createdAt:now-5*day  },
    { id:uid(), name:"سالم القحطاني",       phone:"967722334455", balance:650000,  balanceSAR:0, status:"late",   notes:"متأخر 5 أيام", createdAt:now-20*day },
    { id:uid(), name:"فهد ناصر المالكي",    phone:"967788990011", balance:480000,  balanceSAR:0, status:"active", notes:"",             createdAt:now-3*day  },
  ]);
  _lsSet("transfers", [
    { id:uid(), transferCode:"حو-260524-A1B2", beneficiary:"أحمد محمد الوادعي", beneficiaryPhone:"967712345678", amount:150000, currency:"ر.ي", commission:7500,  total:157500, status:"completed", createdAt:now-1*day },
    { id:uid(), transferCode:"حو-260523-C3D4", beneficiary:"خالد سالم العمري",  beneficiaryPhone:"967798765432", amount:500000, currency:"ر.ي", commission:25000, total:525000, status:"completed", createdAt:now-2*day },
    { id:uid(), transferCode:"حو-260524-E5F6", beneficiary:"محمد علي الشمري",   beneficiaryPhone:"967733445566", amount:80000,  currency:"ر.ي", commission:4000,  total:84000,  status:"pending",   createdAt:now-3*day },
    { id:uid(), transferCode:"حو-260524-G7H8", beneficiary:"عبد الرحمن عقلان",  beneficiaryPhone:"967755667788", amount:900000, currency:"ر.ي", commission:45000, total:945000, status:"pending",   createdAt:now-4*day },
    { id:uid(), transferCode:"حو-260524-I9J0", beneficiary:"سالم القحطاني",     beneficiaryPhone:"967722334455", amount:200000, currency:"ر.ي", commission:10000, total:210000, status:"completed", createdAt:now-5*day },
  ]);
  _lsSet("vouchers", []);
  _lsSet("wa_logs",  []);
  localStorage.setItem("ms_seeded_v2", "1");
}
_seedLocalData();

// ===== Supabase REST بـ fetch() — بدون أي مكتبة خارجية =====
function _supaHeaders() {
  const proxyUrl = (localStorage.getItem("s_proxy_url")||"").trim().replace(/\/$/,"");
  const base = proxyUrl || SUPA_URL;
  return { base, headers: { "apikey": SUPA_KEY, "Authorization": "Bearer "+SUPA_KEY, "Content-Type": "application/json", "Prefer": "return=representation" } };
}

async function _fetchTimeout(url, opts={}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(t);
    return r;
  } catch(e) {
    clearTimeout(t);
    throw e;
  }
}

async function _sbSelect(table, query="") {
  try {
    const { base, headers } = _supaHeaders();
    const r = await _fetchTimeout(`${base}/rest/v1/${table}?${query}&order=created_at.desc`, { headers });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function _sbUpsert(table, rows) {
  try {
    const { base, headers } = _supaHeaders();
    await _fetchTimeout(`${base}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
    });
  } catch {}
}

async function _sbUpdate(table, id, data) {
  try {
    const { base, headers } = _supaHeaders();
    await _fetchTimeout(`${base}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify(data)
    });
  } catch {}
}

async function _sbDelete(table, id) {
  try {
    const { base, headers } = _supaHeaders();
    await _fetchTimeout(`${base}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers });
  } catch {}
}

// تحويل Supabase → JS
function _fromDB_acc(r)  {
  if (!r) return null;
  return { id:r.id, name:r.name, phone:r.phone||"", balance:Number(r.balance)||0,
    balanceSAR:Number(r.balance_sar)||0, status:r.status||"active",
    notes:r.notes||"", createdAt:r.created_at?new Date(r.created_at).getTime():Date.now() };
}
function _fromDB_trf(r) {
  if (!r) return null;
  const np = (r.notes||"").split("|");
  const code = np[0]?.trim() || generateTransferCode();
  const commission = parseInt((np[1]||"").replace(/[^0-9]/g,""))||0;
  const beneficiaryId = (np[2]||"").trim() || "";
  return { id:r.id, transferCode:code, beneficiary:r.receiver_name||"",
    beneficiaryPhone:r.receiver_phone||"", beneficiaryId,
    senderName:r.sender_name||"",
    amount:Number(r.amount)||0, currency:r.currency||"ر.ي",
    commission, total:(Number(r.amount)||0)+commission,
    status:r.status||"pending", notes:"", transferType:"تحويل عادي",
    createdAt:r.created_at?new Date(r.created_at).getTime():Date.now() };
}

// تحويل JS → Supabase
function _toDB_acc(d) {
  const r = { name:d.name, phone:d.phone||"", balance:Number(d.balance)||0,
    balance_sar:Number(d.balanceSAR)||0, status:d.status||"active", notes:d.notes||"" };
  if (d.id) r.id = d.id;
  return r;
}
function _toDB_trf(d) {
  const r = { sender_name:d.senderName||"محمد سالم",
    receiver_name:d.beneficiary||"", sender_phone:d.senderPhone||"967733231636",
    receiver_phone:d.beneficiaryPhone||"", amount:Number(d.amount)||0,
    currency:d.currency||"ر.ي", status:d.status||"pending",
    notes:`${d.transferCode||""} | عمولة: ${d.commission||0} | ${d.beneficiaryId||""}` };
  if (d.id) r.id = d.id;
  return r;
}
// تحويل Supabase → JS للسندات
function _fromDB_vouch(r) {
  if (!r) return null;
  return { id:r.id, accountId:r.account_id||"", accountName:r.account_name||"",
    type:r.type||"receipt", amount:Number(r.amount)||0,
    currency:r.currency||"YER", reason:r.reason||"",
    phone:r.phone||"", entryType:"voucher",
    createdAt:r.created_at?new Date(r.created_at).getTime():Date.now() };
}
// تحويل JS → Supabase للسندات
function _toDB_vouch(d) {
  const r = { account_id:d.accountId||null,
    type:d.type||"receipt", amount:Number(d.amount)||0,
    currency:d.currency||"YER", reason:d.reason||d.notes||"" };
  if (d.id) r.id = d.id;
  return r;
}

// مزامنة في الخلفية — localStorage أولاً + Supabase ثانياً
let _supaOk = false;

// === طابور الانتظار في localStorage (يبقى بعد الإغلاق) ===
function _getPending(table) { try { return JSON.parse(localStorage.getItem('ms_pending_'+table)||'[]'); } catch { return []; } }
function _setPending(table, rows) { localStorage.setItem('ms_pending_'+table, JSON.stringify(rows)); }
function _addPending(table, rows) {
  const arr = _getPending(table);
  const data = Array.isArray(rows) ? rows : [rows];
  data.forEach(r => { if (!arr.find(x => x.id === r.id)) arr.push(r); });
  _setPending(table, arr);
  _updateSyncBadge();
}
function _removePending(table, ids) {
  const set = new Set(ids);
  _setPending(table, _getPending(table).filter(r => !set.has(r.id)));
  _updateSyncBadge();
}
function _pendingCount() {
  return ['accounts','transfers','vouchers'].reduce((n, t) => n + _getPending(t).length, 0);
}

// === مؤشر المزامنة ===
function _updateSyncBadge() {
  const n = _pendingCount();
  const badge = document.getElementById('_syncBadge');

  // --- بطاقة الحالة الرئيسية ---
  const dot   = document.getElementById('connDotMain');
  const title = document.getElementById('connStatusTitle');
  const desc  = document.getElementById('connStatusDesc');
  const card  = document.getElementById('connStatusCard');
  const retry = document.getElementById('connRetryBtn');

  if (n > 0) {
    // يوجد بيانات لم تُحفظ بعد
    if (badge) { badge.textContent = '⏳ ' + n + ' سجل لم يُحفظ'; badge.style.display = 'inline-block'; badge.style.background = '#f59e0b'; }
    if (dot)   { dot.style.background = '#f59e0b'; }
    if (card)  { card.style.borderColor = '#f59e0b'; }
    if (title) { title.textContent = '⏳ ' + n + ' سجل في انتظار الحفظ'; title.style.color = '#92400e'; }
    if (desc)  { desc.textContent = 'متصل — جاري رفع البيانات إلى السحابة...'; }
    if (retry) { retry.style.display = 'none'; }
  } else if (_supaOk) {
    // متصل بالسحابة بنجاح
    if (badge) { badge.textContent = '☁️ محفوظ'; badge.style.display = 'inline-block'; badge.style.background = '#10b981'; setTimeout(() => { if(badge) badge.style.display='none'; }, 3000); }
    if (dot)   { dot.style.background = '#10b981'; }
    if (card)  { card.style.borderColor = '#10b981'; }
    if (title) { title.textContent = '☁️ متصل بالسحابة'; title.style.color = '#065f46'; }
    if (desc)  { desc.textContent = 'البيانات محفوظة ومزامنة بنجاح — بدون VPN ✓'; }
    if (retry) { retry.style.display = 'none'; }
  } else {
    // وضع محلي — غير متصل
    if (badge) { badge.textContent = '📱 محلي'; badge.style.display = 'inline-block'; badge.style.background = '#6b7280'; }
    if (dot)   { dot.style.background = '#ef4444'; }
    if (card)  { card.style.borderColor = '#ef4444'; }
    if (title) { title.textContent = '🔴 غير متصل بالسحابة'; title.style.color = '#991b1b'; }
    if (desc)  { desc.textContent = 'البيانات محفوظة محلياً فقط — ستتم المزامنة عند الاتصال'; }
    if (retry) { retry.style.display = 'inline-block'; }
  }
}

// زر إعادة المحاولة
window.__retryConn = async function() {
  const title = document.getElementById('connStatusTitle');
  const desc  = document.getElementById('connStatusDesc');
  const retry = document.getElementById('connRetryBtn');
  if (title) { title.textContent = 'جاري إعادة الاتصال...'; title.style.color = '#333'; }
  if (desc)  { desc.textContent = 'يتم التحقق من الاتصال بالسحابة...'; }
  if (retry) { retry.style.display = 'none'; }
  const test = await _sbSelect('accounts', 'limit=1');
  if (test !== null) { _supaOk = true; }
  _updateSyncBadge();
};

// حقن شارة المزامنة في الصفحة تلقائياً
(function _injectBadge() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _injectBadge);
    return;
  }
  if (document.getElementById('_syncBadge')) return;
  const badge = document.createElement('div');
  badge.id = '_syncBadge';
  badge.style.cssText = 'position:fixed;top:8px;left:8px;z-index:9999;padding:4px 10px;border-radius:20px;font-size:12px;color:#fff;font-family:sans-serif;display:none;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)';
  badge.onclick = () => _forceSync();
  document.body.appendChild(badge);
  _updateSyncBadge();
})();

// === upsert مع حفظ في طابور الانتظار عند الفشل ===
async function _sbUpsertSafe(table, rows) {
  const data = Array.isArray(rows) ? rows : [rows];
  if (!data.length) return;
  try {
    const { base, headers } = _supaHeaders();
    const r = await _fetchTimeout(base + '/rest/v1/' + table, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(data)
    });
    if (!r.ok) {
      const err = await r.text().catch(()=>'');
      console.warn('⚠️ فشل حفظ ' + table + ' HTTP ' + r.status + ':', err.slice(0,200));
      _addPending(table, data);
    } else {
      _removePending(table, data.map(r => r.id).filter(Boolean));
      _updateSyncBadge();
    }
  } catch(e) {
    console.warn('⚠️ خطأ شبكة ' + table + ':', e.message);
    _addPending(table, data);
  }
}

// === مزامنة إجبارية يدوية أو تلقائية ===
export async function _forceSync() {
  if (!_supaOk) {
    const test = await _sbSelect('accounts', 'limit=1');
    if (test === null) { alert('لا يوجد اتصال بـ Supabase'); return; }
    _supaOk = true;
  }
  let total = 0;
  for (const table of ['accounts','transfers','vouchers']) {
    const pending = _getPending(table);
    if (!pending.length) continue;
    await _sbUpsertSafe(table, pending);
    total += pending.length;
  }
  if (total) console.log('🔄 تم مزامنة ' + total + ' سجل');
  else console.log('✅ كل شيء محفوظ');
  _updateSyncBadge();
}

(async () => {
  try {
    const test = await _sbSelect('accounts', 'limit=1');
    if (test === null) { console.log('📱 وضع محلي — Supabase غير متاح'); return; }
    _supaOk = true;
    console.log('☁️ Supabase متصل');

    // === دمج الحسابات (بدل الاستبدال) ===
    const remoteAcc = await _sbSelect('accounts', 'limit=500');
    if (remoteAcc) {
      const local  = _lsGet('accounts');
      const remIds = new Set(remoteAcc.map(function(r){ return r.id; }));
      const localOnly = local.filter(function(a){ return !remIds.has(a.id); });
      if (localOnly.length) {
        await _sbUpsertSafe('accounts', localOnly.map(_toDB_acc));
        console.log('⬆️ رُفع ' + localOnly.length + ' حساب محلي');
      }
      const remoteConverted = remoteAcc.map(_fromDB_acc);
      const merged = remoteConverted.concat(localOnly);
      _lsSet('accounts', merged);
      _notify('accounts');
      console.log('🔄 دُمج ' + merged.length + ' حساب');
    }

    // === دمج الحوالات ===
    const remoteTrf = await _sbSelect('transfers', 'limit=500');
    if (remoteTrf) {
      const local  = _lsGet('transfers');
      const remIds = new Set(remoteTrf.map(function(r){ return r.id; }));
      const localOnly = local.filter(function(t){ return !remIds.has(t.id); });
      if (localOnly.length) {
        await _sbUpsertSafe('transfers', localOnly.map(_toDB_trf));
        console.log('⬆️ رُفع ' + localOnly.length + ' حوالة محلية');
      }
      const remoteConverted = remoteTrf.map(_fromDB_trf);
      const merged = remoteConverted.concat(localOnly);
      _lsSet('transfers', merged);
      _notify('transfers');
      console.log('🔄 دُمج ' + merged.length + ' حوالة');
    }

    // === دمج السندات ===
    const remoteVouch = await _sbSelect('vouchers', 'limit=1000&order=created_at.desc');
    if (remoteVouch) {
      const local  = _lsGet('vouchers');
      const remIds = new Set(remoteVouch.map(function(r){ return r.id; }));
      const localOnly = local.filter(function(v){ return !remIds.has(v.id); });
      if (localOnly.length) {
        await _sbUpsertSafe('vouchers', localOnly.map(_toDB_vouch));
        console.log('⬆️ رُفع ' + localOnly.length + ' سند محلي');
      }
      const remoteConverted = remoteVouch.map(_fromDB_vouch);
      const merged = remoteConverted.concat(localOnly);
      _lsSet('vouchers', merged);
      _notify('vouchers');
      console.log('🔄 دُمج ' + merged.length + ' سند');
    }

    // إرسال طابور الانتظار من localStorage
    for (const table of ['accounts','transfers','vouchers']) {
      const pending = _getPending(table);
      if (pending.length) {
        console.log('🔄 طابور: رفع ' + pending.length + ' سجل من ' + table);
        await _sbUpsertSafe(table, pending);
      }
    }
    _updateSyncBadge();

  } catch(e) {
    console.log('📱 وضع محلي:', e.message);
  }
})();

// ===== أدوات مساعدة =====
export function generateTransferCode() {
  const d = new Date();
  const yy=String(d.getFullYear()).slice(2), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  return `حو-${yy}${mm}${dd}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}
export function getAdminWA() { return localStorage.getItem("s_waNumber")||"967733231636"; }
export function openWA(phone, text) {
  const c=String(phone||"").replace(/[^0-9]/g,""); if(!c) return false;
  const n=c.startsWith("00")?c.slice(2):c.startsWith("0")?"967"+c.slice(1):c;
  window.open("https://wa.me/"+n+"?text="+encodeURIComponent(text),"_blank"); return true;
}
export function openAdminWA(text) { return openWA(getAdminWA(), text); }

export function buildMsg(type, data={}) {
  const fmt = n=>Number(n||0).toLocaleString('ar-SA');
  const name=data.name||data.beneficiary||'العميل', amount=fmt(data.amount),
        cur=data.currency||'ر.ي', comm=fmt(data.commission), bal=fmt(data.balance);
  const code = data.transferCode?`\n🔖 كود الحوالة: *${data.transferCode}*`:'';
  const pm = data.paymentMethod==='balance'?'من الرصيد':data.paymentMethod==='debt'?'دين على العميل':'نقدي عند الإرسال';
  const pmLine = data.paymentMethod?`\n💳 طريقة الدفع: ${pm}`:'';
  const hd=`🏦 *نظام محمد سالم للحوالات*\n━━━━━━━━━━━━━━━━━━`, ft=`━━━━━━━━━━━━━━━━━━\n📞 للاستفسار تواصل معنا مباشرة`;
  const msgs = {
    transfer_new:       `${hd}\n\n📬 *تم إنشاء حوالة جديدة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}\n📊 العمولة: ${comm} ${cur}${pmLine}\n\n${ft}`,
    transfer_completed: `${hd}\n\n✅ *تم إتمام الحوالة بنجاح*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}${code}\n🕐 وقت الإتمام: ${new Date().toLocaleString('ar-SA')}\n\n${ft}`,
    transfer_cancelled: `${hd}\n\n❌ *تم إلغاء الحوالة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}${code}\n\nللاستفسار تواصل معنا.\n\n${ft}`,
    transfer_reminder:  `${hd}\n\n🔔 *تذكير بحوالة معلقة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}${code}\n\n${ft}`,
    account_welcome:    `${hd}\n\n👋 *أهلاً وسهلاً ${name}*\n\nتم تسجيلك في نظام محمد سالم.\n💰 الرصيد: ${bal} ${cur}\n\n${ft}`,
    account_statement:  `${hd}\n\n📊 *كشف حسابك*\n\n👤 ${name}\n💰 الرصيد (ر.ي): ${bal}\n📅 ${new Date().toLocaleDateString('ar-SA')}\n\n${ft}`,
    late_alert:         `${hd}\n\n⚠️ *تنبيه: رصيد متأخر*\n\n${name}، لديك رصيد متأخر:\n💰 ${bal} ${cur}\n\nيرجى التواصل لترتيب السداد.\n\n${ft}`,
    voucher_receipt:    `${hd}\n\n🧾 *سند قبض*\n\n👤 الاسم: ${name}\n💰 المبلغ المستلم: ${amount} ${cur}\n📝 السبب: ${data.reason||'—'}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n\n${ft}`,
    voucher_payment:    `${hd}\n\n🧾 *سند صرف*\n\n👤 الاسم: ${name}\n💰 المبلغ المصروف: ${amount} ${cur}\n📝 السبب: ${data.reason||'—'}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n\n${ft}`,
  };
  return msgs[type]||`${hd}\n\n📋 عملية جديدة في حسابك\n\n${ft}`;
}

export async function notifyClient(clientPhone, type, data={}) {
  const msg=buildMsg(type,data), sent=clientPhone?openWA(clientPhone,msg):false;
  const adm=getAdminWA(), cc=String(clientPhone||"").replace(/[^0-9]/g,""), ac=String(adm).replace(/[^0-9]/g,"");
  if(cc!==ac) setTimeout(()=>openWA(adm,`📋 *نسخة — ${data.name||data.beneficiary||'عميل'}*\n${msg}`),1200);
  await logWA({type, accountName:data.name||data.beneficiary||'', phone:clientPhone||adm, message:msg});
  return sent;
}

// ===== الإعدادات =====
export async function saveSettings(data) {
  Object.keys(data).forEach(k => localStorage.setItem("s_"+k, data[k]));
  if (_supaOk) {
    try { await _sbUpsert("settings", Object.keys(data).map(k=>({key:k, value:String(data[k])}))); } catch {}
  }
}
export async function loadSettings() {
  if (_supaOk) {
    try {
      const rows = await _sbSelect("settings","");
      if (rows) { const o={}; rows.forEach(r=>o[r.key]=r.value); return o; }
    } catch {}
  }
  return {};
}

// ===== الحوالات =====
export async function addTransfer(data) {
  const code = data.transferCode||generateTransferCode();
  const entry = { id:_uid(), ...data, transferCode:code, status:data.status||"pending", createdAt:Date.now() };
  const list = _lsGet("transfers"); list.unshift(entry); _lsSet("transfers", list);
  _notify("transfers");
  if (data.paymentMethod==='balance' && data.beneficiaryId) {
    _lsSet("accounts", _lsGet("accounts").map(a => a.id===data.beneficiaryId
      ? {...a, balance:Math.max(0,(Number(a.balance)||0)-(Number(data.total)||0))} : a));
    _notify("accounts");
  }
  _sbUpsertSafe("transfers", [_toDB_trf({...data, transferCode:code, id:entry.id})]);
  return entry;
}
export async function getTransfers(n=500) { return _lsGet("transfers").slice(0,n); }
export function listenTransfers(cb) {
  if (!_listeners["transfers"]) _listeners["transfers"]=[];
  _listeners["transfers"].push(cb); cb(_lsGet("transfers"));
  return ()=>{ _listeners["transfers"]=(_listeners["transfers"]||[]).filter(x=>x!==cb); };
}
export async function updateTransferStatus(id, status) {
  _lsSet("transfers", _lsGet("transfers").map(t=>t.id===id?{...t,status,updatedAt:Date.now()}:t));
  _notify("transfers");
  _sbUpdate("transfers", id, {status});
}
export async function deleteTransfer(id) {
  _lsSet("transfers", _lsGet("transfers").filter(t=>t.id!==id));
  _notify("transfers");
  _sbDelete("transfers", id);
}
export async function findTransferByCode(code) {
  return _lsGet("transfers").find(t=>t.transferCode===code)||null;
}

// ===== الحسابات =====
export async function addAccount(data) {
  const entry = { id:_uid(), ...data, balance:Number(data.balance)||0, balanceSAR:Number(data.balanceSAR)||0, status:data.status||"active", createdAt:Date.now() };
  const list = _lsGet("accounts"); list.unshift(entry); _lsSet("accounts", list);
  _notify("accounts");
  _sbUpsertSafe("accounts", [_toDB_acc({...data, id:entry.id})]);
  return entry;
}
export async function getAccounts() { return _lsGet("accounts"); }
export function listenAccounts(cb) {
  if (!_listeners["accounts"]) _listeners["accounts"]=[];
  _listeners["accounts"].push(cb); cb(_lsGet("accounts"));
  return ()=>{ _listeners["accounts"]=(_listeners["accounts"]||[]).filter(x=>x!==cb); };
}
export async function updateAccount(id, data) {
  _lsSet("accounts", _lsGet("accounts").map(a=>a.id===id?{...a,...data,updatedAt:Date.now()}:a));
  _notify("accounts");
  { const d=_toDB_acc(data); delete d.id; _sbUpdate("accounts", id, d); }
}
export async function deleteAccount(id) {
  _lsSet("accounts", _lsGet("accounts").filter(a=>a.id!==id));
  _notify("accounts");
  _sbDelete("accounts", id);
}

// ===== السندات =====
export async function addVoucher(data) {
  const entry = { id:_uid(), ...data, createdAt:Date.now() };
  const list = _lsGet("vouchers"); list.unshift(entry); _lsSet("vouchers", list);
  _notify("vouchers");
  if (data.accountId) {
    _lsSet("accounts", _lsGet("accounts").map(a => {
      if (a.id!==data.accountId) return a;
      if (data.currency==='SAR') { const v=data.type==='receipt'?(a.balanceSAR||0)+(Number(data.amount)||0):(a.balanceSAR||0)-(Number(data.amount)||0); return {...a,balanceSAR:v}; }
      else { const v=data.type==='receipt'?(a.balance||0)+(Number(data.amount)||0):(a.balance||0)-(Number(data.amount)||0); return {...a,balance:Math.max(0,v)}; }
    }));
    _notify("accounts");
  }
  // حفظ السند في Supabase
  _sbUpsertSafe("vouchers", [_toDB_vouch(entry)]);
  return entry;
}
export async function getVouchers(accountId) {
  const all=_lsGet("vouchers");
  return accountId ? all.filter(v=>v.accountId===accountId) : all;
}
export async function deleteVoucher(id) {
  const v=_lsGet("vouchers").find(x=>x.id===id);
  if (v&&v.accountId) {
    _lsSet("accounts", _lsGet("accounts").map(a => {
      if(a.id!==v.accountId) return a;
      if(v.currency==='SAR'){const r=v.type==='receipt'?(a.balanceSAR||0)-(Number(v.amount)||0):(a.balanceSAR||0)+(Number(v.amount)||0); return {...a,balanceSAR:Math.max(0,r)};}
      else{const r=v.type==='receipt'?(a.balance||0)-(Number(v.amount)||0):(a.balance||0)+(Number(v.amount)||0); return {...a,balance:Math.max(0,r)};}
    }));
    _notify("accounts");
  }
  _lsSet("vouchers", _lsGet("vouchers").filter(x=>x.id!==id));
  _notify("vouchers");
}

// ===== كشف الحساب =====
export async function getAccountStatement(accountId) {
  const acc = _lsGet("accounts").find(a=>a.id===accountId);

  let vouchers = [];
  let transfers = [];

  if (_supaOk) {
    // جلب مباشر من Supabase مع تصفية في الخادم
    const phone = acc?.phone || "";
    const trfQuery = phone
      ? `receiver_phone=eq.${encodeURIComponent(phone)}&order=created_at.desc&limit=500`
      : `order=created_at.desc&limit=200`;

    const [sbVouch, sbTrf] = await Promise.all([
      _sbSelect("vouchers", `account_id=eq.${encodeURIComponent(accountId)}&order=created_at.desc&limit=500`),
      _sbSelect("transfers", trfQuery)
    ]);

    if (sbVouch) {
      // دمج مع السندات المحلية غير المرفوعة بعد
      const remIds = new Set(sbVouch.map(r=>r.id));
      const localOnly = _lsGet("vouchers").filter(v=>v.accountId===accountId && !remIds.has(v.id));
      vouchers = [ ...sbVouch.map(_fromDB_vouch), ...localOnly ];
    } else {
      vouchers = _lsGet("vouchers").filter(v=>v.accountId===accountId);
    }

    if (sbTrf) {
      // دمج مع الحوالات المحلية غير المرفوعة بعد
      const remIds = new Set(sbTrf.map(r=>r.id));
      const localOnly = _lsGet("transfers").filter(t=>{
        const match = t.beneficiaryId===accountId||(acc&&t.beneficiaryPhone===acc.phone);
        return match && !remIds.has(t.id);
      });
      transfers = [...sbTrf.map(_fromDB_trf), ...localOnly];
    } else {
      transfers = _lsGet("transfers").filter(t=>t.beneficiaryId===accountId||(acc&&t.beneficiaryPhone===acc.phone));
    }
  } else {
    // وضع محلي
    vouchers  = _lsGet("vouchers").filter(v=>v.accountId===accountId);
    transfers = _lsGet("transfers").filter(t=>t.beneficiaryId===accountId||(acc&&t.beneficiaryPhone===acc.phone));
  }

  // إضافة entryType للتمييز بين النوعين
  const all = [
    ...vouchers.map(v=>({...v, entryType:'voucher'})),
    ...transfers.map(t=>({...t, entryType:'transfer'}))
  ];
  all.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  return all;
}

// ===== سجل الواتساب =====
export async function logWA(data) {
  const entry = { id:_uid(), ...data, sentAt:Date.now() };
  const list = _lsGet("wa_logs"); list.unshift(entry);
  if (list.length>200) list.length=200;
  _lsSet("wa_logs", list);
}
export function listenWALogs(cb) {
  if (!_listeners["wa_logs"]) _listeners["wa_logs"]=[];
  _listeners["wa_logs"].push(cb); cb(_lsGet("wa_logs"));
  return ()=>{ _listeners["wa_logs"]=(_listeners["wa_logs"]||[]).filter(x=>x!==cb); };
}

// ===== الإحصاءات =====
export async function getStats() {
  const transfers=_lsGet("transfers"), accounts=_lsGet("accounts");
  return {
    completed:    transfers.filter(t=>t.status==="completed").length,
    pending:      transfers.filter(t=>t.status==="pending").length,
    profit:       transfers.filter(t=>t.status==="completed").reduce((s,t)=>s+(Number(t.commission)||0),0),
    allCompleted: transfers.filter(t=>t.status==="completed").length,
    allPending:   transfers.filter(t=>t.status==="pending").length,
    allProfit:    transfers.filter(t=>t.status==="completed").reduce((s,t)=>s+(Number(t.commission)||0),0),
    allTransfers: transfers.length,
    totalBalance: accounts.reduce((s,a)=>s+(Number(a.balance)||0),0),
    totalAccounts:accounts.length,
    lateAccounts: accounts.filter(a=>a.status==="late").length,
  };
}
export async function getAllTransfers() { return _lsGet("transfers"); }
export async function getAllAccounts()  { return _lsGet("accounts");  }

// إعادة محاولة تلقائية كل 30 ثانية
if (typeof window !== 'undefined') {
  setInterval(async () => {
    if (_pendingCount() > 0 && _supaOk) {
      console.log('⏱️ retry تلقائي...');
      await _forceSync();
    }
  }, 30000);
}
