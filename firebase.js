// ===== نظام محمد سالم — يعمل بدون VPN وبدون إنترنت =====
// CDN: esm.sh (ليس Google) + LocalStorage كاحتياطي كامل

function _lsGet(key)      { try { return JSON.parse(localStorage.getItem("ms_"+key)||"[]"); } catch { return []; } }
function _lsSet(key, val) { localStorage.setItem("ms_"+key, JSON.stringify(val)); }
function _uid()           { return Math.random().toString(36).slice(2)+Date.now().toString(36); }

const _listeners = {};
function _notify(col) { (_listeners[col]||[]).forEach(cb => cb(_lsGet(col))); }

function _seedLocalData() {
  if (localStorage.getItem("ms_seeded")) return;
  const now = Date.now(), h = 3600000, day = 86400000;
  _lsSet("accounts", [
    { id:_uid(), name:"أحمد محمد الوادعي",     phone:"967712345678", balance:850000,  balanceSAR:0, status:"active", notes:"عميل منتظم",    createdAt:now-10*day },
    { id:_uid(), name:"خالد سالم العمري",       phone:"967798765432", balance:1200000, balanceSAR:0, status:"active", notes:"VIP",           createdAt:now-8*day  },
    { id:_uid(), name:"محمد علي الشمري",        phone:"967733445566", balance:320000,  balanceSAR:0, status:"late",   notes:"متأخر 7 أيام", createdAt:now-15*day },
    { id:_uid(), name:"عبد الرحمن عقلان",       phone:"967755667788", balance:2500000, balanceSAR:0, status:"vip",   notes:"VIP كبير",      createdAt:now-5*day  },
    { id:_uid(), name:"سالم القحطاني",          phone:"967722334455", balance:650000,  balanceSAR:0, status:"late",   notes:"متأخر 5 أيام", createdAt:now-20*day },
    { id:_uid(), name:"فهد ناصر المالكي",       phone:"967788990011", balance:480000,  balanceSAR:0, status:"active", notes:"",             createdAt:now-3*day  },
  ]);
  _lsSet("transfers", [
    { id:_uid(), transferCode:"حو-260524-A1B2", beneficiary:"أحمد محمد الوادعي", beneficiaryPhone:"967712345678", amount:150000, currency:"ر.ي", commission:7500, total:157500, transferType:"تحويل عادي", paymentMethod:"cash", status:"completed", notes:"", createdAt:now-2*day },
    { id:_uid(), transferCode:"حو-260523-C3D4", beneficiary:"خالد سالم العمري",  beneficiaryPhone:"967798765432", amount:500000, currency:"ر.ي", commission:25000, total:525000, transferType:"تحويل VIP", paymentMethod:"balance", status:"completed", notes:"", createdAt:now-day },
    { id:_uid(), transferCode:"حو-260524-E5F6", beneficiary:"محمد علي الشمري",   beneficiaryPhone:"967733445566", amount:80000, currency:"ر.ي", commission:4000, total:84000, transferType:"تحويل عادي", paymentMethod:"debt", status:"pending", notes:"", createdAt:now-3*h },
    { id:_uid(), transferCode:"حو-260524-G7H8", beneficiary:"عبد الرحمن عقلان",  beneficiaryPhone:"967755667788", amount:900000, currency:"ر.ي", commission:45000, total:945000, transferType:"تحويل عاجل", paymentMethod:"cash", status:"completed", notes:"", createdAt:now-5*h },
    { id:_uid(), transferCode:"حو-260524-I9J0", beneficiary:"سالم القحطاني",     beneficiaryPhone:"967722334455", amount:200000, currency:"ر.ي", commission:10000, total:210000, transferType:"تحويل عادي", paymentMethod:"debt", status:"pending", notes:"", createdAt:now-30*60000 },
  ]);
  _lsSet("vouchers", []);
  _lsSet("wa_logs", []);
  localStorage.setItem("ms_seeded","1");
}
_seedLocalData();

let _db = null, _useLocal = true;
let _fsModule = null;

