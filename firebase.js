// ===== نظام محمد سالم — يعمل فوراً في اليمن بدون VPN =====
// LocalStorage أولاً دائماً — Supabase في الخلفية فقط

const SUPA_URL = "https://ezektgzwesrtezeghmrs.supabase.co";
const SUPA_KEY = "sb_publishable_yxYW7KsjVtq_0kMYuaODng_4yvhyRum";

// ===== LocalStorage =====
function _lsGet(key)      { try { return JSON.parse(localStorage.getItem("ms_"+key)||"[]"); } catch { return []; } }
function _lsSet(key, val) { localStorage.setItem("ms_"+key, JSON.stringify(val)); }
function _uid()           { return Math.random().toString(36).slice(2)+Date.now().toString(36); }

const _listeners = {};
function _notify(col) {
  (_listeners[col]||[]).forEach(cb => cb(_lsGet(col)));
}

function _seedLocalData() {
  if (localStorage.getItem("ms_seeded_v2")) return;
  const now = Date.now(), day = 86400000;
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
    { id:_uid(), transferCode:"حو-260524-E5F6", beneficiary:"محمد علي الشمري",   beneficiaryPhone:"967733445566", amount:80000,  currency:"ر.ي", commission:4000,  total:84000,  status:"pending",   createdAt:now-3*day },
    { id:_uid(), transferCode:"حو-260524-G7H8", beneficiary:"عبد الرحمن عقلان",  beneficiaryPhone:"967755667788", amount:900000, currency:"ر.ي", commission:45000, total:945000, status:"pending",   createdAt:now-4*day },
    { id:_uid(), transferCode:"حو-260524-I9J0", beneficiary:"سالم القحطاني",     beneficiaryPhone:"967722334455", amount:200000, currency:"ر.ي", commission:10000, total:210000, status:"completed", createdAt:now-5*day },
  ]);
  _lsSet("vouchers", []);
  _lsSet("wa_logs", []);
  localStorage.setItem("ms_seeded_v2","1");
}
_seedLocalData();

// ===== Supabase — في الخلفية فقط =====
let _supa = null;
let _supaReady = false;

// تحويل: Supabase → JS  (بنية الجداول الحقيقية)
function _fromDB_accounts(r) {
  if (!r) return null;
  return { id:r.id, name:r.name, phone:r.phone||"", balance:Number(r.balance)||0,
    balanceSAR:Number(r.balance_sar)||0, status:r.status||"active", notes:r.notes||"",
    createdAt:r.created_at ? new Date(r.created_at).getTime() : Date.now() };
}
function _fromDB_transfers(r) {
  if (!r) return null;
  // استخراج كود الحوالة والعمولة من حقل notes
  const noteParts = (r.notes||"").split("|");
  const code = noteParts[0]?.trim() || generateTransferCode();
  const commStr = noteParts[1]?.trim() || "";
  const commission = parseInt(commStr.replace(/[^0-9]/g,""))||0;
  return { id:r.id,
    transferCode: code,
    beneficiary: r.receiver_name||"",
    beneficiaryPhone: r.receiver_phone||"",
    senderName: r.sender_name||"",
    amount: Number(r.amount)||0,
    currency: r.currency||"ر.ي",
    commission: commission,
    total: (Number(r.amount)||0) + commission,
    status: r.status||"pending",
    notes: "",
    transferType: "تحويل عادي",
    paymentMethod: "cash",
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now() };
}

// تحويل: JS → Supabase
function _toDB_accounts(d) {
  const r = { name:d.name, phone:d.phone||"", balance:Number(d.balance)||0,
    balance_sar:Number(d.balanceSAR)||0, status:d.status||"active", notes:d.notes||"" };
  if (d.id) r.id = d.id;
  return r;
}
function _toDB_transfers(d) {
  const r = {
    sender_name: d.senderName || "محمد سالم",
    receiver_name: d.beneficiary || "",
    sender_phone: d.senderPhone || localStorage.getItem("s_waNumber") || "967733231636",
    receiver_phone: d.beneficiaryPhone || "",
    amount: Number(d.amount)||0,
    currency: d.currency||"ر.ي",
    status: d.status||"pending",
    notes: `${d.transferCode||""} | عمولة: ${d.commission||0}`
  };
  if (d.id) r.id = d.id;
  return r;
}

