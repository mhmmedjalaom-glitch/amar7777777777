// ===== نظام محمد سالم — Firestore + LocalStorage Fallback =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, onSnapshot,
  query, orderBy, limit, serverTimestamp, doc, updateDoc,
  deleteDoc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBLJxtTdr6TiNQJigDNIudkr38DukAZXE",
  authDomain: "amar77477-d30fd.firebaseapp.com",
  projectId: "amar77477-d30fd",
  storageBucket: "amar77477-d30fd.firebasestorage.app",
  messagingSenderId: "836341455693",
  appId: "1:836341455693:web:402c70589e2190ef6cb504"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ===== وضع العمل: Firestore أو LocalStorage =====
let _useLocal = false;

(async () => {
  try {
    await getDoc(doc(db, "settings", "main"));
    _useLocal = false;
  } catch {
    _useLocal = true;
    _seedLocalData();
  }
})();

// ===== LocalStorage helpers =====
function _lsGet(key)      { try { return JSON.parse(localStorage.getItem("ms_"+key)||"[]"); } catch { return []; } }
function _lsSet(key, val) { localStorage.setItem("ms_"+key, JSON.stringify(val)); }
function _uid()           { return Math.random().toString(36).slice(2)+Date.now().toString(36); }

// ===== Listeners =====
const _listeners = {};
function _notify(col) {
  (_listeners[col]||[]).forEach(cb => cb(_lsGet(col)));
}

// ===== بيانات تجريبية حقيقية =====
function _seedLocalData() {
  if (localStorage.getItem("ms_seeded")) return;
  const now = Date.now(), day = 86400000;

  const accounts = [
    { id:_uid(), name:"أحمد محمد الوادعي",     phone:"967712345678", balance:850000,  status:"active", notes:"عميل منتظم",    createdAt:now-10*day },
    { id:_uid(), name:"خالد سالم العمري",       phone:"967798765432", balance:1200000, status:"active", notes:"VIP",           createdAt:now-8*day  },
    { id:_uid(), name:"محمد علي الشمري",        phone:"967733445566", balance:320000,  status:"late",   notes:"متأخر 7 أيام", createdAt:now-15*day },
    { id:_uid(), name:"عبد الرحمن الزبيدي",     phone:"967755667788", balance:2500000, status:"active", notes:"VIP كبير",      createdAt:now-5*day  },
    { id:_uid(), name:"سالم القحطاني",          phone:"967722334455", balance:650000,  status:"late",   notes:"متأخر 5 أيام", createdAt:now-20*day },
    { id:_uid(), name:"فهد ناصر المالكي",       phone:"967788990011", balance:480000,  status:"active", notes:"",             createdAt:now-3*day  },
  ];

  const transfers = [
    { id:_uid(), beneficiary:"أحمد محمد الوادعي",  beneficiaryPhone:"967712345678", amount:150000, currency:"ر.ي", commission:7500,  total:157500, transferType:"تحويل عادي",  status:"completed", notes:"", createdAt:now-2*day   },
    { id:_uid(), beneficiary:"خالد سالم العمري",    beneficiaryPhone:"967798765432", amount:500000, currency:"ر.ي", commission:25000, total:525000, transferType:"تحويل VIP",   status:"completed", notes:"", createdAt:now-1*day   },
    { id:_uid(), beneficiary:"محمد علي الشمري",     beneficiaryPhone:"967733445566", amount:80000,  currency:"ر.ي", commission:4000,  total:84000,  transferType:"تحويل عادي",  status:"pending",   notes:"", createdAt:now-3*3600000 },
    { id:_uid(), beneficiary:"عبد الرحمن الزبيدي",  beneficiaryPhone:"967755667788", amount:900000, currency:"ر.ي", commission:45000, total:945000, transferType:"تحويل عاجل", status:"completed", notes:"", createdAt:now-5*3600000 },
    { id:_uid(), beneficiary:"سالم القحطاني",       beneficiaryPhone:"967722334455", amount:200000, currency:"ر.ي", commission:10000, total:210000, transferType:"تحويل عادي",  status:"pending",   notes:"", createdAt:now-30*60000 },
    { id:_uid(), beneficiary:"فهد ناصر المالكي",    beneficiaryPhone:"967788990011", amount:350000, currency:"ر.ي", commission:17500, total:367500, transferType:"تحويل عادي",  status:"cancelled", notes:"", createdAt:now-4*day   },
    { id:_uid(), beneficiary:"أحمد محمد الوادعي",  beneficiaryPhone:"967712345678", amount:220000, currency:"ر.ي", commission:11000, total:231000, transferType:"تحويل عادي",  status:"pending",   notes:"", createdAt:now-10*60000 },
  ];

  _lsSet("accounts",  accounts);
  _lsSet("transfers", transfers);
  _lsSet("wa_logs",   []);
  localStorage.setItem("ms_seeded", "1");
}