async function _initFirebase() {
  try {
    const [appMod, fsMod] = await Promise.all([
      import("https://esm.sh/firebase@10.12.2/app"),
      import("https://esm.sh/firebase@10.12.2/firestore")
    ]);
    _fsModule = fsMod;
    const app = appMod.initializeApp({
      apiKey: "AIzaSyBBLJxtTdr6TiNQJigDNIudkr38DukAZXE",
      authDomain: "amar77477-d30fd.firebaseapp.com",
      projectId: "amar77477-d30fd",
      storageBucket: "amar77477-d30fd.firebasestorage.app",
      messagingSenderId: "836341455693",
      appId: "1:836341455693:web:402c70589e2190ef6cb504"
    });
    _db = fsMod.getFirestore(app);
    await fsMod.getDoc(fsMod.doc(_db, "settings", "main"));
    _useLocal = false;
    console.log("✅ Firestore متصل");
  } catch {
    _useLocal = true;
    console.log("📱 وضع LocalStorage — يعمل بدون إنترنت");
  }
}
_initFirebase();

function _col(name)     { return _fsModule.collection(_db, name); }
function _doc(name, id) { return _fsModule.doc(_db, name, id); }
function _ts()          { return _fsModule.serverTimestamp(); }

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
    transfer_new:       `${hd}\n\n📬 *تم إنشاء حوالة جديدة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}\n📊 العمولة: ${comm} ${cur}${pmLine}${code}\n🔖 النوع: ${data.transferType||'تحويل عادي'}\n⏳ الحالة: قيد التنفيذ\n\n${ft}`,
    transfer_completed: `${hd}\n\n✅ *تم إتمام الحوالة بنجاح*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}${code}\n🕐 وقت الإتمام: ${new Date().toLocaleString('ar-SA')}\n\nشكراً لثقتكم بنا 🙏\n\n${ft}`,
    transfer_cancelled: `${hd}\n\n❌ *تم إلغاء الحوالة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}${code}\n\nللاستفسار تواصل معنا.\n\n${ft}`,
    transfer_reminder:  `${hd}\n\n🔔 *تذكير بحوالة معلقة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}${code}\n\n${ft}`,
    account_welcome:    `${hd}\n\n👋 *أهلاً وسهلاً ${name}*\n\nتم تسجيلك في نظام محمد سالم.\n💰 الرصيد: ${bal} ${cur}\n\n${ft}`,
    account_statement:  `${hd}\n\n📊 *كشف حسابك*\n\n👤 ${name}\n💰 الرصيد (ر.ي): ${bal}\n📅 ${new Date().toLocaleDateString('ar-SA')}\n\n${ft}`,
    late_alert:         `${hd}\n\n⚠️ *تنبيه: رصيد متأخر*\n\n${name}، لديك رصيد متأخر:\n💰 ${bal} ${cur}\n\nيرجى التواصل لترتيب السداد.\n\n${ft}`,
    voucher_receipt:    `${hd}\n\n🧾 *سند قبض*\n\n👤 الاسم: ${name}\n💰 المبلغ المستلم: ${amount} ${cur}\n📝 السبب: ${data.reason||'—'}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n\nتم التوثيق في النظام ✓\n\n${ft}`,
    voucher_payment:    `${hd}\n\n🧾 *سند صرف*\n\n👤 الاسم: ${name}\n💰 المبلغ المصروف: ${amount} ${cur}\n📝 السبب: ${data.reason||'—'}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n\nتم التوثيق في النظام ✓\n\n${ft}`,
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

export async function saveSettings(data) {
  Object.keys(data).forEach(k=>localStorage.setItem("s_"+k, data[k]));
  if(!_useLocal && _db) {
    try { await _fsModule.setDoc(_doc("settings","main"), data, {merge:true}); } catch {}
  }
}
export async function loadSettings() {
  if(!_useLocal && _db) {
    try { const d=await _fsModule.getDoc(_doc("settings","main")); if(d.exists()) return d.data(); } catch {}
  }
  return {};
}

