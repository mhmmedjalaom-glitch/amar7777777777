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

  // ===== رقم الإدمن =====
  export function getAdminWA() {
    return localStorage.getItem("s_waNumber") || "967733231636";
  }

  // ===== تنسيق الرسائل التلقائية =====
  export function buildMsg(type, data = {}) {
    const fmt = n => Number(n || 0).toLocaleString('ar-SA');
    const name = data.name || data.beneficiary || 'العميل';
    const amount = fmt(data.amount);
    const currency = data.currency || 'ر.ي';
    const commission = fmt(data.commission);
    const balance = fmt(data.balance);

    const header = `🏦 *نظام محمد سالم للحوالات*\n━━━━━━━━━━━━━━━━━━`;
    const footer = `━━━━━━━━━━━━━━━━━━\n📞 للاستفسار تواصل معنا مباشرة`;

    const msgs = {
      transfer_new: `${header}\n\n📬 *تم إنشاء حوالة جديدة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${currency}\n📊 العمولة: ${commission} ${currency}\n🔖 النوع: ${data.transferType || 'تحويل عادي'}\n⏳ الحالة: قيد التنفيذ\n\n${footer}`,

      transfer_completed: `${header}\n\n✅ *تم إتمام الحوالة بنجاح*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${currency}\n🕐 وقت الإتمام: ${new Date().toLocaleString('ar-SA')}\n\nشكراً لثقتكم بنا 🙏\n\n${footer}`,

      transfer_cancelled: `${header}\n\n❌ *تم إلغاء الحوالة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${currency}\n\nللاستفسار عن سبب الإلغاء تواصل معنا.\n\n${footer}`,

      transfer_reminder: `${header}\n\n🔔 *تذكير بحوالة معلقة*\n\n👤 المستفيد: ${name}\n💰 المبلغ: ${amount} ${currency}\n⏳ الحالة: قيد الإنجاز\n\nسيتم إتمامها في أقرب وقت.\n\n${footer}`,

      account_welcome: `${header}\n\n👋 *أهلاً وسهلاً ${name}*\n\nتم تسجيلك في نظام محمد سالم للحوالات.\n💰 الرصيد الابتدائي: ${balance} ${currency}\n\nنتمنى لك خدمة ممتازة ✨\n\n${footer}`,

      account_statement: `${header}\n\n📊 *كشف حسابك*\n\n👤 الاسم: ${name}\n💰 الرصيد الحالي: ${balance} ${currency}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n\n${footer}`,

      late_alert: `${header}\n\n⚠️ *تنبيه: رصيد متأخر*\n\n${name}، لديك رصيد متأخر السداد:\n💰 المبلغ: ${balance} ${currency}\n\nيرجى التواصل معنا لترتيب السداد.\n\n${footer}`,
    };

    return msgs[type] || `${header}\n\n📋 عملية جديدة في حسابك\n\n${footer}`;
  }

  // ===== فتح واتساب (للعميل أو الأدمن) =====
  export function openWA(phone, text) {
    const clean = String(phone || "").replace(/[^0-9]/g, "");
    if (!clean) return false;
    const num = clean.startsWith("00") ? clean.slice(2) : clean.startsWith("0") ? "967" + clean.slice(1) : clean;
    window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(text), "_blank");
    return true;
  }

  export function openAdminWA(text) {
    return openWA(getAdminWA(), text);
  }

  // إشعار العميل + نسخة للأدمن
  export async function notifyClient(clientPhone, type, data = {}) {
    const msg = buildMsg(type, data);

    // رسالة للعميل
    const sent = clientPhone ? openWA(clientPhone, msg) : false;

    // نسخة للأدمن إذا لم يكن هو العميل
    const adminNum = getAdminWA();
    const clientClean = String(clientPhone || "").replace(/[^0-9]/g, "");
    const adminClean = String(adminNum).replace(/[^0-9]/g, "");
    if (clientClean !== adminClean) {
      const adminMsg = `📋 *نسخة — ${data.name || data.beneficiary || 'عميل'}*\n${msg}`;
      setTimeout(() => openWA(adminNum, adminMsg), 1200);
    }

    // تسجيل في Firestore
    await logWA({ type, accountName: data.name || data.beneficiary || '', phone: clientPhone || adminNum, message: msg });

    return sent;
  }

  // ===== إعدادات =====
  export async function saveSettings(data) {
    await setDoc(doc(db, "settings", "main"), data, { merge: true });
    Object.keys(data).forEach(k => localStorage.setItem("s_" + k, data[k]));
  }
  export async function loadSettings() {
    try { const d = await getDoc(doc(db, "settings", "main")); return d.exists() ? d.data() : {}; } catch { return {}; }
  }

  // ===== الحوالات =====
  export async function addTransfer(data) {
    const ref = await addDoc(collection(db, "transfers"), {
      ...data, status: data.status || "pending", createdAt: serverTimestamp()
    });
    return ref;
  }

  export async function getTransfers(n = 500) {
    const q = query(collection(db, "transfers"), orderBy("createdAt", "desc"), limit(n));
    const s = await getDocs(q);
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  export function listenTransfers(cb) {
    const q = query(collection(db, "transfers"), orderBy("createdAt", "desc"), limit(200));
    return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
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
    const q = query(collection(db, "accounts"), orderBy("createdAt", "desc"));
    const s = await getDocs(q);
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  export function listenAccounts(cb) {
    const q = query(collection(db, "accounts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  export async function updateAccount(id, data) {
    await updateDoc(doc(db, "accounts", id), { ...data, updatedAt: serverTimestamp() });
  }

  export async function deleteAccount(id) { await deleteDoc(doc(db, "accounts", id)); }

  // ===== سجل الواتساب =====
  export async function logWA(data) {
    try { await addDoc(collection(db, "wa_logs"), { ...data, sentAt: serverTimestamp() }); } catch (e) {}
  }

  export function listenWALogs(cb) {
    const q = query(collection(db, "wa_logs"), orderBy("sentAt", "desc"), limit(50));
    return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  // ===== إحصاءات =====
  export async function getStats() {
    const [transfers, accounts] = await Promise.all([getTransfers(1000), getAccounts()]);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayT = transfers.filter(t => t.createdAt?.toDate && t.createdAt.toDate() >= today);
    return {
      totalBalance:   accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0),
      todayCompleted: todayT.filter(t => t.status === "completed").length,
      todayPending:   todayT.filter(t => t.status === "pending").length,
      todayProfit:    todayT.reduce((s, t) => s + (Number(t.commission) || 0), 0),
      lateAccounts:   accounts.filter(a => a.status === "late").length,
      totalAccounts:  accounts.length,
      activeAccounts: accounts.filter(a => a.status !== "late").length
    };
  }

  export { db };
