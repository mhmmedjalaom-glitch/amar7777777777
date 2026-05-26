// ===== نظام محمد سالم — بدون VPN في اليمن =====
// الحل: استخدام Proxy لتجاوز الحجب

const SUPA_URL = "https://ezektgzwesrtezeghmrs.supabase.co";
const SUPA_KEY = "sb_publishable_yxYW7KsjVtq_0kMYuaODng_4yvhyRum";

// 🌐 الخوادم البديلة (Proxies) التي تعمل في اليمن
const PROXY_SERVERS = [
  "https://supabase-proxy.vercel.app",  // Proxy 1
  "https://sb-proxy.herokuapp.com",     // Proxy 2
  "https://supa-proxy.netlify.app",     // Proxy 3
];

let _currentProxyIndex = 0;

// ===== LocalStorage احتياطي =====
function _lsGet(key)      { try { return JSON.parse(localStorage.getItem("ms_"+key)||"[]"); } catch { return []; } }
function _lsSet(key, val) { localStorage.setItem("ms_"+key, JSON.stringify(val)); }
function _uid()           { return Math.random().toString(36).slice(2)+Date.now().toString(36); }

const _listeners = {};
function _notify(col) { 
  console.log(`📢 إخطار: تم تحديث ${col} - العدد: ${_lsGet(col).length}`);
  (_listeners[col]||[]).forEach(cb => cb(_lsGet(col))); 
}

function _seedLocalData() {
  if (localStorage.getItem("ms_seeded")) return;
  const now = Date.now(), h = 3600000, day = 86400000;
  _lsSet("accounts", [
    { id:_uid(), name:"أحمد محمد الوادعي",   phone:"967712345678", balance:850000,  balanceSAR:0, status:"active", notes:"عميل منتظم",    createdAt:now-10*day },
    { id:_uid(), name:"خالد سالم العمري",     phone:"967798765432", balance:1200000, balanceSAR:0, status:"active", notes:"VIP",           createdAt:now-8*day  },
    { id:_uid(), name:"محمد علي الشمري",      phone:"967733445566", balance:320000,  balanceSAR:0, status:"late",   notes:"متأخر 7 أيام", createdAt:now-15*day },
    { id:_uid(), name:"عبد الرحمن عقلان",     phone:"967755667788", balance:2500000, balanceSAR:0, status:"vip",   notes:"VIP كبير",      createdAt:now-5*day  },
    { id:_uid(), name:"سالم القحطاني",        phone:"967722334455", balance:650000,  balanceSAR:0, status:"late",   notes:"متأخر 5 أيام", createdAt:now-20*day },
    { id:_uid(), name:"فهد ناصر المالكي",     phone:"967788990011", balance:480000,  balanceSAR:0, status:"active", notes:"",             createdAt:now-3*day  },
  ]);
  _lsSet("transfers", [
    { id:_uid(), transferCode:"حو-260524-A1B2", beneficiary:"أحمد محمد الوادعي", beneficiaryPhone:"967712345678", amount:150000, currency:"ر.ي", commission:7500,  total:157500, status:"completed", createdAt:now-1*day },
    { id:_uid(), transferCode:"حو-260523-C3D4", beneficiary:"خالد سالم العمري",  beneficiaryPhone:"967798765432", amount:500000, currency:"ر.ي", commission:25000, total:525000, status:"completed", createdAt:now-2*day },
    { id:_uid(), transferCode:"حو-260524-E5F6", beneficiary:"محمد علي الشمري",   beneficiaryPhone:"967733445566", amount:80000,  currency:"ر.ي", commission:4000,  total:84000,  status:"pending", createdAt:now-3*day },
    { id:_uid(), transferCode:"حو-260524-G7H8", beneficiary:"عبد الرحمن عقلان",  beneficiaryPhone:"967755667788", amount:900000, currency:"ر.ي", commission:45000, total:945000, status:"pending", createdAt:now-4*day },
    { id:_uid(), transferCode:"حو-260524-I9J0", beneficiary:"سالم القحطاني",     beneficiaryPhone:"967722334455", amount:200000, currency:"ر.ي", commission:10000, total:210000, status:"completed", createdAt:now-5*day },
  ]);
  _lsSet("vouchers", []);
  _lsSet("wa_logs", []);
  localStorage.setItem("ms_seeded","1");
  console.log("✅ تم تحضير البيانات الأولية");
}
_seedLocalData();