// ===== الحوالات =====
export async function addTransfer(data) {
  const code = data.transferCode || generateTransferCode();
  const entry={id:_uid(),...data,transferCode:code,status:data.status||"pending",createdAt:Date.now()};
  if(!_useLocal && _db) {
    try { return await _fsModule.addDoc(_col("transfers"),{...data,transferCode:code,status:data.status||"pending",createdAt:_ts()}); } catch { _useLocal=true; }
  }
  // تحديث الرصيد إذا كانت طريقة الدفع من الرصيد
  if (data.paymentMethod === 'balance' && data.beneficiaryId) {
    const accounts = _lsGet("accounts");
    _lsSet("accounts", accounts.map(a => a.id === data.beneficiaryId
      ? {...a, balance: Math.max(0,(Number(a.balance)||0) - (Number(data.total)||0))}
      : a));
    _notify("accounts");
  }
  const list=_lsGet("transfers"); list.unshift(entry); _lsSet("transfers",list); _notify("transfers");
  return entry;
}

export async function getTransfers(n=500) {
  if(!_useLocal && _db) {
    try {
      const s=await _fsModule.getDocs(_fsModule.query(_col("transfers"),_fsModule.orderBy("createdAt","desc"),_fsModule.limit(n)));
      return s.docs.map(d=>({id:d.id,...d.data()}));
    } catch { _useLocal=true; }
  }
  return _lsGet("transfers").slice(0,n);
}

export function listenTransfers(cb) {
  if(!_useLocal && _db) {
    try {
      const q=_fsModule.query(_col("transfers"),_fsModule.orderBy("createdAt","desc"),_fsModule.limit(200));
      return _fsModule.onSnapshot(q, s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{
        _useLocal=true;
        _listeners["transfers"]=_listeners["transfers"]||[];
        _listeners["transfers"].push(cb); cb(_lsGet("transfers"));
      });
    } catch { _useLocal=true; }
  }
  _listeners["transfers"]=_listeners["transfers"]||[];
  _listeners["transfers"].push(cb);
  setTimeout(()=>cb(_lsGet("transfers")),50);
  return ()=>{ _listeners["transfers"]=(_listeners["transfers"]||[]).filter(f=>f!==cb); };
}

export async function updateTransferStatus(id, status) {
  if(!_useLocal && _db) {
    try { await _fsModule.updateDoc(_doc("transfers",id),{status,updatedAt:_ts()}); return; } catch { _useLocal=true; }
  }
  _lsSet("transfers",_lsGet("transfers").map(t=>t.id===id?{...t,status,updatedAt:Date.now()}:t));
  _notify("transfers");
}

export async function deleteTransfer(id) {
  if(!_useLocal && _db) {
    try { await _fsModule.deleteDoc(_doc("transfers",id)); return; } catch { _useLocal=true; }
  }
  _lsSet("transfers",_lsGet("transfers").filter(t=>t.id!==id));
  _notify("transfers");
}

export async function findTransferByCode(code) {
  const all = await getTransfers(1000);
  return all.find(t => t.transferCode === code) || null;
}

// ===== الحسابات =====
export async function addAccount(data) {
  const entry={id:_uid(),...data,balance:Number(data.balance)||0,balanceSAR:Number(data.balanceSAR)||0,status:data.status||"active",createdAt:Date.now()};
  if(!_useLocal && _db) {
    try { return await _fsModule.addDoc(_col("accounts"),{...data,balance:Number(data.balance)||0,balanceSAR:Number(data.balanceSAR)||0,status:data.status||"active",createdAt:_ts()}); } catch { _useLocal=true; }
  }
  const list=_lsGet("accounts"); list.unshift(entry); _lsSet("accounts",list); _notify("accounts");
  return entry;
}

export async function getAccounts() {
  if(!_useLocal && _db) {
    try {
      const s=await _fsModule.getDocs(_fsModule.query(_col("accounts"),_fsModule.orderBy("createdAt","desc")));
      return s.docs.map(d=>({id:d.id,...d.data()}));
    } catch { _useLocal=true; }
  }
  return _lsGet("accounts");
}

