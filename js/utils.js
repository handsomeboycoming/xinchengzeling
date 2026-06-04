/* ============================================================
   utils.js - 工具函数
   ============================================================ */

const Utils = {
  // 生成唯一 ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // 格式化日期 YYYY-MM-DD
  formatDate(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // 格式化日期为中文
  formatDateCN(date) {
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },

  // 计算两个日期相差的天数
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  },

  // 计算距离目标日期还有多少天
  daysUntil(targetDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    return Math.floor((target - today) / (1000 * 60 * 60 * 24));
  },

  // 获取下一次该日期（处理年重复）
  getNextOccurrence(dateStr, repeat) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = dateStr.split('-');
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    if (repeat === 'yearly') {
      let next = new Date(today.getFullYear(), month, day);
      if (next <= today) {
        next = new Date(today.getFullYear() + 1, month, day);
      }
      return next;
    }
    if (repeat === 'monthly') {
      let next = new Date(today.getFullYear(), today.getMonth(), day);
      if (next <= today) {
        next = new Date(today.getFullYear(), today.getMonth() + 1, day);
      }
      return next;
    }
    // none: 就是日期本身
    return new Date(dateStr);
  },

  // 计算距离下次重复日期还有多少天
  daysUntilNext(dateStr, repeat) {
    const next = this.getNextOccurrence(dateStr, repeat);
    return this.daysBetween(new Date(), next);
  },

  // SHA-256 哈希（异步）
  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 文件转 Base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // 防抖
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // 显示 Toast
  showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
  },

  // 显示弹窗
  showModal(html, onClose) {
    const overlay = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    body.innerHTML = html;
    overlay.classList.remove('hidden');
    overlay._onClose = onClose;
  },

  // 关闭弹窗
  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    if (overlay._onClose) overlay._onClose();
  },

  // 打开灯箱
  openLightbox(images, index = 0) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    lb._images = images;
    lb._index = index;
    img.src = images[index];
    lb.classList.remove('hidden');
  },

  // 关闭灯箱
  closeLightbox() {
    document.getElementById('lightbox').classList.add('hidden');
  },

  // 经期预测
  predictPeriod(periodRecords) {
    if (!periodRecords || periodRecords.length < 2) return null;

    // 按开始日期排序
    const sorted = [...periodRecords].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // 计算最近几个周期的平均长度
    const cycles = [];
    for (let i = 1; i < sorted.length; i++) {
      cycles.push(Utils.daysBetween(sorted[i - 1].startDate, sorted[i].startDate));
    }

    // 取最近3-6个周期的平均值
    const recentCycles = cycles.slice(-6);
    const avgCycle = Math.round(recentCycles.reduce((a, b) => a + b, 0) / recentCycles.length);

    // 计算平均经期长度
    const periodLengths = sorted.map(r => {
      if (r.endDate) return Utils.daysBetween(r.startDate, r.endDate) + 1;
      return 5; // 默认5天
    });
    const avgPeriodLength = Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length);

    // 预测下次经期
    const lastStart = new Date(sorted[sorted.length - 1].startDate);
    const nextStart = new Date(lastStart);
    nextStart.setDate(nextStart.getDate() + avgCycle);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + avgPeriodLength - 1);

    // 估算排卵期（通常下次经期前14天）
    const ovulationDate = new Date(nextStart);
    ovulationDate.setDate(ovulationDate.getDate() - 14);
    const ovulationStart = new Date(ovulationDate);
    ovulationStart.setDate(ovulationStart.getDate() - 2);
    const ovulationEnd = new Date(ovulationDate);
    ovulationEnd.setDate(ovulationEnd.getDate() + 2);

    return {
      avgCycle,
      avgPeriodLength,
      nextStart: Utils.formatDate(nextStart),
      nextEnd: Utils.formatDate(nextEnd),
      ovulationDate: Utils.formatDate(ovulationDate),
      ovulationStart: Utils.formatDate(ovulationStart),
      ovulationEnd: Utils.formatDate(ovulationEnd),
      daysUntilNext: Utils.daysBetween(new Date(), nextStart),
    };
  },

  // 获取当前月份的经期日期集合
  getPeriodDaysForMonth(periodRecords, year, month) {
    const days = new Set();
    if (!periodRecords) return days;

    periodRecords.forEach(record => {
      const start = new Date(record.startDate);
      const end = record.endDate ? new Date(record.endDate) : new Date(record.startDate);
      end.setDate(end.getDate() + 4); // 默认5天

      const current = new Date(start);
      while (current <= end) {
        if (current.getFullYear() === year && current.getMonth() === month) {
          days.add(current.getDate());
          // 也记录哪些是周期的第一天
          if (Utils.formatDate(current) === record.startDate) {
            days._firstDays = days._firstDays || new Set();
            days._firstDays.add(current.getDate());
          }
          if (Utils.formatDate(current) === (record.endDate || Utils.formatDate(new Date(start.getTime() + 4 * 86400000)))) {
            days._lastDays = days._lastDays || new Set();
            days._lastDays.add(current.getDate());
          }
        }
        current.setDate(current.getDate() + 1);
      }
    });
    return days;
  },

  // 情话列表
  loveQuotes: [
    '遇见你，是我这辈子最美丽的意外 💕',
    '你是我温暖的手套，冰冷的啤酒，带着阳光味道的衬衫，日复一日的梦想 ✨',
    '我想和你一起，看遍世间所有的风景 🌸',
    '爱你，是我做过最好的事 💖',
    '你是我的今天，也是我所有的明天 🌙',
    '和你在一起的每一天，都是情人节 🌹',
    '世间万物，唯有你最珍贵 💎',
    '我愿意用一生的时间，陪你走过每一个春夏秋冬 🍃',
    '你一笑，我的整个世界都亮了 ☀️',
    '最好的关系，是互相成就，一起成长 🌱',
    '往后余生，风雪是你，平淡是你 🌨️',
    '和你在一起，连空气都是甜的 🍬',
    '你是上天赐给我最好的礼物 🎁',
    '有你的地方，就是家 🏠',
    '一生很长，但只要有你，就刚刚好 💫',
  ],

  // 获取随机情话
  randomQuote() {
    return this.loveQuotes[Math.floor(Math.random() * this.loveQuotes.length)];
  },

  // HTML 转义
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // 确认对话框
  confirm(message) {
    return new Promise((resolve) => {
      const html = `
        <div style="text-align:center">
          <p style="margin-bottom:20px;font-size:1.05rem">${message}</p>
          <div style="display:flex;gap:12px;justify-content:center">
            <button class="btn btn-secondary" id="confirm-no">取消</button>
            <button class="btn btn-danger" id="confirm-yes">确认</button>
          </div>
        </div>
      `;
      Utils.showModal(html);
      document.getElementById('confirm-yes').onclick = () => { Utils.closeModal(); resolve(true); };
      document.getElementById('confirm-no').onclick = () => { Utils.closeModal(); resolve(false); };
    });
  },

  // 迁移助手：将旧版 Base64 照片上传到 Supabase
  async migrateBase64Photos(photos) {
    if (!photos || photos.length === 0) return [];
    const urls = [];
    for (const photo of photos) {
      if (photo.startsWith('data:')) {
        try {
          const url = await DB.uploadBase64Photo(photo, 'migrated');
          urls.push(url);
        } catch (e) {
          console.warn('照片迁移失败，保留原始数据:', e);
          urls.push(photo);
        }
      } else {
        urls.push(photo);
      }
    }
    return urls;
  },

  // 迁移助手：从旧版 JSON 导入数据
  async importFromOldFormat(jsonData, progressCallback) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    let total = 0, done = 0;

    if (data.memories) total += data.memories.length;
    if (data.importantDates) total++;
    if (data.periodRecords) total++;
    if (data.plans) total++;
    if (data.notes) total++;
    if (data.wishlist) total++;
    if (data.settings) total++;

    const report = () => progressCallback && progressCallback(done, total);

    if (data.settings) {
      await DB.saveSettings(data.settings);
      done++; report();
    }

    if (data.memories) {
      for (const m of data.memories) {
        m.photos = await Utils.migrateBase64Photos(m.photos || []);
        await DB.saveMemory(m);
        done++; report();
      }
    }

    if (data.importantDates) { await DB.saveImportantDates(data.importantDates); done++; report(); }
    if (data.periodRecords) { await DB.savePeriodRecords(data.periodRecords); done++; report(); }
    if (data.plans) { await DB.savePlans(data.plans); done++; report(); }
    if (data.notes) { await DB.saveNotes(data.notes); done++; report(); }
    if (data.wishlist) { await DB.saveWishlist(data.wishlist); done++; report(); }

    return true;
  },
};