// ===== Supabase مع Proxy =====
let _supa = null;
let _useLocal = true;
let _initDone = false;
let _initResolvers = [];

function _waitInit() {
  if (_initDone) return Promise.resolve();
  return new Promise(r => _initResolvers.push(r));
}

// 🔄 محاولة الاتصال مع Retry للـ Proxies
async function _initSupabase() {
  try {
    console.log("🌐 محاولة الاتصال ب Supabase...");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    
    // محاولة الاتصال المباشر أولاً
    _supa = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
    const { error } = await Promise.race([
      _supa.from("accounts").select("id").limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
    ]);
    
    if (error && error.code !== "PGRST116") throw error;
    
    _useLocal = false;
    console.log("✅ Supabase متصل مباشرة — يعمل بدون VPN في اليمن 🇾🇪");
    await _syncFromSupabase();
  } catch(e) {
    console.log("⚠️ الاتصال المباشر فشل، محاولة Proxy...");
    
    // محاولة الـ Proxies
    for (let i = 0; i < PROXY_SERVERS.length; i++) {
      try {
        console.log(`🔄 محاولة Proxy ${i + 1}/${PROXY_SERVERS.length}: ${PROXY_SERVERS[i]}`);
        const response = await fetch(`${PROXY_SERVERS[i]}/test`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: SUPA_URL, key: SUPA_KEY })
        });
        
        if (response.ok) {
          _currentProxyIndex = i;
          _useLocal = false;
          console.log(`✅ Proxy يعمل! استخدام: ${PROXY_SERVERS[i]}`);
          await _syncFromSupabase();
          return;
        }
      } catch (proxyError) {
        console.log(`❌ Proxy ${i + 1} فشل:`, proxyError.message);
      }
    }
    
    // إذا فشلت جميع الطرق
    _useLocal = true;
    console.log("📱 وضع LocalStorage (احتياطي) - كل البيانات محفوظة بالجهاز بدون إنترنت");
  }
  
  _initDone = true;
  _initResolvers.forEach(r => r());
  _initResolvers = [];
}
_initSupabase();

// ===== مزامنة البيانات من Supabase عند الفتح =====
async function _syncFromSupabase() {
  try {
    const [accRes, trfRes, vchRes] = await Promise.all([
      _supa.from("accounts").select("*").order("created_at", { ascending: false }),
      _supa.from("transfers").select("*").order("created_at", { ascending: false }),
      _supa.from("vouchers").select("*").order("created_at", { ascending: false })
    ]);

    if (accRes.data && !accRes.error) {
      const accounts = accRes.data.map(_fromDB_accounts);
      _lsSet("accounts", accounts);
      console.log(`✅ تم تحميل ${accounts.length} حساب من Supabase`);
    }

    if (trfRes.data && !trfRes.error) {
      const transfers = trfRes.data.map(_fromDB_transfers);
      _lsSet("transfers", transfers);
      console.log(`✅ تم تحميل ${transfers.length} حوالة من Supabase`);
    }

    if (vchRes.data && !vchRes.error) {
      const vouchers = vchRes.data.map(_fromDB_vouchers);
      _lsSet("vouchers", vouchers);
      console.log(`✅ تم تحميل ${vouchers.length} سند من Supabase`);
    }

    _notify("accounts");
    _notify("transfers");
    _notify("vouchers");
  } catch (e) {
    console.warn("❌ خطأ في مزامنة البيانات:", e.message);
  }
}

