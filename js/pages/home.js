/* ============================================================
   home.js - 首页：天数计数、倒计时、今日回忆
   ============================================================ */

window.HomePage = {
  async render() {
    const settings = DB.getSettings();
    const dates = DB.getImportantDates();
    const periodRecords = DB.getPeriodRecords();
    const memories = await DB.getMemories();
    const container = document.querySelector('.home-content');

    const today = Utils.formatDate(new Date());

    // === 在一起天数 ===
    let daysHtml = '';
    if (settings.togetherDate) {
      const days = Utils.daysBetween(settings.togetherDate, today);
      daysHtml = `
        <div class="card days-counter">
          <div class="days-number">${days.toLocaleString()}</div>
          <div class="days-label">💕 ${settings.partner1Name} 和 ${settings.partner2Name} 在一起</div>
          <div class="days-date">从 ${Utils.formatDateCN(settings.togetherDate)} 到今天</div>
        </div>
      `;
    } else {
      daysHtml = `
        <div class="card days-counter" style="cursor:pointer" onclick="window.location.hash='#settings'">
          <div class="days-number">❤️</div>
          <div class="days-label">点击设置在一起的日期</div>
          <div class="days-date">记录你们的每一天</div>
        </div>
      `;
    }

    // === 情话 ===
    const quote = Utils.randomQuote();

    // === 倒计时列表 ===
    let countdownItems = '';
    const upcoming = dates
      .filter(d => d.type !== 'period')
      .map(d => {
        const remain = d.repeat !== 'none'
          ? Utils.daysUntilNext(d.date, d.repeat)
          : Utils.daysUntil(d.date);
        return { ...d, remain };
      })
      .sort((a, b) => a.remain - b.remain)
      .filter(d => d.remain >= 0)
      .slice(0, 5);

    if (upcoming.length > 0) {
      countdownItems = upcoming.map(d => {
        const typeIcons = {
          anniversary: '💝',
          birthday: '🎂',
          custom: '📌',
        };
        let displayDate;
        if (d.repeat !== 'none') {
          const next = Utils.getNextOccurrence(d.date, d.repeat);
          displayDate = Utils.formatDateCN(next);
        } else {
          displayDate = Utils.formatDateCN(d.date);
        }
        return `
          <div class="countdown-item">
            <div class="countdown-info">
              <span class="countdown-icon">${typeIcons[d.type] || '📌'}</span>
              <div>
                <div class="countdown-title">${d.title}</div>
                <div class="countdown-date">${displayDate}</div>
              </div>
            </div>
            <div class="countdown-days">
              ${d.remain === 0 ? '🎉 就是今天！' : `还有 ${d.remain} 天`}
            </div>
          </div>
        `;
      }).join('');
    } else {
      countdownItems = `<div class="empty-state"><p>还没有重要日子，去添加吧 💝</p></div>`;
    }

    // === 经期倒计时 ===
    let periodHtml = '';
    const prediction = Utils.predictPeriod(periodRecords);
    if (prediction) {
      if (prediction.daysUntilNext < 0) {
        periodHtml = `
          <div class="countdown-item" style="background:#fce4ec">
            <div class="countdown-info">
              <span class="countdown-icon">🔴</span>
              <div>
                <div class="countdown-title">经期可能已开始</div>
                <div class="countdown-date">预测日期：${Utils.formatDateCN(prediction.nextStart)}</div>
              </div>
            </div>
            <div class="countdown-days" style="color:#e91e63">请注意</div>
          </div>
        `;
      } else if (prediction.daysUntilNext <= 3) {
        periodHtml = `
          <div class="countdown-item" style="background:#fff3e0">
            <div class="countdown-info">
              <span class="countdown-icon">⚠️</span>
              <div>
                <div class="countdown-title">经期即将到来</div>
                <div class="countdown-date">预测日期：${Utils.formatDateCN(prediction.nextStart)}</div>
              </div>
            </div>
            <div class="countdown-days" style="color:#ff9800">还有 ${prediction.daysUntilNext} 天</div>
          </div>
        `;
      } else {
        periodHtml = `
          <div class="countdown-item">
            <div class="countdown-info">
              <span class="countdown-icon">📅</span>
              <div>
                <div class="countdown-title">预测下次经期</div>
                <div class="countdown-date">${Utils.formatDateCN(prediction.nextStart)} ~ ${Utils.formatDateCN(prediction.nextEnd)} · 周期${prediction.avgCycle}天</div>
              </div>
            </div>
            <div class="countdown-days">还有 ${prediction.daysUntilNext} 天</div>
          </div>
        `;
      }
    } else if (periodRecords.length > 0) {
      periodHtml = `
        <div class="countdown-item" style="background:#f5f5f5">
          <div class="countdown-info">
            <span class="countdown-icon">📅</span>
            <div>
              <div class="countdown-title">需要更多经期记录</div>
              <div class="countdown-date">至少记录2次才能预测哦</div>
            </div>
          </div>
        </div>
      `;
    }

    // === 今日回忆 ===
    let memoryHtml = '';
    if (memories.length > 0) {
      const randomMemory = memories[Math.floor(Math.random() * memories.length)];
      memoryHtml = `
        <div class="card random-memory" onclick="window.location.hash='#memories'">
          <div class="card-title">📸 今日回忆</div>
          <div class="memory-date">${Utils.formatDateCN(randomMemory.date)}</div>
          <div class="memory-title">${Utils.escapeHtml(randomMemory.title)}</div>
          <div class="memory-desc">${Utils.escapeHtml(randomMemory.description || '')}</div>
          ${randomMemory.photos && randomMemory.photos[0] ? `<img src="${randomMemory.photos[0]}" alt="">` : ''}
        </div>
      `;
    }

    // === 组装页面 ===
    container.innerHTML = `
      <div class="home-grid">
        ${daysHtml}

        <div class="card hero-quote">
          「${quote}」
        </div>

        <div class="card">
          <div class="card-title">⏳ 重要日子倒计时</div>
          <div class="countdown-list">
            ${periodHtml}
            ${countdownItems}
          </div>
        </div>

        <div class="card">
          <div class="card-title">📋 快速导航</div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
            <button class="btn btn-secondary" onclick="window.location.hash='#memories'">📸 创建新回忆</button>
            <button class="btn btn-secondary" onclick="window.location.hash='#dates'">📅 添加重要日子</button>
            <button class="btn btn-secondary" onclick="window.location.hash='#plans'">🎯 查看人生规划</button>
            <button class="btn btn-secondary" onclick="window.location.hash='#notes'">💌 写一封情书</button>
          </div>
        </div>

        ${memoryHtml}
      </div>
    `;
  }
};
