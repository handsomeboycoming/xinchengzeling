/* ============================================================
   dates.js - 重要日子：日历、纪念日、智能经期追踪
   ============================================================ */

window.DatesPage = {
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  activeTab: 'dates', // 'dates' | 'period'

  async render() {
    const dates = DB.getImportantDates();
    const periodRecords = DB.getPeriodRecords();
    const container = document.querySelector('.dates-content');

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
        <h2 style="color:var(--primary)">📅 重要日子</h2>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm ${DatesPage.activeTab === 'dates' ? 'btn-primary' : 'btn-secondary'}"
                  onclick="DatesPage.switchTab('dates')">💝 纪念日</button>
          <button class="btn btn-sm ${DatesPage.activeTab === 'period' ? 'btn-primary' : 'btn-secondary'}"
                  onclick="DatesPage.switchTab('period')">🔴 姨妈记录</button>
        </div>
      </div>

      <div class="dates-layout">
        <div class="calendar" id="calendar-container">
          ${DatesPage.renderCalendar(periodRecords, dates)}
        </div>
        <div id="dates-right-panel">
          ${DatesPage.activeTab === 'dates'
            ? DatesPage.renderDatesList(dates)
            : DatesPage.renderPeriodPanel(periodRecords)
          }
        </div>
      </div>
    `;

    // 绑定日历事件
    DatesPage.bindCalendarEvents();
  },

  switchTab(tab) {
    DatesPage.activeTab = tab;
    DatesPage.render();
  },

  // === 日历 ===
  renderCalendar(periodRecords, dates) {
    const year = DatesPage.calendarYear;
    const month = DatesPage.calendarMonth;
    const today = new Date();
    const todayStr = Utils.formatDate(today);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay(); // 周日=0
    const totalDays = lastDay.getDate();

    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

    // 经期日
    const periodDays = Utils.getPeriodDaysForMonth(periodRecords, year, month);

    // 预测经期日
    const prediction = Utils.predictPeriod(periodRecords);
    let predictedPeriodDays = new Set();
    let ovulationDays = new Set();
    if (prediction) {
      const nextStart = new Date(prediction.nextStart);
      const nextEnd = new Date(prediction.nextEnd);
      const current = new Date(nextStart);
      while (current <= nextEnd) {
        if (current.getFullYear() === year && current.getMonth() === month) {
          predictedPeriodDays.add(current.getDate());
        }
        current.setDate(current.getDate() + 1);
      }
      // 排卵期
      const ovStart = new Date(prediction.ovulationStart);
      const ovEnd = new Date(prediction.ovulationEnd);
      const ovCurrent = new Date(ovStart);
      while (ovCurrent <= ovEnd) {
        if (ovCurrent.getFullYear() === year && ovCurrent.getMonth() === month) {
          ovulationDays.add(ovCurrent.getDate());
        }
        ovCurrent.setDate(ovCurrent.getDate() + 1);
      }
    }

    // 有事件的日期集合
    const eventDays = new Set();
    dates.forEach(d => {
      if (d.type !== 'period') {
        // 检查是否是当月
        const dDate = new Date(d.date);
        if (dDate.getFullYear() === year && dDate.getMonth() === month) {
          eventDays.add(dDate.getDate());
        }
        // 对于重复事件，检查是否有当月的一次
        if (d.repeat !== 'none') {
          const next = Utils.getNextOccurrence(d.date, d.repeat);
          if (next.getFullYear() === year && next.getMonth() === month) {
            eventDays.add(next.getDate());
          }
        }
      }
    });

    // 构建日历格子
    let daysHtml = '';

    // 填充前面的空白
    for (let i = 0; i < startPadding; i++) {
      daysHtml += '<div class="calendar-day other-month"></div>';
    }

    // 填充当月的天数
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let cls = 'calendar-day';
      if (dateStr === todayStr) cls += ' today';

      // 经期日样式
      if (periodDays.has(d)) {
        const isFirst = periodDays._firstDays?.has(d);
        const isLast = periodDays._lastDays?.has(d);
        if (isFirst && isLast) cls += ' period-day single';
        else if (isFirst) cls += ' period-day first';
        else if (isLast) cls += ' period-day last';
        else cls += ' period-day';
      } else if (predictedPeriodDays.has(d)) {
        cls += ' period-day single';
        cls += ' predicted';
      } else if (ovulationDays.has(d)) {
        cls += ' ovulation-day';
      } else if (eventDays.has(d)) {
        cls += ' has-event';
      }

      daysHtml += `<div class="${cls}" data-date="${dateStr}">${d}</div>`;
    }

    const canGoNext = !(year === today.getFullYear() && month >= today.getMonth());

    return `
      <div class="calendar-header">
        <button class="calendar-nav" onclick="DatesPage.prevMonth()">◀</button>
        <span class="calendar-month">${year}年 ${monthNames[month]}</span>
        <button class="calendar-nav" onclick="DatesPage.nextMonth()" ${!canGoNext ? 'disabled style="opacity:0.3"' : ''}>▶</button>
      </div>
      <div class="calendar-weekdays">
        <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
      </div>
      <div class="calendar-days">${daysHtml}</div>
      <div class="calendar-legend">
        <span class="legend-item"><span class="legend-dot period"></span> 经期</span>
        <span class="legend-item"><span class="legend-dot ovulation"></span> 排卵期</span>
        <span class="legend-item"><span class="legend-dot event"></span> 纪念日</span>
      </div>
      <button class="btn btn-sm btn-secondary" style="margin-top:12px;width:100%"
              onclick="DatesPage.showAddDateForm()">➕ 添加重要日子</button>
    `;
  },

  bindCalendarEvents() {
    document.querySelectorAll('.calendar-day:not(.other-month)').forEach(day => {
      day.addEventListener('click', () => {
        const dateStr = day.dataset.date;
        // 快速添加/查看该日期的信息
        const dates = DB.getImportantDates();
        const periodRecords = DB.getPeriodRecords();
        const onThisDay = dates.filter(d => {
          if (d.repeat !== 'none') {
            const next = Utils.getNextOccurrence(d.date, d.repeat);
            return Utils.formatDate(next) === dateStr;
          }
          return d.date === dateStr;
        });

        let msg = `${Utils.formatDateCN(dateStr)}\n`;
        if (onThisDay.length > 0) {
          msg += `\n📌 重要日子：\n${onThisDay.map(d => `  ${d.title}`).join('\n')}`;
        }

        // 检查经期日
        const periodDays = Utils.getPeriodDaysForMonth(periodRecords, DatesPage.calendarYear, DatesPage.calendarMonth);
        const dayNum = parseInt(dateStr.split('-')[2]);
        if (periodDays.has(dayNum)) {
          msg += '\n🔴 经期中';
        }
      });
    });
  },

  prevMonth() {
    if (DatesPage.calendarMonth === 0) {
      DatesPage.calendarYear--;
      DatesPage.calendarMonth = 11;
    } else {
      DatesPage.calendarMonth--;
    }
    DatesPage.render();
  },

  nextMonth() {
    const today = new Date();
    // 不能超过当前月份
    if (DatesPage.calendarYear === today.getFullYear() && DatesPage.calendarMonth >= today.getMonth()) return;
    if (DatesPage.calendarMonth === 11) {
      DatesPage.calendarYear++;
      DatesPage.calendarMonth = 0;
    } else {
      DatesPage.calendarMonth++;
    }
    DatesPage.render();
  },

  // === 重要日子列表 ===
  renderDatesList(dates) {
    const sorted = [...dates].filter(d => d.type !== 'period').sort((a, b) => {
      const remainA = a.repeat !== 'none' ? Utils.daysUntilNext(a.date, a.repeat) : Utils.daysUntil(a.date);
      const remainB = b.repeat !== 'none' ? Utils.daysUntilNext(b.date, b.repeat) : Utils.daysUntil(b.date);
      return remainA - remainB;
    });

    const typeIcons = { anniversary: '💝', birthday: '🎂', custom: '📌' };

    let html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3 style="font-size:1.05rem">💝 纪念日 & 重要日子</h3>
        <button class="btn btn-sm btn-primary" onclick="DatesPage.showAddDateForm()">➕ 添加</button>
      </div>
    `;

    if (sorted.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">📅</div><p>还没有重要日子</p></div>`;
    } else {
      html += `<div class="date-list">`;
      sorted.forEach(d => {
        let displayDate, remain;
        if (d.repeat !== 'none') {
          const next = Utils.getNextOccurrence(d.date, d.repeat);
          displayDate = Utils.formatDateCN(next);
          remain = Utils.daysUntilNext(d.date, d.repeat);
        } else {
          displayDate = Utils.formatDateCN(d.date);
          remain = Utils.daysUntil(d.date);
        }

        html += `
          <div class="date-card">
            <div class="date-card-icon">${typeIcons[d.type] || '📌'}</div>
            <div class="date-card-info">
              <div class="date-card-title">${Utils.escapeHtml(d.title)}</div>
              <div class="date-card-date">${displayDate}${d.repeat === 'yearly' ? ' · 每年' : d.repeat === 'monthly' ? ' · 每月' : ''}</div>
              ${d.description ? `<div style="font-size:0.8rem;color:var(--text-muted)">${Utils.escapeHtml(d.description)}</div>` : ''}
            </div>
            <div class="date-card-countdown">${remain < 0 ? '已过' : remain === 0 ? '🎉 今天！' : `${remain} 天`}</div>
            <button class="btn-icon" onclick="DatesPage.deleteDate('${d.id}')" title="删除">🗑️</button>
          </div>
        `;
      });
      html += `</div>`;
    }

    return html;
  },

  showAddDateForm() {
    const html = `
      <h3>➕ 添加重要日子</h3>
      <form class="memory-form" onsubmit="return false">
        <div>
          <label>类型</label>
          <select id="date-type">
            <option value="anniversary">💝 纪念日</option>
            <option value="birthday">🎂 生日</option>
            <option value="custom">📌 自定义</option>
          </select>
        </div>
        <div>
          <label>标题 *</label>
          <input type="text" id="date-title" placeholder="例如：恋爱纪念日" required maxlength="50">
        </div>
        <div>
          <label>日期 *</label>
          <input type="date" id="date-date" value="${Utils.formatDate(new Date())}" required>
        </div>
        <div>
          <label>重复</label>
          <select id="date-repeat">
            <option value="yearly" selected>每年重复</option>
            <option value="monthly">每月重复</option>
            <option value="none">不重复</option>
          </select>
        </div>
        <div>
          <label>描述</label>
          <input type="text" id="date-desc" placeholder="简单描述一下" maxlength="200">
        </div>
        <button class="btn btn-primary" onclick="DatesPage.saveDate()">💾 保存</button>
      </form>
    `;
    Utils.showModal(html);
  },

  saveDate() {
    const type = document.getElementById('date-type').value;
    const title = document.getElementById('date-title').value.trim();
    const date = document.getElementById('date-date').value;
    const repeat = document.getElementById('date-repeat').value;
    const desc = document.getElementById('date-desc').value.trim();

    if (!title || !date) { Utils.showToast('请填写标题和日期'); return; }

    const dates = DB.getImportantDates();
    dates.push({
      id: Utils.uid(),
      type,
      title,
      date,
      repeat,
      description: desc,
      remindBeforeDays: 0,
    });

    DB.saveImportantDates(dates);
    Utils.closeModal();
    Utils.showToast('✅ 已添加');
    DatesPage.render();
  },

  deleteDate(id) {
    Utils.confirm('确定要删除这个日子吗？').then(confirmed => {
      if (confirmed) {
        const dates = DB.getImportantDates().filter(d => d.id !== id);
        DB.saveImportantDates(dates);
        Utils.showToast('🗑️ 已删除');
        DatesPage.render();
      }
    });
  },

  // === 经期记录面板 ===
  renderPeriodPanel(periodRecords) {
    const prediction = Utils.predictPeriod(periodRecords);

    let html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3 style="font-size:1.05rem">🔴 姨妈记录</h3>
        <button class="btn btn-sm btn-primary" onclick="DatesPage.showAddPeriodForm()">➕ 记录经期</button>
      </div>
    `;

    // 预测统计
    if (prediction) {
      html += `
        <div class="period-stats">
          <div class="period-stat">
            <div class="period-stat-value">${prediction.avgCycle}</div>
            <div class="period-stat-label">平均周期（天）</div>
          </div>
          <div class="period-stat">
            <div class="period-stat-value">${prediction.avgPeriodLength}</div>
            <div class="period-stat-label">平均经期（天）</div>
          </div>
          <div class="period-stat">
            <div class="period-stat-value" style="color:${prediction.daysUntilNext <= 3 ? '#ff9800' : 'var(--primary)'}">
              ${prediction.daysUntilNext < 0 ? '已到' : prediction.daysUntilNext}
            </div>
            <div class="period-stat-label">距离下次经期（天）</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:12px;background:var(--primary-bg)">
          <p style="font-size:0.9rem;margin-bottom:4px"><strong>📅 预测下次经期：</strong>${Utils.formatDateCN(prediction.nextStart)} ~ ${Utils.formatDateCN(prediction.nextEnd)}</p>
          <p style="font-size:0.9rem;margin-bottom:4px"><strong>🥚 预计排卵期：</strong>${Utils.formatDateCN(prediction.ovulationStart)} ~ ${Utils.formatDateCN(prediction.ovulationEnd)}</p>
          <p style="font-size:0.8rem;color:var(--text-muted)">* 排卵期通常在下次经期前14天左右，仅供参考</p>
        </div>
      `;
    } else if (periodRecords.length > 0) {
      html += `
        <div class="card" style="margin-bottom:12px;background:#fff3e0">
          <p style="font-size:0.9rem">📝 至少需要 <strong>2次</strong> 经期记录才能智能预测哦</p>
        </div>
      `;
    }

    // 历史记录
    const sorted = [...periodRecords].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    if (sorted.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">📋</div><p>还没有经期记录</p></div>`;
    } else {
      html += `<div class="date-list" style="max-height:400px;overflow-y:auto">`;
      sorted.forEach(r => {
        const duration = r.endDate ? Utils.daysBetween(r.startDate, r.endDate) + 1 : '?';
        html += `
          <div class="date-card">
            <div class="date-card-icon">🔴</div>
            <div class="date-card-info">
              <div class="date-card-title">${Utils.formatDateCN(r.startDate)} ~ ${r.endDate ? Utils.formatDateCN(r.endDate) : '进行中'}</div>
              <div class="date-card-date">持续 ${duration} 天${r.notes ? ' · ' + Utils.escapeHtml(r.notes) : ''}</div>
            </div>
            <button class="btn-icon" onclick="DatesPage.deletePeriod('${r.id}')" title="删除">🗑️</button>
          </div>
        `;
      });
      html += `</div>`;
    }

    return html;
  },

  showAddPeriodForm() {
    const html = `
      <h3>🔴 记录经期</h3>
      <form class="memory-form" onsubmit="return false">
        <div>
          <label>开始日期 *</label>
          <input type="date" id="period-start" value="${Utils.formatDate(new Date())}" required>
        </div>
        <div>
          <label>结束日期</label>
          <input type="date" id="period-end" value="${Utils.formatDate(new Date())}">
        </div>
        <div>
          <label>备注</label>
          <input type="text" id="period-notes" placeholder="例如：腹痛、情绪等" maxlength="200">
        </div>
        <button class="btn btn-primary" onclick="DatesPage.savePeriod()">💾 保存</button>
      </form>
    `;
    Utils.showModal(html);
  },

  savePeriod() {
    const startDate = document.getElementById('period-start').value;
    const endDate = document.getElementById('period-end').value;
    const notes = document.getElementById('period-notes').value.trim();

    if (!startDate) { Utils.showToast('请选择开始日期'); return; }

    const records = DB.getPeriodRecords();
    records.push({
      id: Utils.uid(),
      startDate,
      endDate: endDate || '',
      notes,
    });

    DB.savePeriodRecords(records);
    Utils.closeModal();
    Utils.showToast('✅ 经期记录已保存');
    DatesPage.render();
  },

  deletePeriod(id) {
    Utils.confirm('确定要删除这条经期记录吗？').then(confirmed => {
      if (confirmed) {
        const records = DB.getPeriodRecords().filter(r => r.id !== id);
        DB.savePeriodRecords(records);
        Utils.showToast('🗑️ 已删除');
        DatesPage.render();
      }
    });
  },
};
