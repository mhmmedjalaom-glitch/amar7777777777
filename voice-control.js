// ===== نظام التحكم الصوتي الذكي بالعربية =====
// Smart Voice Control System - Arabic Full Support

export class VoiceController {
  constructor(onCommandExecuted) {
    this.isListening = false;
    this.recognition = null;
    this.synthesis = null;
    this.onCommandExecuted = onCommandExecuted;
    this.transcript = '';
    this.confidence = 0;
    this.listeners = [];
    
    this._initSpeechRecognition();
    this._initSpeechSynthesis();
    this._setupCommands();
  }

  // ===== التهيئة =====
  _initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('❌ لم يتم دعم Speech Recognition في هذا المتصفح');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'ar-SA';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.transcript = '';
      console.log('🎤 تم بدء الاستماع...');
      this._notifyListeners('onStart');
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          maxConfidence = Math.max(maxConfidence, confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      this.transcript = finalTranscript || interimTranscript;
      this.confidence = maxConfidence;

      console.log(`📝 النص: ${this.transcript} (ثقة: ${Math.round(maxConfidence * 100)}%)`);
      this._notifyListeners('onTranscript', {
        transcript: this.transcript,
        confidence: this.confidence,
        isFinal: finalTranscript !== ''
      });
    };

    this.recognition.onerror = (event) => {
      console.error('❌ خطأ في التعرف الصوتي:', event.error);
      this._notifyListeners('onError', { error: event.error });
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('🔇 انتهى الاستماع');
      
      if (this.transcript.trim()) {
        this._processCommand(this.transcript.trim());
      }
      
      this._notifyListeners('onEnd');
    };
  }

  _initSpeechSynthesis() {
    this.synthesis = window.speechSynthesis;
  }

  // ===== إعداد الأوامر =====
  _setupCommands() {
    this.commands = {
      // أوامر الحوالات
      'أضف حوالة': { action: 'openTransferForm' },
      'حوالة جديدة': { action: 'openTransferForm' },
      'إرسال حوالة': { action: 'openTransferForm' },
      'حوالة': { action: 'openTransferForm' },

      // أوامر إدارة الحسابات
      'أضف عميل': { action: 'openAccountForm' },
      'حساب جديد': { action: 'openAccountForm' },
      'عميل جديد': { action: 'openAccountForm' },
      'إضافة حساب': { action: 'openAccountForm' },

      // أوامر البحث
      'ابحث عن': { action: 'startSearch', requiresInput: true },
      'ابحث': { action: 'startSearch', requiresInput: true },
      'بحث': { action: 'startSearch', requiresInput: true },

      // أوامر الأرباح والتقارير
      'الأرباح': { action: 'showProfits' },
      'أرباح اليوم': { action: 'showProfits' },
      'عرض الأرباح': { action: 'showProfits' },
      'تقارير': { action: 'showReports' },
      'التقارير': { action: 'showReports' },

      // أوامر الحسابات
      'الحسابات': { action: 'showAccounts' },
      'الحوالات': { action: 'showTransfers' },
      'قائمة الحوالات': { action: 'showTransfers' },
      'سجل الحوالات': { action: 'showTransfers' },

      // أوامر الرصيد والمعلومات
      'الرصيد': { action: 'showBalance' },
      'كم رصيدي': { action: 'showBalance' },
      'ما الرصيد': { action: 'showBalance' },
      'معلومات': { action: 'showInfo' },
      'إحصاءات': { action: 'showStats' },

      // أوامر سندات القبض والصرف
      'سند قبض': { action: 'openVoucherForm', type: 'receipt' },
      'سند صرف': { action: 'openVoucherForm', type: 'payment' },
      'إضافة سند': { action: 'openVoucherForm' },

      // أوامر أخرى
      'الرئيسية': { action: 'goHome' },
      'الصفحة الرئيسية': { action: 'goHome' },
      'الإعدادات': { action: 'openSettings' },
      'إعدادات': { action: 'openSettings' },
      'قائمة': { action: 'showMenu' },
      'مساعدة': { action: 'showHelp' },
      'تعليمات': { action: 'showHelp' },
    };
  }

  // ===== معالجة الأوامر =====
  _processCommand(text) {
    const normalizedText = text.trim().toLowerCase();
    
    // البحث عن أفضل تطابق
    let bestMatch = null;
    let bestScore = 0;

    for (const [command, action] of Object.entries(this.commands)) {
      const score = this._calculateSimilarity(normalizedText, command.toLowerCase());
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { command, action, score };
      }
    }

    if (bestMatch && bestScore > 0.6) {
      console.log(`✅ أمر مطابق: ${bestMatch.command} (${Math.round(bestScore * 100)}%)`);
      this._executeCommand(bestMatch.action);
      return;
    }

    console.log('❓ لم يتم التعرف على الأمر');
    this.speak('عذراً، لم أتمكن من فهم الأمر. يرجى المحاولة مجدداً.');
  }

  _calculateSimilarity(str1, str2) {
    // Levenshtein distance
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const editDistance = this._levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  _levenshteinDistance(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) track[0][i] = i;
    for (let j = 0; j <= str2.length; j++) track[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    return track[str2.length][str1.length];
  }

  _executeCommand(action) {
    console.log(`🚀 تنفيذ الأمر: ${action.action}`);
    
    if (this.onCommandExecuted) {
      this.onCommandExecuted(action);
    }

    this._notifyListeners('onCommand', action);
  }

  // ===== التحدث (النطق) =====
  speak(text, language = 'ar-SA') {
    // إيقاف أي كلام جاري
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log('🔊 جاري النطق...');
      this._notifyListeners('onSpeakStart');
    };

    utterance.onend = () => {
      console.log('✅ انتهى النطق');
      this._notifyListeners('onSpeakEnd');
    };

    utterance.onerror = (event) => {
      console.error('❌ خطأ في النطق:', event.error);
    };

    this.synthesis.speak(utterance);
  }

  // ===== التحكم =====
  startListening() {
    if (!this.recognition) {
      console.warn('❌ لم يتم دعم Speech Recognition');
      return false;
    }
    
    if (this.isListening) {
      console.warn('⚠️ الاستماع قيد التنفيذ بالفعل');
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.error('خطأ في بدء الاستماع:', e);
      return false;
    }
  }

  stopListening() {
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
    } catch (e) {
      console.error('خطأ في إيقاف الاستماع:', e);
    }
  }

  abortListening() {
    if (!this.recognition) return;
    
    try {
      this.recognition.abort();
    } catch (e) {
      console.error('خطأ في إلغاء الاستماع:', e);
    }
  }

  // ===== الاستماع للأحداث =====
  on(event, callback) {
    if (!this.listeners.find(l => l.event === event && l.callback === callback)) {
      this.listeners.push({ event, callback });
    }
  }

  off(event, callback) {
    this.listeners = this.listeners.filter(l => !(l.event === event && l.callback === callback));
  }

  _notifyListeners(event, data) {
    this.listeners
      .filter(l => l.event === event)
      .forEach(l => {
        try {
          l.callback(data);
        } catch (e) {
          console.error('خطأ في معالج الحدث:', e);
        }
      });
  }

  // ===== المعلومات =====
  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  getSynthesisVoices() {
    return this.synthesis.getVoices().filter(v => v.lang.startsWith('ar'));
  }

  getStatus() {
    return {
      isListening: this.isListening,
      isSupported: this.isSupported(),
      transcript: this.transcript,
      confidence: this.confidence,
      hasVoices: this.getSynthesisVoices().length > 0
    };
  }
}