// تهيئة Supabase في الخلفية — لا يوقف التطبيق أبداً
(async () => {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const proxyUrl = (localStorage.getItem("s_proxy_url")||"").trim().replace(/\/$/,"");
    const baseUrl = proxyUrl || SUPA_URL;
    const client = createClient(baseUrl, SUPA_KEY, { auth:{ persistSession:false } });

    const { error } = await Promise.race([
      client.from("accounts").select("id").limit(1),
      new Promise((_,r) => setTimeout(()=>r(new Error("timeout")), 8000))
    ]);
    if (error && error.code !== "PGRST116") throw error;

    _supa = client;
    _supaReady = true;
    console.log("☁️ Supabase متصل");

    // مزامنة أولية
    const [accRes, trfRes] = await Promise.all([
      client.from("accounts").select("*").order("created_at",{ascending:false}),
      client.from("transfers").select("*").order("created_at",{ascending:false})
    ]);
    if (!accRes.error && accRes.data && accRes.data.length > 0) {
      _lsSet("accounts", accRes.data.map(_fromDB_accounts));
      _notify("accounts");
      console.log(`⬇️ ${accRes.data.length} حساب من Supabase`);
    } else if (!accRes.error && (!accRes.data || accRes.data.length === 0)) {
      const local = _lsGet("accounts");
      if (local.length > 0) {
        await client.from("accounts").upsert(local.map(_toDB_accounts), {onConflict:"id"});
        console.log(`⬆️ رفع ${local.length} حساب`);
      }
    }
    if (!trfRes.error && trfRes.data && trfRes.data.length > 0) {
      _lsSet("transfers", trfRes.data.map(_fromDB_transfers));
      _notify("transfers");
      console.log(`⬇️ ${trfRes.data.length} حوالة من Supabase`);
    } else if (!trfRes.error && (!trfRes.data || trfRes.data.length === 0)) {
      const local = _lsGet("transfers");
      if (local.length > 0) {
        await client.from("transfers").upsert(local.map(_toDB_transfers), {onConflict:"id"});
        console.log(`⬆️ رفع ${local.length} حوالة`);
      }
    }
  } catch(e) {
    console.log("📱 وضع محلي:", e.message);
  }
})();

// حفظ في الخلفية بصمت
async function _bgSave(table, row) {
  if (!_supaReady || !_supa) return;
  try { await _supa.from(table).upsert([row], {onConflict:"id"}); } catch {}
}
async function _bgDelete(table, id) {
  if (!_supaReady || !_supa) return;
  try { await _supa.from(table).delete().eq("id", id); } catch {}
}
async function _bgUpdate(table, id, data) {
  if (!_supaReady || !_supa) return;
  try { await _supa.from(table).update(data).eq("id", id); } catch {}
}