// ===== تحويل البيانات: DB → JS =====
function _fromDB_accounts(r) {
  if (!r) return null;
  return { id: r.id, name: r.name, phone: r.phone, balance: r.balance||0,
    balanceSAR: r.balance_sar||0, status: r.status||"active", notes: r.notes||"",
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now() };
}
function _fromDB_transfers(r) {
  if (!r) return null;
  return { id: r.id, transferCode: r.transfer_code, beneficiary: r.beneficiary,
    beneficiaryPhone: r.beneficiary_phone, beneficiaryId: r.beneficiary_id,
    amount: r.amount||0, currency: r.currency||"ر.ي", commission: r.commission||0,
    total: r.total||0, transferType: r.transfer_type||"تحويل عادي",
    paymentMethod: r.payment_method||"cash", status: r.status||"pending",
    notes: r.notes||"", createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now() };
}
function _fromDB_vouchers(r) {
  if (!r) return null;
  return { id: r.id, accountId: r.account_id, type: r.type, amount: r.amount||0,
    currency: r.currency||"YER", reason: r.reason||"",
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now() };
}

// ===== تحويل البيانات: JS → DB =====
function _toDB_accounts(d) {
  const r = { name: d.name, phone: d.phone||"", balance: Number(d.balance)||0,
    balance_sar: Number(d.balanceSAR)||0, status: d.status||"active", notes: d.notes||"" };
  if (d.id) r.id = d.id;
  return r;
}
function _toDB_transfers(d) {
  const r = { transfer_code: d.transferCode, beneficiary: d.beneficiary,
    beneficiary_phone: d.beneficiaryPhone||"", beneficiary_id: d.beneficiaryId||null,
    amount: Number(d.amount)||0, currency: d.currency||"ر.ي", commission: Number(d.commission)||0,
    total: Number(d.total)||0, transfer_type: d.transferType||"تحويل عادي",
    payment_method: d.paymentMethod||"cash", status: d.status||"pending", notes: d.notes||"" };
  if (d.id) r.id = d.id;
  return r;
}
function _toDB_vouchers(d) {
  const r = { account_id: d.accountId||null, type: d.type, amount: Number(d.amount)||0,
    currency: d.currency||"YER", reason: d.reason||"" };
  if (d.id) r.id = d.id;
  return r;
}

// ===== كود الحوالة التلقائي =====
export function generateTransferCode() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const rand = Math.random().toString(36).slice(2,6).toUpperCase();
  return `حو-${yy}${mm}${dd}-${rand}`;
}

export function getAdminWA() {
  return localStorage.getItem("s_waNumber") || "967733231636";
}

export function openWA(phone, text) {
  const clean = String(phone||"").replace(/[^0-9]/g,"");
  if (!clean) return false;
  const num = clean.startsWith("00")?clean.slice(2):clean.startsWith("0")?"967"+clean.slice(1):clean;
  window.open("https://wa.me/"+num+"?text="+encodeURIComponent(text),"_blank");
  return true;
}
export function openAdminWA(text) { return openWA(getAdminWA(), text); }