export function listenAccounts(cb) {
  if(!_useLocal && _db) {
    try {
      const q=_fsModule.query(_col("accounts"),_fsModule.orderBy("createdAt","desc"));
      return _fsModule.onSnapshot(q, s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{
        _useLocal=true;
        _listeners["accounts"]=_listeners["accounts"]||[];
        _listeners["accounts"].push(cb); cb(_lsGet("accounts"));
      });
    } catch { _useLocal=true; }
  }
  _listeners["accounts"]=_listeners["accounts"]||[];
  _listeners["accounts"].push(cb);
  setTimeout(()=>cb(_lsGet("accounts")),50);
  return ()=>{ _listeners["accounts"]=(_listeners["accounts"]||[]).filter(f=>f!==cb); };
}

export async function updateAccount(id, data) {
  if(!_useLocal && _db) {
    try { await _fsModule.updateDoc(_doc("accounts",id),{...data,updatedAt:_ts()}); return; } catch { _useLocal=true; }
  }
  _lsSet("accounts",_lsGet("accounts").map(a=>a.id===id?{...a,...data,updatedAt:Date.now()}:a));
  _notify("accounts");
}

export async function deleteAccount(id) {
  if(!_useLocal && _db) {
    try { await _fsModule.deleteDoc(_doc("accounts",id)); return; } catch { _useLocal=true; }
  }
  _lsSet("accounts",_lsGet("accounts").filter(a=>a.id!==id));
  _notify("accounts");
}

// ===== سندات القبض والصرف =====
export async function addVoucher(data) {
  // type: 'receipt' (قبض) أو 'payment' (صرف)
  // currency: 'YER' أو 'SAR'
  const entry={id:_uid(),...data,createdAt:Date.now()};
  if(!_useLocal && _db) {
    try { return await _fsModule.addDoc(_col("vouchers"),{...data,createdAt:_ts()}); } catch { _useLocal=true; }
  }
  const list=_lsGet("vouchers"); list.unshift(entry); _lsSet("vouchers",list); _notify("vouchers");
  // تحديث رصيد الحساب تلقائياً
  if (data.accountId) {
    const accounts = _lsGet("accounts");
    _lsSet("accounts", accounts.map(a => {
      if (a.id !== data.accountId) return a;
      if (data.currency === 'SAR') {
        const newSAR = data.type === 'receipt'
          ? (Number(a.balanceSAR)||0) + (Number(data.amount)||0)
          : (Number(a.balanceSAR)||0) - (Number(data.amount)||0);
        return {...a, balanceSAR: newSAR};
      } else {
        const newBal = data.type === 'receipt'
          ? (Number(a.balance)||0) + (Number(data.amount)||0)
          : (Number(a.balance)||0) - (Number(data.amount)||0);
        return {...a, balance: newBal};
      }
    }));
    _notify("accounts");
  }
  return entry;
}

export async function getVouchers(accountId) {
  if(!_useLocal && _db) {
    try {
      let q = _fsModule.query(_col("vouchers"),_fsModule.orderBy("createdAt","desc"),_fsModule.limit(200));
      if (accountId) q = _fsModule.query(_col("vouchers"),_fsModule.where("accountId","==",accountId),_fsModule.orderBy("createdAt","desc"));
      const s = await _fsModule.getDocs(q);
      return s.docs.map(d=>({id:d.id,...d.data()}));
    } catch { _useLocal=true; }
  }
  const all = _lsGet("vouchers");
  return accountId ? all.filter(v=>v.accountId===accountId) : all;
}

export function listenVouchers(cb) {
  if(!_useLocal && _db) {
    try {
      const q=_fsModule.query(_col("vouchers"),_fsModule.orderBy("createdAt","desc"),_fsModule.limit(100));
      return _fsModule.onSnapshot(q, s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{
        _useLocal=true;
        _listeners["vouchers"]=_listeners["vouchers"]||[];
        _listeners["vouchers"].push(cb); cb(_lsGet("vouchers"));
      });
    } catch { _useLocal=true; }
  }
  _listeners["vouchers"]=_listeners["vouchers"]||[];
  _listeners["vouchers"].push(cb);
  setTimeout(()=>cb(_lsGet("vouchers")),50);
  return ()=>{ _listeners["vouchers"]=(_listeners["vouchers"]||[]).filter(f=>f!==cb); };
}