// ===== واجهة المستخدم للتحكم الصوتي =====
export class VoiceUI {
  constructor(container, voiceController) {
    this.container = container;
    this.voiceController = voiceController;
    this.isVisible = false;
    
    this._createUI();
    this._setupEventListeners();
  }

  _createUI() {
    this.container.innerHTML = `
      <div class="voice-control-panel" style="display: none;">
        <div class="voice-header">
          <h3>🎤 التحكم الصوتي</h3>
          <button class="voice-close" aria-label="إغلاق">✕</button>
        </div>
        
        <div class="voice-content">
          <button class="voice-mic-btn" id="voiceMicBtn">
            <span class="mic-icon">🎙️</span>
            <span class="mic-text">اضغط للاستماع</span>
          </button>
          
          <div class="voice-status" id="voiceStatus" style="display: none;">
            <div class="status-indicator listening"></div>
            <div class="status-text">جاري الاستماع...</div>
          </div>
          
          <div class="voice-transcript" id="voiceTranscript"></div>
          
          <div class="voice-commands" id="voiceCommandsList">
            <h4>الأوامر المتاحة:</h4>
            <div class="commands-grid"></div>
          </div>
        </div>
      </div>
      
      <style>
        .voice-control-panel {
          position: fixed;
          bottom: 80px;
          right: 20px;
          width: 90%;
          max-width: 400px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          z-index: 1000;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .voice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #eee;
        }

        .voice-header h3 {
          margin: 0;
          color: #333;
          font-size: 16px;
        }

        .voice-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #999;
        }

        .voice-content {
          padding: 15px;
        }

        .voice-mic-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .voice-mic-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .voice-mic-btn:active {
          transform: translateY(0);
        }

        .voice-status {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 15px 0;
          padding: 10px;
          background: #f0f7ff;
          border-radius: 8px;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ff4444;
          animation: pulse 0.6s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .voice-transcript {
          padding: 10px;
          background: #f9f9f9;
          border-radius: 8px;
          margin: 10px 0;
          min-height: 30px;
          max-height: 60px;
          overflow-y: auto;
          font-size: 14px;
          color: #666;
        }

        .voice-commands {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }

        .voice-commands h4 {
          margin: 0 0 10px;
          color: #333;
          font-size: 14px;
        }

        .commands-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .command-tag {
          padding: 6px 10px;
          background: #f0f0f0;
          border-radius: 6px;
          font-size: 12px;
          text-align: center;
          color: #666;
        }
      </style>
    `;
  }

