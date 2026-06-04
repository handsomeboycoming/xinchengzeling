/* ============================================================
   plans.js - 人生规划：目标管理、进度追踪
   ============================================================ */

window.PlansPage = {
  currentFilter: 'all',

  render() {
    const plans = DB.getPlans();
    const container = document.querySelector('.plans-content');

    const categoryLabels = {
      career: '💼 事业', travel: '✈️ 旅行', family: '👨‍👩‍👧 家庭',
      finance: '💰 财务', study: '📚 学习', health: '🏃 健康', other: '📦 其他',
    };

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <h2 style="color:var(--primary)">🎯 人生规划</h2>
        <button class="btn btn-primary" onclick="PlansPage.showAddForm()">✨ 添加规划</button>
      </div>

      <div class="plans-toolbar">
        <select id="plans-filter" onchange="PlansPage.currentFilter=this.value;PlansPage.render()">
          <option value="all" ${PlansPage.currentFilter === 'all' ? 'selected' : ''}>📋 全部分类</option>
          ${Object.entries(categoryLabels).map(([k, v]) =>
            `<option value="${k}" ${PlansPage.currentFilter === k ? 'selected' : ''}>${v}</option>`
          ).join('')}
        </select>
        <select id="plans-status-filter" onchange="PlansPage.render()">
          <option value="all">📊 全部状态</option>
          <option value="planned">📝 计划中</option>
          <option value="in-progress">🚀 进行中</option>
          <option value="completed">✅ 已完成</option>
        </select>
      </div>

      <div id="plans-grid" class="plans-grid">
        ${PlansPage.renderGrid(plans, categoryLabels)}
      </div>
    `;
  },

  renderGrid(plans, categoryLabels) {
    const statusFilter = document.getElementById('plans-status-filter')?.value || 'all';

    let filtered = plans;
    if (PlansPage.currentFilter !== 'all') {
      filtered = filtered.filter(p => p.category === PlansPage.currentFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (filtered.length === 0) {
      return `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🎯</div>
          <p>还没有人生规划，点击右上角添加吧</p>
          <p style="font-size:0.85rem">一起规划你们的未来 ✨</p>
        </div>
      `;
    }

    const statusLabels = { 'planned': '📝 计划中', 'in-progress': '🚀 进行中', 'completed': '✅ 已完成' };

    return filtered.map(p => `
      <div class="plan-card">
        <span class="plan-category ${p.category}">${categoryLabels[p.category] || p.category}</span>
        <div class="plan-title">${Utils.escapeHtml(p.title)}</div>
        ${p.description ? `<div class="plan-desc">${Utils.escapeHtml(p.description)}</div>` : ''}

        <div class="plan-progress-bar">
          <div class="plan-progress-fill" style="width:${p.progress || 0}%"></div>
        </div>
        <div class="plan-progress-text">进度 ${p.progress || 0}%</div>

        ${p.subTasks && p.subTasks.length > 0 ? `
          <div class="plan-subtasks">
            ${p.subTasks.map((st, i) => `
              <div class="plan-subtask ${st.done ? 'done' : ''}">
                <input type="checkbox" ${st.done ? 'checked' : ''}
                       onchange="PlansPage.toggleSubTask('${p.id}', ${i})">
                <span>${Utils.escapeHtml(st.title)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="plan-meta">
          <span class="plan-status ${p.status}">${statusLabels[p.status] || p.status}</span>
          ${p.targetDate ? `<span class="plan-target">🎯 ${Utils.formatDateCN(p.targetDate)}</span>` : ''}
        </div>

        <div style="margin-top:14px;display:flex;gap:8px">
          <button class="btn btn-sm btn-secondary" onclick="PlansPage.showEditForm('${p.id}')">✏️</button>
          <button class="btn btn-sm btn-secondary" onclick="PlansPage.updateProgress('${p.id}')">📊 更新进度</button>
          <button class="btn btn-sm btn-danger" onclick="PlansPage.deletePlan('${p.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  showAddForm() {
    const html = `
      <h3>✨ 添加人生规划</h3>
      <form class="memory-form" onsubmit="return false">
        <div>
          <label>分类</label>
          <select id="plan-category">
            <option value="career">💼 事业</option>
            <option value="travel">✈️ 旅行</option>
            <option value="family">👨‍👩‍👧 家庭</option>
            <option value="finance">💰 财务</option>
            <option value="study">📚 学习</option>
            <option value="health">🏃 健康</option>
            <option value="other">📦 其他</option>
          </select>
        </div>
        <div>
          <label>标题 *</label>
          <input type="text" id="plan-title" placeholder="例如：一起去日本旅行" required maxlength="100">
        </div>
        <div>
          <label>描述</label>
          <textarea id="plan-desc" placeholder="详细描述你们的目标..." maxlength="2000"></textarea>
        </div>
        <div>
          <label>目标日期</label>
          <input type="date" id="plan-target-date">
        </div>
        <div>
          <label>状态</label>
          <select id="plan-status">
            <option value="planned">📝 计划中</option>
            <option value="in-progress" selected>🚀 进行中</option>
            <option value="completed">✅ 已完成</option>
          </select>
        </div>
        <div>
          <label>子任务（每行一个）</label>
          <textarea id="plan-subtasks" placeholder="查攻略&#10;办签证&#10;订机票" rows="4"></textarea>
        </div>
        <button class="btn btn-primary" onclick="PlansPage.saveAdd()">💾 保存</button>
      </form>
    `;
    Utils.showModal(html);
  },

  async showEditForm(id) {
    const plans = DB.getPlans();
    const plan = plans.find(p => p.id === id);
    if (!plan) return;

    const html = `
      <h3>✏️ 编辑规划</h3>
      <form class="memory-form" onsubmit="return false">
        <div>
          <label>分类</label>
          <select id="plan-category">
            ${['career','travel','family','finance','study','health','other'].map(c =>
              `<option value="${c}" ${plan.category === c ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label>标题 *</label>
          <input type="text" id="plan-title" value="${Utils.escapeHtml(plan.title)}" required maxlength="100">
        </div>
        <div>
          <label>描述</label>
          <textarea id="plan-desc" maxlength="2000">${Utils.escapeHtml(plan.description || '')}</textarea>
        </div>
        <div>
          <label>目标日期</label>
          <input type="date" id="plan-target-date" value="${plan.targetDate || ''}">
        </div>
        <div>
          <label>状态</label>
          <select id="plan-status">
            <option value="planned" ${plan.status === 'planned' ? 'selected' : ''}>📝 计划中</option>
            <option value="in-progress" ${plan.status === 'in-progress' ? 'selected' : ''}>🚀 进行中</option>
            <option value="completed" ${plan.status === 'completed' ? 'selected' : ''}>✅ 已完成</option>
          </select>
        </div>
        <div>
          <label>进度 (%)</label>
          <input type="number" id="plan-progress" value="${plan.progress || 0}" min="0" max="100">
        </div>
        <div>
          <label>子任务（每行一个，勾选表示完成）</label>
          <textarea id="plan-subtasks" rows="4">${(plan.subTasks || []).map(st => `${st.done ? '[✓] ' : '[ ] '}${st.title}`).join('\n')}</textarea>
        </div>
        <button class="btn btn-primary" onclick="PlansPage.saveEdit('${id}')">💾 更新</button>
      </form>
    `;
    Utils.showModal(html);
  },

  saveAdd() {
    const category = document.getElementById('plan-category').value;
    const title = document.getElementById('plan-title').value.trim();
    const desc = document.getElementById('plan-desc').value.trim();
    const targetDate = document.getElementById('plan-target-date').value;
    const status = document.getElementById('plan-status').value;
    const subtasksRaw = document.getElementById('plan-subtasks').value.trim();

    if (!title) { Utils.showToast('请填写标题'); return; }

    const subTasks = subtasksRaw ? subtasksRaw.split('\n').filter(Boolean).map(line => {
      const done = line.startsWith('[✓]');
      const cleanTitle = line.replace(/^\[[✓ ]\]\s*/, '');
      return { title: cleanTitle, done };
    }) : [];

    const plans = DB.getPlans();
    plans.push({
      id: Utils.uid(),
      category,
      title,
      description: desc,
      targetDate,
      status,
      progress: status === 'completed' ? 100 : (subTasks.length > 0 ? Math.round(subTasks.filter(s => s.done).length / subTasks.length * 100) : 0),
      subTasks,
    });

    DB.savePlans(plans);
    Utils.closeModal();
    Utils.showToast('✅ 规划已保存');
    PlansPage.render();
  },

  saveEdit(id) {
    const plans = DB.getPlans();
    const idx = plans.findIndex(p => p.id === id);
    if (idx === -1) return;

    const subtasksRaw = document.getElementById('plan-subtasks').value.trim();
    const subTasks = subtasksRaw ? subtasksRaw.split('\n').filter(Boolean).map(line => {
      const done = line.startsWith('[✓]');
      const cleanTitle = line.replace(/^\[[✓ ]\]\s*/, '');
      return { title: cleanTitle, done };
    }) : [];

    const status = document.getElementById('plan-status').value;
    const progressFromInput = parseInt(document.getElementById('plan-progress')?.value) || 0;

    let progress;
    if (document.getElementById('plan-progress')) {
      progress = progressFromInput;
    } else {
      progress = status === 'completed' ? 100 : (subTasks.length > 0 ? Math.round(subTasks.filter(s => s.done).length / subTasks.length * 100) : 0);
    }

    plans[idx] = {
      ...plans[idx],
      category: document.getElementById('plan-category').value,
      title: document.getElementById('plan-title').value.trim(),
      description: document.getElementById('plan-desc').value.trim(),
      targetDate: document.getElementById('plan-target-date').value,
      status,
      progress,
      subTasks,
    };

    DB.savePlans(plans);
    Utils.closeModal();
    Utils.showToast('✅ 规划已更新');
    PlansPage.render();
  },

  toggleSubTask(planId, subIdx) {
    const plans = DB.getPlans();
    const plan = plans.find(p => p.id === planId);
    if (!plan || !plan.subTasks) return;
    plan.subTasks[subIdx].done = !plan.subTasks[subIdx].done;
    plan.progress = Math.round(plan.subTasks.filter(s => s.done).length / plan.subTasks.length * 100);
    if (plan.progress === 100 && plan.status !== 'completed') {
      plan.status = 'completed';
    }
    DB.savePlans(plans);
    PlansPage.render();
  },

  updateProgress(id) {
    const plans = DB.getPlans();
    const plan = plans.find(p => p.id === id);
    if (!plan) return;

    const html = `
      <h3>📊 更新进度 - ${Utils.escapeHtml(plan.title)}</h3>
      <form class="memory-form" onsubmit="return false">
        <div>
          <label>进度 (0-100%)</label>
          <input type="range" id="progress-slider" value="${plan.progress || 0}" min="0" max="100"
                 style="width:100%" oninput="document.getElementById('progress-val').textContent=this.value+'%'">
          <div style="text-align:center;font-size:1.5rem;font-weight:700;color:var(--primary)" id="progress-val">${plan.progress || 0}%</div>
        </div>
        <button class="btn btn-primary" onclick="
          const val = parseInt(document.getElementById('progress-slider').value);
          const plans = DB.getPlans();
          const p = plans.find(p => p.id === '${id}');
          if (p) {
            p.progress = val;
            if (val === 100) p.status = 'completed';
            else if (val > 0 && p.status === 'planned') p.status = 'in-progress';
            DB.savePlans(plans);
          }
          Utils.closeModal();
          Utils.showToast('✅ 进度已更新');
          PlansPage.render();
        ">💾 保存</button>
      </form>
    `;
    Utils.showModal(html);
  },

  deletePlan(id) {
    Utils.confirm('确定要删除这个规划吗？').then(confirmed => {
      if (confirmed) {
        const plans = DB.getPlans().filter(p => p.id !== id);
        DB.savePlans(plans);
        Utils.showToast('🗑️ 已删除');
        PlansPage.render();
      }
    });
  },
};
