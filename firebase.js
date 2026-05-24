// ===== نظام محمد سالم — Firestore =====
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import {
    getFirestore, collection, addDoc, getDocs, onSnapshot,
    query, orderBy, limit, serverTimestamp, doc, updateDoc, deleteDoc, setDoc, getDoc
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyBBLJxtTdr6TiNQJigDNIudkr38DukAZXE",
    authDomain: "amar77477-d30fd.firebaseapp.com",
    projectId: "amar77477-d30fd",
    storageBucket: "amar77477-d30fd.firebasestorage.app",
    messagingSenderId: "836341455693",
    appId: "1:836341455693:web:402c70589e2190ef6cb504",
    measurementId: "G-EK2L45NWJP"
  };

  const app = initializeApp(firebaseConfig);
  const db  = getFirestore(app);

  // ===== إعدادات =====
  export async function saveSettings(data) {
    await setDoc(doc(db, "settings", "main"), data, { merge: true });
    Object.keys(data).forEach(k => localStorage.setItem("s_"+k, data[k]));
  }
  export async function loadSettings() {
    try { const d = await getDoc(doc(db,"settings","main")); return d.exists() ? d.data() : {}; } catch { return {}; }
  }
  export function getAdminWA() {
    return localStorage.getItem("s_waNumber") || "967733231636";
  }

  // ===== الحوالات =====
  export async function addTransfer(data) {
    const ref = await addDoc(collection(db,"transfers"), {
      ...data, status: data.status||"pending", createdAt: serverTimestamp()
    });
    await logWA({ type:"transfer_new", accountName:data.beneficiary, phone:data.beneficiaryPhone||"",
      message:"حوالة جديدة "+Number(data.amount||0).toLocaleString("ar-SA")+" "+(data.currency||"ر.ي") });
    return ref;
  }
  export async function getTransfers(n=500) {
    const q = query(collection(db,"transfers"), orderBy("createdAt","desc"), limit(n));
    const s = await getDocs(q);
    return s.docs.map(d => ({ id:d.id, ...d.data() }));
  }
  export function listenTransfers(cb) {
    const q = query(collection(db,"transfers"), orderBy("createdAt","desc"), limit(200));
    return onSnapshot(q, s => cb(s.docs.map(d => ({ id:d.id, ...d.data() }))));
  }
  export async function updateTransferStatus(id, status) {
    await updateDoc(doc(db,"transfers",id), { status, updatedAt: serverTimestamp() });
  }
  export async function deleteTransfer(id) { await deleteDoc(doc(db,"transfers",id)); }

  // ===== الحسابات =====
  export async function addAccount(data) {
    return await addDoc(collection(db,"accounts"), {
      ...data, balance: Number(data.balance)||0,
      status: data.status||"active", createdAt: serverTimestamp()
    });
  }
  export async function getAccounts() {
    const q = query(collection(db,"accounts"), orderBy("createdAt","desc"));
    const s = await getDocs(q);
    return s.docs.map(d => ({ id:d.id, ...d.data() }));
  }
  export function listenAccounts(cb) {
    const q = query(collection(db,"accounts"), orderBy("createdAt","desc"));
    return onSnapshot(q, s => cb(s.docs.map(d => ({ id:d.id, ...d.data() }))));
  }
  export async function updateAccount(id, data) {
    await updateDoc(doc(db,"accounts",id), { ...data, updatedAt: serverTimestamp() });
  }
  export async function deleteAccount(id) { await deleteDoc(doc(db,"accounts",id)); }

  // ===== سجل الواتساب =====
  export async function logWA(data) {
    try {
      await addDoc(collection(db,"wa_logs"), { ...data, sentAt: serverTimestamp() });
    } catch(e) {}
  }
  export function listenWALogs(cb) {
    const q = query(collection(db,"wa_logs"), orderBy("sentAt","desc"), limit(50));
    return onSnapshot(q, s => cb(s.docs.map(d => ({ id:d.id, ...d.data() }))));
  }

  // ===== إحصاءات =====
  export async function getStats() {
    const [transfers, accounts] = await Promise.all([getTransfers(1000), getAccounts()]);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayT = transfers.filter(t => t.createdAt?.toDate && t.createdAt.toDate() >= today);
    return {
      totalBalance:   accounts.reduce((s,a) => s+(Number(a.balance)||0), 0),
      todayCompleted: todayT.filter(t => t.status==="completed").length,
      todayPending:   todayT.filter(t => t.status==="pending").length,
      todayProfit:    todayT.reduce((s,t) => s+(Number(t.commission)||0), 0),
      lateAccounts:   accounts.filter(a => a.status==="late").length,
      totalAccounts:  accounts.length,
      activeAccounts: accounts.filter(a => a.status!=="late").length
    };
  }

  // ===== واتساب =====
  export function openWA(phone, text) {
    const clean = String(phone||"").replace(/[^0-9]/g,"");
    if (!clean) return;
    const num = clean.startsWith("00") ? clean.slice(2) : clean.startsWith("0") ? "967"+clean.slice(1) : clean;
    window.open("https://wa.me/"+num+"?text="+encodeURIComponent(text), "_blank");
  }
  export function openAdminWA(text) { openWA(getAdminWA(), text); }

  export { db };
  