export async function getAccountStatement(accountId) {
  const [transfers, vouchers] = await Promise.all([getTransfers(1000), getVouchers(accountId)]);
  const accTransfers = transfers.filter(t => t.beneficiaryId === accountId);
  return [...accTransfers.map(t=>({...t,entryType:'transfer'})),
          ...vouchers.map(v=>({...v,entryType:'voucher'}))]
    .sort((a,b)=>{
      const ta=a.createdAt?.toDate?a.createdAt.toDate().getTime():(typeof a.createdAt==='number'?a.createdAt:0);
      const tb=b.createdAt?.toDate?b.createdAt.toDate().getTime():(typeof b.createdAt==='number'?b.createdAt:0);
      return tb-ta;
    });
}

// ===== تحويل العملة =====
export function convertCurrency(amount, from, to, rates) {
  // rates: { YER_SAR: 0.014, SAR_YER: 70 } (تقريبي)
  const r = rates || { YER_SAR: 0.014, SAR_YER: 70 };
  if (from === 'YER' && to === 'SAR') return Math.round(amount * r.YER_SAR * 100) / 100;
  if (from === 'SAR' && to === 'YER') return Math.round(amount * r.SAR_YER);
  return amount;
}

// ===== سجل الواتساب =====
export async function logWA(data) {
  const entry={id:_uid(),...data,sentAt:Date.now()};
  if(!_useLocal && _db) {
    try { await _fsModule.addDoc(_col("wa_logs"),{...data,sentAt:_ts()}); return; } catch { _useLocal=true; }
  }
  const list=_lsGet("wa_logs"); list.unshift(entry); _lsSet("wa_logs",list.slice(0,100)); _notify("wa_logs");
}

export function listenWALogs(cb) {
  if(!_useLocal && _db) {
    try {
      const q=_fsModule.query(_col("wa_logs"),_fsModule.orderBy("sentAt","desc"),_fsModule.limit(50));
      return _fsModule.onSnapshot(q, s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{
        _useLocal=true;
        _listeners["wa_logs"]=_listeners["wa_logs"]||[];
        _listeners["wa_logs"].push(cb); cb(_lsGet("wa_logs"));
      });
    } catch { _useLocal=true; }
  }
  _listeners["wa_logs"]=_listeners["wa_logs"]||[];
  _listeners["wa_logs"].push(cb);
  setTimeout(()=>cb(_lsGet("wa_logs")),50);
  return ()=>{};
}

// ===== إحصاءات =====
export async function getStats() {
  const [transfers,accounts]=await Promise.all([getTransfers(1000),getAccounts()]);
  const todayStart=new Date(); todayStart.setHours(0,0,0,0);
  const ts=todayStart.getTime();
  const todayT=transfers.filter(t=>{
    const ct=t.createdAt?.toDate?t.createdAt.toDate().getTime():typeof t.createdAt==='number'?t.createdAt:0;
    return ct>=ts;
  });
  return {
    totalBalance:   accounts.reduce((s,a)=>s+(Number(a.balance)||0),0),
    totalBalanceSAR:accounts.reduce((s,a)=>s+(Number(a.balanceSAR)||0),0),
    todayCompleted: todayT.filter(t=>t.status==="completed").length,
    todayPending:   todayT.filter(t=>t.status==="pending").length,
    todayProfit:    todayT.reduce((s,t)=>s+(Number(t.commission)||0),0),
    lateAccounts:   accounts.filter(a=>a.status==="late").length,
    totalAccounts:  accounts.length,
    activeAccounts: accounts.filter(a=>a.status!=="late").length,
    allTransfers:   transfers.length,
    allCompleted:   transfers.filter(t=>t.status==="completed").length,
  };
}

export { _db as db };