  _setupEventListeners() {
    const micBtn = this.container.querySelector('#voiceMicBtn');
    const closeBtn = this.container.querySelector('.voice-close');
    const panel = this.container.querySelector('.voice-control-panel');

    micBtn.addEventListener('click', () => this._toggleListening());
    closeBtn.addEventListener('click', () => this.hide());

    this.voiceController.on('onStart', () => {
      this._showStatus();
      micBtn.classList.add('listening');
    });

    this.voiceController.on('onEnd', () => {
      this._hideStatus();
      micBtn.classList.remove('listening');
    });

    this.voiceController.on('onTranscript', (data) => {
      this._updateTranscript(data.transcript);
    });

    this._loadCommands();
  }

  _toggleListening() {
    if (this.voiceController.isListening) {
      this.voiceController.stopListening();
    } else {
      this.voiceController.startListening();
    }
  }

  _showStatus() {
    const status = this.container.querySelector('#voiceStatus');
    status.style.display = 'flex';
  }

  _hideStatus() {
    const status = this.container.querySelector('#voiceStatus');
    status.style.display = 'none';
  }

  _updateTranscript(text) {
    const transcript = this.container.querySelector('#voiceTranscript');
    transcript.textContent = text || '';
  }

  _loadCommands() {
    const grid = this.container.querySelector('.commands-grid');
    const commands = Object.keys(this.voiceController.commands).slice(0, 12);
    
    grid.innerHTML = commands.map(cmd => `
      <div class="command-tag" title="${cmd}">${cmd}</div>
    `).join('');
  }

  show() {
    const panel = this.container.querySelector('.voice-control-panel');
    panel.style.display = 'block';
    this.isVisible = true;
  }

  hide() {
    const panel = this.container.querySelector('.voice-control-panel');
    panel.style.display = 'none';
    this.isVisible = false;
  }

  toggle() {
    this.isVisible ? this.hide() : this.show();
  }
}

// ===== Global Instance =====
export let voiceController = null;
export let voiceUI = null;

export function initVoiceControl(onCommandExecuted) {
  voiceController = new VoiceController(onCommandExecuted);
  
  // إنشاء زر الميكروفون في الواجهة
  const voiceContainer = document.createElement('div');
  voiceContainer.id = 'voiceControlContainer';
  document.body.appendChild(voiceContainer);
  
  voiceUI = new VoiceUI(voiceContainer, voiceController);
  
  // زر عائم للتحكم الصوتي
  const floatingBtn = document.createElement('button');
  floatingBtn.id = 'voiceControlBtn';
  floatingBtn.innerHTML = '🎤';
  floatingBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999;
    transition: all 0.3s ease;
  `;
  
  floatingBtn.addEventListener('click', () => voiceUI.toggle());
  floatingBtn.addEventListener('mouseenter', () => {
    floatingBtn.style.transform = 'scale(1.1)';
  });
  floatingBtn.addEventListener('mouseleave', () => {
    floatingBtn.style.transform = 'scale(1)';
  });
  
  document.body.appendChild(floatingBtn);
  
  console.log('✅ نظام التحكم الصوتي جاهز');
  return voiceController;
}
