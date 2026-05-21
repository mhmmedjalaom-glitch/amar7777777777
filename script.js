// نظام محمد سالم للحوالات المالية
// script.js - الملف الرئيسي للجافاسكربت

document.addEventListener('DOMContentLoaded', function () {

  // ===== تحديد الصفحة النشطة في شريط التنقل =====
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    const href = item.getAttribute('data-href');
    if (href && (currentPage === href || (currentPage === '' && href === 'index.html'))) {
      item.classList.add('active');
    }
    item.addEventListener('click', function () {
      const link = this.getAttribute('data-href');
      if (link) {
        const base = currentPage.includes('/') ? '../' : '';
        window.location.href = base + link;
      }
    });
  });

  // ===== زر الرجوع =====
  const backBtn = document.querySelector('.back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => history.back());
  }

  // ===== بطاقات الإحصاء - تحديث القيم =====
  animateNumbers();

  // ===== أزرار الفلترة =====
  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', function () {
      const parent = this.closest('.filter-chips');
      if (parent) {
        parent.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });

  // ===== المساعد الصوتي =====
  const voiceBtn = document.getElementById('voiceBtn');
  if (voiceBtn) {
    let isListening = false;
    voiceBtn.addEventListener('click', function () {
      isListening = !isListening;
      if (isListening) {
        this.classList.add('listening');
        const statusText = document.getElementById('voiceStatus');
        if (statusText) statusText.textContent = 'جاري الاستماع...';
        setTimeout(() => {
          isListening = false;
          voiceBtn.classList.remove('listening');
          if (statusText) statusText.textContent = 'ابدأ التحدث الآن';
          showNotification('تم تسجيل الأمر بنجاح', 'success');
        }, 3000);
      } else {
        this.classList.remove('listening');
        const statusText = document.getElementById('voiceStatus');
        if (statusText) statusText.textContent = 'ابدأ التحدث الآن';
      }
    });
  }

  // ===== نموذج الحوالة الذكية =====
  const transferForm = document.getElementById('transferForm');
  if (transferForm) {
    const amountInput = document.getElementById('transferAmount');
    const commissionDisplay = document.getElementById('commissionAmount');
    const totalDisplay = document.getElementById('totalAmount');

    if (amountInput) {
      amountInput.addEventListener('input', function () {
        const amount = parseFloat(this.value.replace(/,/g, '')) || 0;
        const commission = Math.round(amount * 0.05);
        const total = amount + commission;
        if (commissionDisplay) commissionDisplay.textContent = formatNumber(commission) + ' ر.ي';
        if (totalDisplay) totalDisplay.textContent = formatNumber(total) + ' ر.ي';
      });
    }

    transferForm.addEventListener('submit', function (e) {
      e.preventDefault();
      showNotification('تم إنشاء الحوالة بنجاح! ✓', 'success');
      setTimeout(() => {
        const base = window.location.pathname.includes('pages/') ? '../' : '';
        window.location.href = base + 'pages/logs.html';
      }, 1500);
    });
  }

  // ===== اختبار إرسال واتساب =====
  const waTestBtn = document.getElementById('waTestBtn');
  if (waTestBtn) {
    waTestBtn.addEventListener('click', function () {
      this.disabled = true;
      this.textContent = 'جاري الإرسال...';
      setTimeout(() => {
        this.disabled = false;
        this.textContent = 'اختبار الإرسال';
        showNotification('تم إرسال الرسالة التجريبية بنجاح ✓', 'success');
      }, 2000);
    });
  }

  // ===== تنبيه عبد الرحمن =====
  const alertBtn = document.getElementById('alertBtn');
  if (alertBtn) {
    alertBtn.addEventListener('click', function () {
      showConfirmDialog(
        'تنبيه عبد الرحمن؟',
        'إرسال كشف حساب تلقائي عبر الواتساب',
        () => showNotification('تم إرسال التنبيه بنجاح ✓', 'success')
      );
    });
  }

  // ===== مسح السجل الصوتي =====
  const clearLogBtn = document.getElementById('clearLogBtn');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', function () {
      showConfirmDialog(
        'مسح السجل؟',
        'هل أنت متأكد من مسح جميع العمليات الصوتية؟',
        () => {
          const logList = document.getElementById('voiceLogList');
          if (logList) logList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;font-family:Tajawal">لا توجد عمليات مسجلة</p>';
          showNotification('تم مسح السجل', 'info');
        }
      );
    });
  }

  // ===== حذف الحساب =====
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', function () {
      showConfirmDialog(
        '⚠️ منطقة الخطورة',
        'هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه.',
        () => showNotification('تم إرسال طلب الحذف للمراجعة', 'warning')
      );
    });
  }

});

// ===== دوال مساعدة =====

function formatNumber(num) {
  return num.toLocaleString('ar-SA');
}

function animateNumbers() {
  const statValues = document.querySelectorAll('.stat-value[data-target]');
  statValues.forEach(el => {
    const target = parseInt(el.getAttribute('data-target'));
    const duration = 1000;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(target * easeOut(progress));
      el.textContent = formatNumber(current);
      if (progress === 1) clearInterval(timer);
    }, 16);
  });
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function showNotification(message, type = 'success') {
  const existing = document.querySelector('.notification-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  const colors = { success: '#2e7d32', warning: '#f57c00', info: '#1565c0', error: '#c62828' };
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: ${colors[type] || colors.success}; color: #fff;
    padding: 12px 20px; border-radius: 12px; font-size: 14px;
    font-family: Cairo,sans-serif; font-weight: 600;
    z-index: 9999; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease; max-width: 320px; text-align: center;
    direction: rtl;
  `;
  const style = document.createElement('style');
  style.textContent = '@keyframes slideIn{from{top:-60px;opacity:0}to{top:20px;opacity:1}}';
  document.head.appendChild(style);
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2500);
}

function showConfirmDialog(title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;
    display:flex;align-items:flex-end;justify-content:center;
  `;
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background:#fff;border-radius:20px 20px 0 0;padding:24px 20px;
    width:100%;max-width:430px;direction:rtl;font-family:Cairo,sans-serif;
  `;
  dialog.innerHTML = `
    <h3 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#1a1a1a">${title}</h3>
    <p style="font-size:13px;color:#666;font-family:Tajawal,sans-serif;line-height:1.6;margin-bottom:20px">${message}</p>
    <div style="display:flex;gap:10px;">
      <button id="confirmYes" style="flex:1;padding:12px;background:linear-gradient(135deg,#8B0000,#660000);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:Cairo,sans-serif">تأكيد</button>
      <button id="confirmNo" style="flex:1;padding:12px;background:#f5f5f5;color:#333;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:Cairo,sans-serif">إلغاء</button>
    </div>
  `;
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  dialog.querySelector('#confirmYes').addEventListener('click', () => { overlay.remove(); onConfirm(); });
  dialog.querySelector('#confirmNo').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ===== أزرار التنقل السريع =====
function navigate(path) {
  const base = window.location.pathname.includes('pages/') ? '../' : '';
  window.location.href = base + path;
}