// ===== كود الحوالة =====
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
  if (_supaReady && _supa) {
    try {
      const rows = Object.keys(data).map(k => ({ key:k, value:String(data[k]) }));
      await _supa.from("settings").upsert(rows, { onConflict:"key" });
    } catch {}
  }
}
export async function loadSettings() {
  if (_supaReady && _supa) {
    try {
      const { data, error } = await _supa.from("settings").select("*");
      if (!error && data) { const obj={}; data.forEach(r=>{ obj[r.key]=r.value; }); return obj; }
    } catch {}
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
  _notify("transfers");
  if (data.paymentMethod === 'balance' && data.beneficiaryId) {
    _lsSet("accounts", _lsGet("accounts").map(a => a.id===data.beneficiaryId
      ? {...a, balance:Math.max(0,(Number(a.balance)||0)-(Number(data.total)||0))} : a));
    _notify("accounts");
  }
  _bgSave("transfers", _toDB_transfers({...data, transferCode:code, id:entry.id}));
  return entry;
}

export async function getTransfers(n=500) {
  return _lsGet("transfers").slice(0, n);
}

export function listenTransfers(cb) {
  if (!_listeners["transfers"]) _listeners["transfers"] = [];
  _listeners["transfers"].push(cb);
  cb(_lsGet("transfers"));
  return () => { _listeners["transfers"] = (_listeners["transfers"]||[]).filter(x=>x!==cb); };
}

export async function updateTransferStatus(id, status) {
  _lsSet("transfers", _lsGet("transfers").map(t => t.id===id ? {...t, status, updatedAt:Date.now()} : t));
  _notify("transfers");
  _bgUpdate("transfers", id, { status });
}

export async function deleteTransfer(id) {
  _lsSet("transfers", _lsGet("transfers").filter(t => t.id!==id));
  _notify("transfers");
  _bgDelete("transfers", id);
}

export async function findTransferByCode(code) {
  return _lsGet("transfers").find(t => t.transferCode===code) || null;
}

// ===== الحسابات =====
export async function addAccount(data) {
  const entry = { id:_uid(), ...data, balance:Number(data.balance)||0, balanceSAR:Number(data.balanceSAR)||0, status:data.status||"active", createdAt:Date.now() };
  const list = _lsGet("accounts");
  list.unshift(entry);
  _lsSet("accounts", list);
  _notify("accounts");
  _bgSave("accounts", _toDB_accounts({...data, id:entry.id}));
  return entry;
}

export async function getAccounts() {
  return _lsGet("accounts");
}

export function listenAccounts(cb) {
  if (!_listeners["accounts"]) _listeners["accounts"] = [];
  _listeners["accounts"].push(cb);
  cb(_lsGet("accounts"));
  return () => { _listeners["accounts"] = (_listeners["accounts"]||[]).filter(x=>x!==cb); };
}

export async function updateAccount(id, data) {
  _lsSet("accounts", _lsGet("accounts").map(a => a.id===id ? {...a, ...data, updatedAt:Date.now()} : a));
  _notify("accounts");
  const dbData = _toDB_accounts(data); delete dbData.id;
  _bgUpdate("accounts", id, dbData);
}

export async function deleteAccount(id) {
  _lsSet("accounts", _lsGet("accounts").filter(a => a.id!==id));
  _notify("accounts");
  _bgDelete("accounts", id);
}

// ===== السندات =====
export async function addVoucher(data) {
  const entry = { id:_uid(), ...data, createdAt:Date.now() };
  const list = _lsGet("vouchers");
  list.unshift(entry);
  _lsSet("vouchers", list);
  _notify("vouchers");
  if (data.accountId) {
    _lsSet("accounts", _lsGet("accounts").map(a => {
      if (a.id !== data.accountId) return a;
      if (data.currency === 'SAR') {
        const v = data.type==='receipt'?(a.balanceSAR||0)+(Number(data.amount)||0):(a.balanceSAR||0)-(Number(data.amount)||0);
        return {...a, balanceSAR:v};
      } else {
        const v = data.type==='receipt'?(a.balance||0)+(Number(data.amount)||0):(a.balance||0)-(Number(data.amount)||0);
        return {...a, balance:Math.max(0,v)};
      }
    }));
    _notify("accounts");
  }
  return entry;
}

export async function getVouchers(accountId) {
  const all = _lsGet("vouchers");
  return accountId ? all.filter(v => v.accountId===accountId) : all;
}

export async function deleteVoucher(id) {
  const v = _lsGet("vouchers").find(x=>x.id===id);
  if (v && v.accountId) {
    _lsSet("accounts", _lsGet("accounts").map(a => {
      if (a.id!==v.accountId) return a;
      if (v.currency==='SAR') {
        const r = v.type==='receipt'?(a.balanceSAR||0)-(Number(v.amount)||0):(a.balanceSAR||0)+(Number(v.amount)||0);
        return {...a, balanceSAR:Math.max(0,r)};
      } else {
        const r = v.type==='receipt'?(a.balance||0)-(Number(v.amount)||0):(a.balance||0)+(Number(v.amount)||0);
        return {...a, balance:Math.max(0,r)};
      }
    }));
    _notify("accounts");
  }
  _lsSet("vouchers", _lsGet("vouchers").filter(x=>x.id!==id));
  _notify("vouchers");
}

// ===== سجل الواتساب =====
export async function logWA(data) {
  const entry = { id:_uid(), ...data, sentAt:Date.now() };
  const list = _lsGet("wa_logs");
  list.unshift(entry);
  if (list.length > 200) list.length = 200;
  _lsSet("wa_logs", list);
}

// ===== الإحصاءات =====
export async function getStats() {
  const transfers = _lsGet("transfers");
  const accounts  = _lsGet("accounts");
  const today = new Date(); today.setHours(0,0,0,0);
  const todayTs = today.getTime();
  const todayTrf = transfers.filter(t => t.createdAt >= todayTs);
  return {
    completed:     todayTrf.filter(t=>t.status==="completed").length,
    pending:       todayTrf.filter(t=>t.status==="pending").length,
    profit:        todayTrf.filter(t=>t.status==="completed").reduce((s,t)=>s+(Number(t.commission)||0),0),
    allCompleted:  transfers.filter(t=>t.status==="completed").length,
    allPending:    transfers.filter(t=>t.status==="pending").length,
    allProfit:     transfers.filter(t=>t.status==="completed").reduce((s,t)=>s+(Number(t.commission)||0),0),
    totalAccounts: accounts.length,
    lateAccounts:  accounts.filter(a=>a.status==="late").length,
  };
}

export async function getAllTransfers() { return _lsGet("transfers"); }
export async function getAllAccounts()  { return _lsGet("accounts");  }

// ===== كشف الحساب =====
export async function getAccountStatement(accountId) {
  const vouchers = _lsGet("vouchers").filter(v => v.accountId === accountId);
  const transfers = _lsGet("transfers").filter(t => t.beneficiaryId === accountId || t.beneficiaryPhone === (_lsGet("accounts").find(a=>a.id===accountId)||{}).phone);
  const all = [
    ...vouchers.map(v => ({...v, _type:'voucher'})),
    ...transfers.map(t => ({...t, _type:'transfer'}))
  ];
  all.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  return all;
}

// ===== سجل الواتساب — مستمع =====
export function listenWALogs(cb) {
  if (!_listeners["wa_logs"]) _listeners["wa_logs"] = [];
  _listeners["wa_logs"].push(cb);
  cb(_lsGet("wa_logs"));
  return () => { _listeners["wa_logs"] = (_listeners["wa_logs"]||[]).filter(x=>x!==cb); };
}