// ===== رقم الأدمن =====
export function getAdminWA() {
  return localStorage.getItem("s_waNumber") || "967733231636";
}

// ===== فتح واتساب =====
export function openWA(phone, text) {
  const clean = String(phone||"").replace(/[^0-9]/g,"");
  if (!clean) return false;
  const num = clean.startsWith("00") ? clean.slice(2) : clean.startsWith("0") ? "967"+clean.slice(1) : clean;
  window.open("https://wa.me/"+num+"?text="+encodeURIComponent(text),"_blank");
  return true;
}
export function openAdminWA(text) { return openWA(getAdminWA(), text); }

// ===== رسائل واتساب =====
export function buildMsg(type, data={}) {
  const fmt = n => Number(n||0).toLocaleString('ar-SA');
  const name=data.name||data.beneficiary||'العميل', amount=fmt(data.amount),
        cur=data.currency||'ر.ي', comm=fmt(data.commission), bal=fmt(data.balance);
  const hd=`🏦 *نظام محمد سالم للحوالات*\n━━━━━━━━━━━━━━━━━━`,
        ft=`━━━━━━━━━━━━━━━━━━\n📞 للاستفسار تواصل معنا مباشرة`;
  const msgs={
    transfer_new:       `${hd}\n\n📬 *تم إنشاء حوالة جديدة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}\n📊 العمولة: ${comm} ${cur}\n🔖 النوع: ${data.transferType||'تحويل عادي'}\n⏳ الحالة: قيد التنفيذ\n\n${ft}`,
    transfer_completed: `${hd}\n\n✅ *تم إتمام الحوالة بنجاح*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}\n🕐 وقت الإتمام: ${new Date().toLocaleString('ar-SA')}\n\nشكراً لثقتكم بنا 🙏\n\n${ft}`,
    transfer_cancelled: `${hd}\n\n❌ *تم إلغاء الحوالة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}\n\nللاستفسار تواصل معنا.\n\n${ft}`,
    transfer_reminder:  `${hd}\n\n🔔 *تذكير بحوالة معلقة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${cur}\n\n${ft}`,
    account_welcome:    `${hd}\n\n👋 *أهلاً وسهلاً ${name}*\n\nتم تسجيلك في نظام محمد سالم.\n💰 الرصيد: ${bal} ${cur}\n\n${ft}`,
    account_statement:  `${hd}\n\n📊 *كشف حسابك*\n\n👤 ${name}\n💰 الرصيد: ${bal} ${cur}\n📅 ${new Date().toLocaleDateString('ar-SA')}\n\n${ft}`,
    late_alert:         `${hd}\n\n⚠️ *تنبيه: رصيد متأخر*\n\n${name}، لديك رصيد متأخر:\n💰 ${bal} ${cur}\n\nيرجى التواصل لترتيب السداد.\n\n${ft}`,
  };
  return msgs[type]||`${hd}\n\n📋 عملية جديدة في حسابك\n\n${ft}`;
}

// ===== إشعار العميل + نسخة أدمن =====
export async function notifyClient(clientPhone, type, data={}) {
  const msg=buildMsg(type,data), sent=clientPhone?openWA(clientPhone,msg):false;
  const adm=getAdminWA(), cc=String(clientPhone||"").replace(/[^0-9]/g,""), ac=String(adm).replace(/[^0-9]/g,"");
  if (cc!==ac) setTimeout(()=>openWA(adm,`📋 *نسخة — ${data.name||data.beneficiary||'عميل'}*\n${msg}`),1200);
  await logWA({type,accountName:data.name||data.beneficiary||'',phone:clientPhone||adm,message:msg});
  return sent;
}

// ===== الإعدادات =====
export async function saveSettings(data) {
  Object.keys(data).forEach(k=>localStorage.setItem("s_"+k, data[k]));
  if (!_useLocal) { try { await setDoc(doc(db,"settings","main"),data,{merge:true}); } catch {} }
}
export async function loadSettings() {
  if (!_useLocal) { try { const d=await getDoc(doc(db,"settings","main")); if(d.exists()) return d.data(); } catch {} }
  return {};
}

// ===== الحوالات =====
export async function addTransfer(data) {
  const entry={id:_uid(),...data,status:data.status||"pending",createdAt:Date.now()};
  if (!_useLocal) {
    try {
      return await addDoc(collection(db,"transfers"),{...data,status:data.status||"pending",createdAt:serverTimestamp()});
    } catch { _useLocal=true; }
  }
  const list=_lsGet("transfers"); list.unshift(entry); _lsSet("transfers",list); _notify("transfers");
  return entry;
}