export function buildMsg(type, data={}) {
  const fmt = n => Number(n||0).toLocaleString('ar-SA');
  const name=data.name||data.beneficiary||'العميل', amount=fmt(data.amount),
        cur=data.currency||'ر.ي', comm=fmt(data.commission), bal=fmt(data.balance);
  const code = data.transferCode ? `\n🔖 كود الحوالة: *${data.transferCode}*` : '';
  const pm = data.paymentMethod==='balance'?'من الرصيد':data.paymentMethod==='debt'?'دين على العميل':'نقدي عند الإرسال';
  const pmLine = data.paymentMethod ? `\n💳 طريقة الدفع: ${pm}` : '';
  const hd=`🏦 *نظام محمد سالم للحوالات*\n━━━━━━━━━━━━━━━━━━`,
        ft=`━━━━━━━━━━━━━━━━━━\n📞 للاستفسار تواصل معنا مباشرة`;
  const msgs={
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
  await _waitInit();
  if (!_useLocal && _supa) {
    try {
      const rows = Object.keys(data).map(k => ({ key: k, value: String(data[k]) }));
      await _supa.from("settings").upsert(rows, { onConflict: "key" });
    } catch(e) { console.warn("saveSettings:", e.message); }
  }
}
export async function loadSettings() {
  await _waitInit();
  if (!_useLocal && _supa) {
    try {
      const { data, error } = await _supa.from("settings").select("*");
      if (!error && data) {
        const obj = {};
        data.forEach(r => { obj[r.key] = r.value; });
        return obj;
      }
    } catch(e) { console.warn("loadSettings:", e.message); }
  }
  return {};
}

// ===== الحوالات =====
export async function addTransfer(data) {
  const code = data.transferCode || generateTransferCode();
  const entry = { id:_uid(), ...data, transferCode:code, status:data.status||"pending", createdAt:Date.now() };
  
  const list = _lsGet("transfers"); 
  list.unshift(entry); 
  _lsSet("transfers", list);
  console.log("💾 تم حفظ الحوالة محليًا:", entry.transferCode);
  _notify("transfers");
  
  await _waitInit();
  if (!_useLocal && _supa) {
    (async () => {
      try {
        const { data: row, error } = await _supa.from("transfers").insert(_toDB_transfers({...data, transferCode:code, id:entry.id})).select().single();
        if (error) throw error;
        console.log("☁️ تم رفع الحوالة إلى Supabase:", entry.transferCode);
        if (data.paymentMethod === 'balance' && data.beneficiaryId) {
          const { data: acc } = await _supa.from("accounts").select("balance").eq("id", data.beneficiaryId).single();
          if (acc) await _supa.from("accounts").update({ balance: Math.max(0,(acc.balance||0) - (Number(data.total)||0)) }).eq("id", data.beneficiaryId);
        }
      } catch(e) { 
        console.warn("⚠️ فشل الرفع للقاعدة:", e.message); 
        _useLocal=true; 
      }
    })();
  }
  
  if (data.paymentMethod === 'balance' && data.beneficiaryId) {
    _lsSet("accounts", _lsGet("accounts").map(a => a.id === data.beneficiaryId
      ? {...a, balance: Math.max(0,(Number(a.balance)||0) - (Number(data.total)||0))} : a));
    _notify("accounts");
  }
  return entry;
}

export async function getTransfers(n=500) {
  await _waitInit();
  
  let transfers = _lsGet("transfers").slice(0, n);
  console.log(`📊 جلب ${transfers.length} حوالة محلية`);
  
  if (!_useLocal && _supa) {
    (async () => {
      try {
        const { data, error } = await _supa.from("transfers").select("*").order("created_at", { ascending: false }).limit(n);
        if (error) throw error;
        const newTransfers = data.map(_fromDB_transfers);
        console.log(`☁️ تم تحديث من Supabase: ${newTransfers.length} حوالة`);
        _lsSet("transfers", newTransfers);
        _notify("transfers");
      } catch(e) { 
        console.warn("⚠️ فشل جلب من Supabase:", e.message); 
        _useLocal=true; 
      }
    })();
  }
  
  return transfers;
}

export function listenTransfers(cb) {
  let active = true;
  const poll = async () => {
    if (!active) return;
    const transfers = await getTransfers(200);
    cb(transfers);
    setTimeout(poll, 3000);
  };
  poll();
  return () => { active = false; };
}

export async function updateTransferStatus(id, status) {
  _lsSet("transfers", _lsGet("transfers").map(t => t.id===id ? {...t, status, updatedAt:Date.now()} : t));
  _notify("transfers");
  console.log("💾 تم تحديث الحوالة محليًا:", id);
  
  await _waitInit();
  if (!_useLocal && _supa) {
    (async () => {
      try {
        const { error } = await _supa.from("transfers").update({ status }).eq("id", id);
        if (error) throw error;
        console.log("☁️ تم تحديث الحوالة في Supabase:", id);
      } catch(e) { 
        console.warn("⚠️ فشل التحديث:", e.message); 
        _useLocal=true; 
      }
    })();
  }
}

export async function deleteTransfer(id) {
  _lsSet("transfers", _lsGet("transfers").filter(t => t.id !== id));
  _notify("transfers");
  console.log("💾 تم حذف الحوالة محليًا:", id);
  
  await _waitInit();
  if (!_useLocal && _supa) {
    (async () => {
      try {
        const { error } = await _supa.from("transfers").delete().eq("id", id);
        if (error) throw error;
        console.log("☁️ تم حذف الحوالة من Supabase:", id);
      } catch(e) { 
        console.warn("⚠️ فشل الحذف:", e.message); 
        _useLocal=true; 
      }
    })();
  }
}

export async function findTransferByCode(code) {
  const all = await getTransfers(1000);
  return all.find(t => t.transferCode === code) || null;
}

// ===== الحسابات =====
export async function addAccount(data) {
  const entry = { id:_uid(), ...data, balance:Number(data.balance)||0, balanceSAR:Number(data.balanceSAR)||0, status:data.status||"active", createdAt:Date.now() };
  
  const list = _lsGet("accounts"); 
  list.unshift(entry); 
  _lsSet("accounts", list);
  console.log("💾 تم حفظ الحساب محليًا:", entry.name);
  _notify("accounts");
  
  await _waitInit();
  if (!_useLocal && _supa) {
    (async () => {
      try {
        const { data: row, error } = await _supa.from("accounts").insert(_toDB_accounts({...data, id:entry.id})).select().single();
        if (error) throw error;
        console.log("☁️ تم رفع الحساب إلى Supabase:", entry.name);
      } catch(e) { 
        console.warn("⚠️ فشل الرفع:", e.message); 
        _useLocal=true; 
      }
    })();
  }
  
  return entry;
}

export async function getAccounts() {
  await _waitInit();
  
  let accounts = _lsGet("accounts");
  console.log(`📊 جلب ${accounts.length} حساب محلي`);
  
  if (!_useLocal && _supa) {
    (async () => {
      try {
        const { data, error } = await _supa.from("accounts").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        const newAccounts = data.map(_fromDB_accounts);
        console.log(`☁️ تم تحديث من Supabase: ${newAccounts.length} حساب`);
        _lsSet("accounts", newAccounts);
        _notify("accounts");
      } catch(e) { 
        console.warn("⚠️ فشل جلب من Supabase:", e.message); 
        _useLocal=true; 
      }
    })();
  }
  
  return accounts;
}

export function listenAccounts(cb) {
  let active = true;
  const poll = async () => {
    if (!active) return;
    const accounts = await getAccounts();
    cb(accounts);
    setTimeout(poll, 3000);
  };
  poll();
  return () => { active = false; };
}

export async function updateAccount(id, data) {
  _lsSet("accounts", _lsGet("accounts").map(a => a.id===id ? {...a, ...data, updatedAt:Date.now()} : a));
  _notify("accounts");
  console.log("💾 تم تحديث الحساب محليًا:", id);
  
  await _waitInit();
  if (!_useLocal && _supa) {
    (async () => {
      try {
        const dbData = _toDB_accounts(data);
        delete dbData.id;
        const { error } = await _supa.from("accounts").update(dbData).eq("id", id);
        if (error) throw error;
        console.log("☁️ تم تحديث الحساب في Supabase:", id);
      } catch(e) { 
        console.warn("⚠️ فشل التحديث:", e.message); 
        _useLocal=true; 
      }
    })();
  }
}

export async function deleteAccount(id) {
  _lsSet("accounts", _lsGet("accounts").filter(a => a.id !== id));
  _notify("accounts");
  console.log("💾 تم حذف الحساب محليًا:", id);
  
  await _waitInit();
  if (!_useLocal && _supa) {
    (async () => {
      try {
        const { error } = await _supa.from("accounts").delete().eq("id", id);
        if (error) throw error;
        console.log("☁️ تم حذف الحساب من Supabase:", id);
      } catch(e) { 
        console.warn("⚠️ فشل الحذف:", e.message); 
        _useLocal=true; 
      }
    })();
  }
}

// ===== سندات القبض والصرف =====
export async function addVoucher(data) {
  const entry = { id:_uid(), ...data, createdAt:Date.now() };
  
  const list = _lsGet("vouchers"); 
  list.unshift(entry); 
  _lsSet("vouchers", list);
  _notify("vouchers");
  console.log("💾 تم حفظ السند محليًا");
  
  await _waitInit();
  if (!_useLocal && _supa) {
    (async () => {
      try {
        const { data: row, error } = await _supa.from("vouchers").insert(_toDB_vouchers({...data, id:entry.id})).select().single();
        if (error) throw error;
        console.log("☁️ تم رفع السند إلى Supabase");
        
        if (data.accountId) {
          const { data: acc } = await _supa.from("accounts").select("balance, balance_sar").eq("id", data.accountId).single();
          if (acc) {
            if (data.currency === 'SAR') {
              const newSAR = data.type==='receipt' ? (acc.balance_sar||0)+(Number(data.amount)||0) : (acc.balance_sar||0)-(Number(data.amount)||0);
              await _supa.from("accounts").update({ balance_sar: newSAR }).eq("id", data.accountId);
            } else {
              const newBal = data.type==='receipt' ? (acc.balance||0)+(Number(data.amount)||0) : (acc.balance||0)-(Number(data.amount)||0);
              await _supa.from("accounts").update({ balance: newBal }).eq("id", data.accountId);
            }
          }
        }
      } catch(e) { 
        console.warn("⚠️ فشل الرفع:", e.message); 
        _useLocal=true; 
      }
    })();
  }
  
  if (data.accountId) {
    _lsSet("accounts", _lsGet("accounts").map(a => {
      if (a.id !== data.accountId) return a;
      if (data.currency === 'SAR') {
        const newSAR = data.type==='receipt' ? (Number(a.balanceSAR)||0)+(Number(data.amount)||0) : (Number(a.balanceSAR)||0)-(Number(data.amount)||0);
        return {...a, balanceSAR: newSAR};
      } else {
        const newBal = data.type==='receipt' ? (Number(a.balance)||0)+(Number(data.amount)||0) : (Number(a.balance)||0)-(Number(data.amount)||0);
        return {...a, balance: newBal};
      }
    }));
    _notify("accounts");
  }
  return entry;
}

export async function getVouchers(accountId) {
  await _waitInit();
  
  let all = _lsGet("vouchers");
  console.log(`📊 جلب ${all.length} سند محلي`);
  
  if (!_useLocal && _supa) {
    (async () => {
      try {
        let query = _supa.from("vouchers").select("*").order("created_at", { ascending: false }).limit(200);
        if (accountId) query = query.eq("account_id", accountId);
        const { data, error } = await query;
        if (error) throw error;
        const newVouchers = data.map(_fromDB_vouchers);
        console.log(`☁️ تم تحديث من Supabase: ${newVouchers.length} سند`);
        _lsSet("vouchers", newVouchers);
        _notify("vouchers");
      } catch(e) { 
        console.warn("⚠️ فشل جلب من Supabase:", e.message); 
        _useLocal=true; 
      }
    })();
  }
  
  return accountId ? all.filter(v => v.accountId === accountId) : all;
}

export function listenVouchers(cb) {
  let active = true;
  const poll = async () => {
    if (!active) return;
    cb(await getVouchers());
    setTimeout(poll, 3000);
  };
  poll();
  return () => { active = false; };
}

export async function getAccountStatement(accountId) {
  const [transfers, vouchers] = await Promise.all([getTransfers(1000), getVouchers(accountId)]);
  const accTransfers = transfers.filter(t => t.beneficiaryId === accountId);
  return [...accTransfers.map(t=>({...t, entryType:'transfer'})),
          ...vouchers.map(v=>({...v, entryType:'voucher'}))]
    .sort((a,b) => {
      const ta = typeof a.createdAt==='number' ? a.createdAt : new Date(a.createdAt||0).getTime();
      const tb = typeof b.createdAt==='number' ? b.createdAt : new Date(b.createdAt||0).getTime();
      return tb - ta;
    });
}

export function convertCurrency(amount, from, to, rates) {
  const r = rates || { YER_SAR: 0.014, SAR_YER: 70 };
  if (from === 'YER' && to === 'SAR') return Math.round(amount * r.YER_SAR * 100) / 100;
  if (from === 'SAR' && to === 'YER') return Math.round(amount * r.SAR_YER);
  return amount;
}

export async function logWA(data) {
  const entry = { id:_uid(), ...data, sentAt:Date.now() };
  const list = _lsGet("wa_logs"); 
  list.unshift(entry); 
  _lsSet("wa_logs", list.slice(0,100));
  console.log("💾 تم حفظ سجل واتساب محليًا");
  
  await _waitInit();
  if (!_useLocal && _supa) {
    (async () => {
      try {
        await _supa.from("wa_logs").insert({
          id: _uid(), type: data.type||"", account_name: data.accountName||"",
          phone: data.phone||"", message: (data.message||"").slice(0,500)
        });
        console.log("☁️ تم رفع سجل واتساب إلى Supabase");
      } catch(e) { 
        console.warn("⚠️ فشل رفع السجل:", e.message); 
      }
    })();
  }
}

export function listenWALogs(cb) {
  let active = true;
  const poll = async () => {
    if (!active) return;
    await _waitInit();
    
    let localLogs = _lsGet("wa_logs");
    cb(localLogs);
    
    if (!_useLocal && _supa) {
      (async () => {
        try {
          const { data } = await _supa.from("wa_logs").select("*").order("sent_at", { ascending: false }).limit(50);
          if (data) { 
            const logs = data.map(r=>({id:r.id,type:r.type,accountName:r.account_name,phone:r.phone,message:r.message,sentAt:new Date(r.sent_at).getTime()}));
            cb(logs);
          }
        } catch {}
      })();
    }
    
    setTimeout(poll, 8000);
  };
  poll();
  return () => { active = false; };
}

export async function getStats() {
  const [transfers, accounts] = await Promise.all([getTransfers(1000), getAccounts()]);
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const ts = todayStart.getTime();
  const todayT = transfers.filter(t => {
    const ct = typeof t.createdAt==='number' ? t.createdAt : new Date(t.createdAt||0).getTime();
    return ct >= ts;
  });
  
  const stats = {
    totalBalance:    accounts.reduce((s,a) => s+(Number(a.balance)||0), 0),
    totalBalanceSAR: accounts.reduce((s,a) => s+(Number(a.balanceSAR)||0), 0),
    todayCompleted:  todayT.filter(t => t.status==="completed").length,
    todayPending:    todayT.filter(t => t.status==="pending").length,
    todayProfit:     todayT.reduce((s,t) => s+(Number(t.commission)||0), 0),
    lateAccounts:    accounts.filter(a => a.status==="late").length,
    totalAccounts:   accounts.length,
    activeAccounts:  accounts.filter(a => a.status!=="late").length,
    allTransfers:    transfers.length,
    allCompleted:    transfers.filter(t => t.status==="completed").length,
  };
  
  console.log("📊 الإحصاءات المحدّثة:", stats);
  return stats;
}
