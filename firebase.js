import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import {
    getFirestore, collection, addDoc, getDocs,
    onSnapshot, query, orderBy, limit, serverTimestamp,
    doc, updateDoc, deleteDoc
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

  export async function addTransfer(data) {
    return await addDoc(collection(db, "transfers"), { ...data, status: "pending", createdAt: serverTimestamp() });
  }
  export async function getTransfers(n = 100) {
    const q = query(collection(db, "transfers"), orderBy("createdAt", "desc"), limit(n));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  export function listenTransfers(cb) {
    const q = query(collection(db, "transfers"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }
  export async function updateTransferStatus(id, status) { await updateDoc(doc(db,"transfers",id),{status}); }
  export async function deleteTransfer(id) { await deleteDoc(doc(db,"transfers",id)); }

  export async function addAccount(data) {
    return await addDoc(collection(db, "accounts"), { ...data, balance: data.balance||0, status: data.status||"active", createdAt: serverTimestamp() });
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
  export async function updateAccount(id, data) { await updateDoc(doc(db,"accounts",id),data); }

  export async function getStats() {
    const [transfers, accounts] = await Promise.all([getTransfers(1000), getAccounts()]);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayT = transfers.filter(t => t.createdAt?.toDate && t.createdAt.toDate() >= today);
    return {
      totalBalance: accounts.reduce((s,a) => s + (Number(a.balance)||0), 0),
      todayCompleted: todayT.filter(t => t.status==="completed").length,
      todayPending: todayT.filter(t => t.status==="pending").length,
      todayProfit: todayT.reduce((s,t) => s + (Number(t.commission)||0), 0),
      lateAccounts: accounts.filter(a => a.status==="late").length,
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter(a => a.status!=="late").length
    };
  }
  export { db };
  