export async function getTransfers(n=500) {
  if (!_useLocal) {
    try {
      const s=await getDocs(query(collection(db,"transfers"),orderBy("createdAt","desc"),limit(n)));
      return s.docs.map(d=>({id:d.id,...d.data()}));
    } catch { _useLocal=true; _seedLocalData(); }
  }
  return _lsGet("transfers").slice(0,n);
}

export function listenTransfers(cb) {
  if (!_useLocal) {
    try {
      const q=query(collection(db,"transfers"),orderBy("createdAt","desc"),limit(200));
      return onSnapshot(q, s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{
        _useLocal=true; _seedLocalData();
        _listeners["transfers"]=_listeners["transfers"]||[];
        _listeners["transfers"].push(cb); cb(_lsGet("transfers"));
      });
    } catch { _useLocal=true; _seedLocalData(); }
  }
  _listeners["transfers"]=_listeners["transfers"]||[];
  _listeners["transfers"].push(cb);
  setTimeout(()=>cb(_lsGet("transfers")),50);
  return ()=>{ _listeners["transfers"]=(_listeners["transfers"]||[]).filter(f=>f!==cb); };
}

export async function updateTransferStatus(id, status) {
  if (!_useLocal) {
    try { await updateDoc(doc(db,"transfers",id),{status,updatedAt:serverTimestamp()}); return; } catch { _useLocal=true; }
  }
  _lsSet("transfers",_lsGet("transfers").map(t=>t.id===id?{...t,status,updatedAt:Date.now()}:t));
  _notify("transfers");
}

export async function deleteTransfer(id) {
  if (!_useLocal) {
    try { await deleteDoc(doc(db,"transfers",id)); return; } catch { _useLocal=true; }
  }
  _lsSet("transfers",_lsGet("transfers").filter(t=>t.id!==id));
  _notify("transfers");
}

// ===== الحسابات =====
export async function addAccount(data) {
  const entry={id:_uid(),...data,balance:Number(data.balance)||0,status:data.status||"active",createdAt:Date.now()};
  if (!_useLocal) {
    try {
      return await addDoc(collection(db,"accounts"),{...data,balance:Number(data.balance)||0,status:data.status||"active",createdAt:serverTimestamp()});
    } catch { _useLocal=true; }
  }
  const list=_lsGet("accounts"); list.unshift(entry); _lsSet("accounts",list); _notify("accounts");
  return entry;
}

export async function getAccounts() {
  if (!_useLocal) {
    try {
      const s=await getDocs(query(collection(db,"accounts"),orderBy("createdAt","desc")));
      return s.docs.map(d=>({id:d.id,...d.data()}));
    } catch { _useLocal=true; _seedLocalData(); }
  }
  return _lsGet("accounts");
}

export function listenAccounts(cb) {
  if (!_useLocal) {
    try {
      const q=query(collection(db,"accounts"),orderBy("createdAt","desc"));
      return onSnapshot(q, s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{
        _useLocal=true; _seedLocalData();
        _listeners["accounts"]=_listeners["accounts"]||[];
        _listeners["accounts"].push(cb); cb(_lsGet("accounts"));
      });
    } catch { _useLocal=true; _seedLocalData(); }
  }
  _listeners["accounts"]=_listeners["accounts"]||[];
  _listeners["accounts"].push(cb);
  setTimeout(()=>cb(_lsGet("accounts")),50);
  return ()=>{ _listeners["accounts"]=(_listeners["accounts"]||[]).filter(f=>f!==cb); };
}

export async function updateAccount(id, data) {
  if (!_useLocal) {
    try { await updateDoc(doc(db,"accounts",id),{...data,updatedAt:serverTimestamp()}); return; } catch { _useLocal=true; }
  }
  _lsSet("accounts",_lsGet("accounts").map(a=>a.id===id?{...a,...data,updatedAt:Date.now()}:a));
  _notify("accounts");
}

export async function deleteAccount(id) {
  if (!_useLocal) {
    try { await deleteDoc(doc(db,"accounts",id)); return; } catch { _useLocal=true; }
  }
  _lsSet("accounts",_lsGet("accounts").filter(a=>a.id!==id));
  _notify("accounts");
}

// ===== سجل الواتساب =====
export async function logWA(data) {
  const entry={id:_uid(),...data,sentAt:Date.now()};
  if (!_useLocal) { try { await addDoc(collection(db,"wa_logs"),{...data,sentAt:serverTimestamp()}); return; } catch { _useLocal=true; } }
  const list=_lsGet("wa_logs"); list.unshift(entry); _lsSet("wa_logs",list.slice(0,100)); _notify("wa_logs");
}

export function listenWALogs(cb) {
  if (!_useLocal) {
    try {
      const q=query(collection(db,"wa_logs"),orderBy("sentAt","desc"),limit(50));
      return onSnapshot(q, s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{
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

export { db };
