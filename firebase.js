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
    appId: "1:836341455693:web:9f6cf6819dcc26ac6cb504"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // ===== إعدادات النظام =====
  export async function saveSettings(data) {
    await setDoc(doc(db, "settings", "main"), data, { merge: true });
    Object.keys(data).forEach(k => localStorage.setItem('setting_' + k, data[k]));
  }
  export async function loadSettings() {
    try {
      const d = await getDoc(doc(db, "settings", "main"));
      if (d.exists()) return d.data();
    } catch(e) {}
    return {};
  }
  export function getSetting(key, fallback = '') {
    return localStorage.getItem('setting_' + key) || fallback;
  }
  export function getAdminWA() {
    return localStorage.getItem('setting_waNumber') || '967733231636';
  }

  // ===== الحوالات =====
  export async function addTransfer(data) {
    const ref = await addDoc(collection(db, "transfers"), {
      ...data, status: "pending", createdAt: serverTimestamp()
    });
    await logWA({ type: 'transfer_new', accountName: data.beneficiary, phone: data.beneficiaryPhone,
      message: 'تم إنشاء حوالة جديدة بمبلغ ' + Number(data.amount).toLocaleString('ar-SA') + ' ' + (data.currency||'ر.ي')
    });
    return ref;
  }
  export async function getTransfers(n = 100) {
    const q = query(collection(db, "transfers"), orderBy("createdAt","desc"), limit(n));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  export function listenTransfers(cb) {
    const q = query(collection(db, "transfers"), orderBy("createdAt","desc"), limit(100));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }
  export async function updateTransferStatus(id, status) {
    await updateDoc(doc(db, "transfers", id), { status, updatedAt: serverTimestamp() });
  }
  export async function deleteTransfer(id) { await deleteDoc(doc(db, "transfers", id)); }

  // ===== الحسابات =====
  export async function addAccount(data) {
    return await addDoc(collection(db, "accounts"), {
      ...data, balance: Number(data.balance) || 0,
      status: data.status || "active", createdAt: serverTimestamp()
    });
  }
  export async function getAccounts() {
    const q = query(collection(db, "accounts"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  export function listenAccounts(cb) {
    const q = query(collection(db, "accounts"), orderBy("createdAt","desc"));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }
  export async function updateAccount(id, data) {
    await updateDoc(doc(db, "accounts", id), { ...data, updatedAt: serverTimestamp() });
  }
  export async function deleteAccount(id) { await deleteDoc(doc(db, "accounts", id)); }

  // ===== سجل واتساب =====
  export async function logWA(data) {
    try {
      await addDoc(collection(db, "wa_logs"), { ...data, sentAt: serverTimestamp() });
    } catch(e) {}
  }
  export function listenWALogs(cb) {
    const q = query(collection(db, "wa_logs"), orderBy("sentAt","desc"), limit(50));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  // ===== إحصاءات =====
  export async function getStats() {
    const [transfers, accounts] = await Promise.all([getTransfers(1000), getAccounts()]);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayT = transfers.filter(t => t.createdAt?.toDate && t.createdAt.toDate() >= today);
    return {
      totalBalance: accounts.reduce((s,a) => s + (Number(a.balance)||0), 0),
      todayCompleted: todayT.filter(t => t.status === "completed").length,
      todayPending: todayT.filter(t => t.status === "pending").length,
      todayProfit: todayT.reduce((s,t) => s + (Number(t.commission)||0), 0),
      lateAccounts: accounts.filter(a => a.status === "late").length,
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter(a => a.status !== "late").length
    };
  }

  // ===== واتساب helper =====
  export function openWA(phone, text) {
    const clean = String(phone).replace(/[^0-9]/g,'');
    const num = clean.startsWith('00') ? clean.slice(2) : clean.startsWith('0') ? '967' + clean.slice(1) : clean;
    const url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  }
  export function openAdminWA(text) {
    const num = getAdminWA().replace(/[^0-9]/g,'');
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(text), '_blank');
  }

  export { db };
  