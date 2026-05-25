// ===== نظام التصدير المتقدم =====
// Advanced Export System - Excel, PDF, CSV, Backup

export class ExportManager {
  constructor() {
    this.defaultFileName = 'export';
    this.dateFormat = new Intl.DateTimeFormat('ar-SA');
  }

  // ===== تصدير إلى Excel =====
  async exportToExcel(data, fileName = 'data', columns = null) {
    try {
      // استخدام SheetJS (إذا كان متاحاً) أو إنشاء CSV جديد
      const csvContent = this._convertToCSV(data, columns);
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // محاكاة تنزيل Excel (CSV متوافق مع Excel)
      this._downloadBlob(blob, `${fileName}.csv`);
      console.log('✅ تم تصدير إلى Excel');
      return true;
    } catch (error) {
      console.error('❌ خطأ في التصدير:', error);
      return false;
    }
  }

  // ===== تصدير إلى PDF =====
  async exportToPDF(data, fileName = 'report', title = 'التقرير') {
    try {
      // استخدام html2pdf أو إنشاء PDF بسيط
      const htmlContent = this._generateHTMLReport(data, title);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      
      // فتح في نافذة جديدة للطباعة كـ PDF
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url);
      newWindow.print();
      
      console.log('✅ تم فتح التقرير للطباعة كـ PDF');
      return true;
    } catch (error) {
      console.error('❌ خطأ في تصدير PDF:', error);
      return false;
    }
  }

  // ===== تصدير إلى CSV =====
  async exportToCSV(data, fileName = 'data', columns = null) {
    try {
      const csvContent = this._convertToCSV(data, columns);
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      this._downloadBlob(blob, `${fileName}.csv`);
      
      console.log('✅ تم تصدير إلى CSV');
      return true;
    } catch (error) {
      console.error('❌ خطأ في التصدير:', error);
      return false;
    }
  }

  // ===== النسخ الاحتياطية =====
  async createBackup(allData) {
    try {
      const backup = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        data: allData
      };
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const fileName = `backup-${new Date().toISOString().split('T')[0]}.json`;
      this._downloadBlob(blob, fileName);
      
      console.log('✅ تم إنشاء نسخة احتياطية');
      return backup;
    } catch (error) {
      console.error('❌ خطأ في النسخة الاحتياطية:', error);
      return null;
    }
  }

  // ===== استيراد البيانات =====
  async restoreFromBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          
          if (!backup.version || !backup.data) {
            throw new Error('ملف النسخة الاحتياطية غير صحيح');
          }
          
          console.log('✅ تم استيراد البيانات من النسخة الاحتياطية');
          resolve(backup.data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
      reader.readAsText(file);
    });
  }

  // ===== تحويل إلى CSV =====
  _convertToCSV(data, columns = null) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    // تحديد الأعمدة
    const keys = columns || Object.keys(data[0]);
    
    // رؤوس الأعمدة
    const header = keys.map(k => this._escapeCSV(this._translateHeader(k))).join(',');
    
    // الصفوف
    const rows = data.map(row => 
      keys.map(key => {
        let value = row[key];
        
        // تنسيق التاريخ
        if (value instanceof Date) {
          value = this.dateFormat.format(value);
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        return this._escapeCSV(value);
      }).join(',')
    );

    return [header, ...rows].join('\n');
  }

  // ===== تحويل إلى HTML للطباعة =====
  _generateHTMLReport(data, title = 'التقرير') {
    let rows = '';
    
    if (Array.isArray(data)) {
      const headers = Object.keys(data[0]);
      rows = `
        <table border="1" cellpadding="10" cellspacing="0">
          <thead>
            <tr>
              ${headers.map(h => `<th>${this._translateHeader(h)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${headers.map(h => `<td>${this._formatValue(row[h])}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; }
          body {
            font-family: 'Arial', sans-serif;
            direction: rtl;
            padding: 20px;
            background: white;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .header h1 {
            font-size: 28px;
            color: #1a1a1a;
            margin-bottom: 5px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .date {
            text-align: left;
            margin-bottom: 20px;
            color: #666;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th {
            background-color: #4CAF50;
            color: white;
            padding: 12px;
            text-align: right;
            font-weight: bold;
          }
          td {
            padding: 12px;
            border: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          @media print {
            body { padding: 10px; }
            table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏦 ${title}</h1>
          <p>نظام محمد سالم للحوالات المالية</p>
        </div>
        <div class="date">
          <strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-SA')}
        </div>
        ${rows}
        <div class="footer">
          <p>تم إنشاء هذا التقرير من نظام محمد سالم</p>
          <p>${new Date().toLocaleTimeString('ar-SA')}</p>
        </div>
      </body>
      </html>
    `;
  }

  // ===== Utilities =====
  _escapeCSV(value) {
    if (value === null || value === undefined) return '';
    
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  _translateHeader(key) {
    const translations = {
      'id': 'المعرّف',
      'name': 'الاسم',
      'phone': 'الهاتف',
      'balance': 'الرصيد',
      'status': 'الحالة',
      'notes': 'ملاحظات',
      'transferCode': 'كود الحوالة',
      'beneficiary': 'المستفيد',
      'amount': 'المبلغ',
      'currency': 'العملة',
      'commission': 'العمولة',
      'profit': 'الربح',
      'created_at': 'تاريخ الإنشاء',
      'updated_at': 'تاريخ التحديث',
      'type': 'النوع',
      'reason': 'السبب'
    };
    
    return translations[key] || key;
  }

  _formatValue(value) {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (value instanceof Date) return this.dateFormat.format(value);
    if (typeof value === 'number') {
      return value.toLocaleString('ar-SA');
    }
    return String(value);
  }

  _downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ===== تصدير الحسابات =====
  async exportAccounts(accounts, format = 'excel') {
    const columns = ['name', 'phone', 'balance', 'status', 'notes', 'created_at'];
    
    if (format === 'excel' || format === 'csv') {
      return this.exportToExcel(accounts, 'الحسابات', columns);
    } else if (format === 'pdf') {
      return this.exportToPDF(accounts, 'الحسابات', 'تقرير الحسابات');
    }
  }

  // ===== تصدير الحوالات =====
  async exportTransfers(transfers, format = 'excel') {
    const columns = ['transferCode', 'beneficiary', 'amount', 'currency', 'commission', 'status', 'created_at'];
    
    if (format === 'excel' || format === 'csv') {
      return this.exportToExcel(transfers, 'الحوالات', columns);
    } else if (format === 'pdf') {
      return this.exportToPDF(transfers, 'الحوالات', 'تقرير الحوالات');
    }
  }

  // ===== تصدير الأرباح =====
  async exportProfits(profits, format = 'excel') {
    const columns = ['date', 'account', 'amount', 'profit', 'currency'];
    
    if (format === 'excel' || format === 'csv') {
      return this.exportToExcel(profits, 'الأرباح', columns);
    } else if (format === 'pdf') {
      return this.exportToPDF(profits, 'الأرباح', 'تقرير الأرباح');
    }
  }

  // ===== طباعة التقرير =====
  async printReport(data, title = 'التقرير') {
    const html = this._generateHTMLReport(data, title);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url);
    printWindow.onload = () => printWindow.print();
  }

  // ===== إنشاء QR Code (للمستقبل) =====
  async generateQRCode(data) {
    // يمكن استخدام qrcode.js أو مكتبة أخرى
    console.log('QR Code:', data);
  }

  // ===== تصدير متعدد الصيغ =====
  async exportAll(allData, baseFileName = 'export') {
    const results = {
      excel: await this.exportToExcel(allData, `${baseFileName}-excel`),
      csv: await this.exportToCSV(allData, `${baseFileName}-csv`),
      backup: await this.createBackup(allData)
    };
    
    console.log('✅ تم تصدير جميع الصيغ');
    return results;
  }
}

// ===== Global Instance =====
export const exportManager = new ExportManager();

// ===== Utility Functions =====
window.exportToExcel = (data, fileName) => exportManager.exportToExcel(data, fileName);
window.exportToPDF = (data, fileName) => exportManager.exportToPDF(data, fileName);
window.exportToCSV = (data, fileName) => exportManager.exportToCSV(data, fileName);
window.createBackup = (data) => exportManager.createBackup(data);
window.restoreFromBackup = (file) => exportManager.restoreFromBackup(file);
