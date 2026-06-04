/* ============================================================
   memories.js - 回忆录：照片上传到 Supabase Storage
   ============================================================ */

window.MemoriesPage = {
  currentFilter: 'all',
  _searchDebounce: null,

  async render() {
    const memories = await DB.getMemories();
    const container = document.querySelector('.memories-content');
    const years = [...new Set(memories.map(m => new Date(m.date).getFullYear()))].sort((a, b) => b - a);

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <h2 style="color:var(--primary)">📸 回忆录</h2>
        <button class="btn btn-primary" onclick="MemoriesPage.showAddForm()">✨ 添加回忆</button>
      </div>
      <div class="memories-toolbar">
        <select id="memories-year-filter" onchange="MemoriesPage.filterByYear(this.value)">
          <option value="all">📆 所有年份</option>
          ${years.map(y => `<option value="${y}" ${MemoriesPage.currentFilter === String(y) ? 'selected' : ''}>${y}年</option>`).join('')}
        </select>
        <input type="text" id="memories-search" placeholder="🔍 搜索回忆..." oninput="MemoriesPage._handleSearch()">
      </div>
      <div id="memories-grid" class="memories-grid">
        ${MemoriesPage.renderGrid(memories)}
      </div>
    `;
    container._memories = memories;
  },

  renderGrid(memories) {
    if (!memories || memories.length === 0) {
      return `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📸</div><p>还没有回忆，点击右上角添加第一个吧 💕</p></div>`;
    }
    return memories.map(m => `
      <div class="memory-card" onclick="MemoriesPage.viewMemory('${m.id}')">
        ${m.photos && m.photos[0]
          ? `<img class="memory-card-img" src="${m.photos[0]}" alt="${Utils.escapeHtml(m.title)}" loading="lazy">`
          : `<div class="memory-card-img" style="display:flex;align-items:center;justify-content:center;font-size:3rem">📷</div>`
        }
        <div class="memory-card-body">
          <div class="memory-card-date">${Utils.formatDateCN(m.date)}</div>
          <div class="memory-card-title">${Utils.escapeHtml(m.title)}</div>
          ${m.description ? `<div class="memory-card-desc">${Utils.escapeHtml(m.description)}</div>` : ''}
          ${m.tags && m.tags.length > 0 ? `<div class="memory-card-tags">${m.tags.map(t => `<span class="tag">${Utils.escapeHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="memory-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-secondary" onclick="MemoriesPage.showEditForm('${m.id}')">✏️ 编辑</button>
          <button class="btn btn-sm btn-danger" onclick="MemoriesPage.deleteMemory('${m.id}')">🗑️ 删除</button>
        </div>
      </div>
    `).join('');
  },

  async filterByYear(year) {
    MemoriesPage.currentFilter = year;
    const allMemories = await DB.getMemories();
    const filtered = year === 'all' ? allMemories : allMemories.filter(m => new Date(m.date).getFullYear() === parseInt(year));
    document.getElementById('memories-grid').innerHTML = MemoriesPage.renderGrid(filtered);
  },

  _handleSearch() {
    if (!MemoriesPage._searchDebounce) {
      MemoriesPage._searchDebounce = Utils.debounce(() => MemoriesPage.search(), 300);
    }
    MemoriesPage._searchDebounce();
  },

  search() {
    const query = document.getElementById('memories-search')?.value?.toLowerCase() || '';
    const container = document.querySelector('.memories-content');
    const allMemories = container._memories || [];
    const filtered = query
      ? allMemories.filter(m =>
          m.title.toLowerCase().includes(query) ||
          (m.description || '').toLowerCase().includes(query) ||
          (m.tags || []).some(t => t.toLowerCase().includes(query))
        )
      : allMemories;
    document.getElementById('memories-grid').innerHTML = MemoriesPage.renderGrid(filtered);
  },

  async viewMemory(id) {
    const m = await DB.getMemory(id);
    if (!m) return;
    const photosJson = JSON.stringify(m.photos || []);
    const html = `
      <div>
        <h3 style="margin-bottom:4px">${Utils.escapeHtml(m.title)}</h3>
        <p style="color:var(--text-muted);margin-bottom:16px">${Utils.formatDateCN(m.date)}</p>
        ${m.photos && m.photos.length > 0 ? `
          <div class="modal-photo-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:16px"
               data-photos='${photosJson.replace(/'/g, '&#39;')}'>
            ${m.photos.map((p, i) => `
              <img src="${p}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer"
                   data-idx="${i}" class="modal-photo-thumb" alt="">
            `).join('')}
          </div>` : ''}
        ${m.description ? `<p style="line-height:1.7;white-space:pre-wrap">${Utils.escapeHtml(m.description)}</p>` : ''}
        ${m.tags && m.tags.length > 0 ? `<div class="memory-card-tags" style="margin-top:12px">${m.tags.map(t => `<span class="tag">${Utils.escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <div style="margin-top:20px;display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="MemoriesPage.showEditForm('${m.id}');Utils.closeModal()">✏️ 编辑</button>
          <button class="btn btn-danger btn-sm" onclick="MemoriesPage.deleteMemory('${m.id}');Utils.closeModal()">🗑️ 删除</button>
        </div>
      </div>`;
    Utils.showModal(html);
  },

  showAddForm() {
    const html = `
      <h3>✨ 添加回忆</h3>
      <form class="memory-form" id="memory-form" onsubmit="return false">
        <div>
          <label>📷 照片</label>
          <input type="file" id="mem-photos" accept="image/*" multiple style="border:none;padding:0">
          <div class="photo-preview" id="photo-preview"></div>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">照片将上传到云端，双方都能看到</p>
        </div>
        <div><label>📝 标题 *</label><input type="text" id="mem-title" placeholder="给这段回忆起个名字" required maxlength="100"></div>
        <div><label>📅 日期 *</label><input type="date" id="mem-date" value="${Utils.formatDate(new Date())}" required></div>
        <div><label>💬 描述</label><textarea id="mem-desc" placeholder="写下你们的回忆..." maxlength="2000"></textarea></div>
        <div><label>🏷️ 标签（用逗号分隔）</label><input type="text" id="mem-tags" placeholder="例如：旅行, 约会, 第一次"></div>
        <button class="btn btn-primary" onclick="MemoriesPage.saveAdd()">💾 保存回忆</button>
      </form>`;
    Utils.showModal(html);

    document.getElementById('mem-photos').onchange = function () {
      const preview = document.getElementById('photo-preview');
      Array.from(this.files).forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const div = document.createElement('div');
          div.className = 'photo-preview-item';
          div.innerHTML = `<img src="${e.target.result}" alt=""><button onclick="this.parentElement.remove()">&times;</button>`;
          preview.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    };
  },

  async showEditForm(id) {
    const m = await DB.getMemory(id);
    if (!m) return;
    const html = `
      <h3>✏️ 编辑回忆</h3>
      <form class="memory-form" id="memory-form" onsubmit="return false">
        <div>
          <label>📷 添加更多照片</label>
          <input type="file" id="mem-photos" accept="image/*" multiple style="border:none;padding:0">
          <div class="photo-preview" id="photo-preview">
            ${(m.photos || []).map((p, i) => `
              <div class="photo-preview-item" data-keep="${i}">
                <img src="${p}" alt=""><button onclick="this.parentElement.remove()">&times;</button>
              </div>`).join('')}
          </div>
        </div>
        <div><label>📝 标题 *</label><input type="text" id="mem-title" value="${Utils.escapeHtml(m.title)}" required maxlength="100"></div>
        <div><label>📅 日期 *</label><input type="date" id="mem-date" value="${m.date}" required></div>
        <div><label>💬 描述</label><textarea id="mem-desc" maxlength="2000">${Utils.escapeHtml(m.description || '')}</textarea></div>
        <div><label>🏷️ 标签（用逗号分隔）</label><input type="text" id="mem-tags" value="${Utils.escapeHtml((m.tags || []).join(', '))}"></div>
        <button class="btn btn-primary" onclick="MemoriesPage.saveEdit('${id}')">💾 更新回忆</button>
      </form>`;
    Utils.showModal(html);

    document.getElementById('mem-photos').onchange = function () {
      const preview = document.getElementById('photo-preview');
      Array.from(this.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const div = document.createElement('div');
          div.className = 'photo-preview-item';
          div.innerHTML = `<img src="${e.target.result}" alt=""><button onclick="this.parentElement.remove()">&times;</button>`;
          preview.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    };
  },

  async saveAdd() {
    const title = document.getElementById('mem-title')?.value.trim();
    const date = document.getElementById('mem-date')?.value;
    const desc = document.getElementById('mem-desc')?.value.trim();
    const tagsStr = document.getElementById('mem-tags')?.value.trim();
    const photoInput = document.getElementById('mem-photos');

    if (!title || !date) { Utils.showToast('请填写标题和日期'); return; }

    // 上传照片到 Supabase Storage
    const photos = [];
    if (photoInput && photoInput.files.length > 0) {
      Utils.showToast('⏳ 正在上传照片...');
      for (const file of photoInput.files) {
        try {
          const url = await DB.uploadPhoto(file);
          photos.push(url);
        } catch (e) {
          console.error('上传失败:', e);
          Utils.showToast('⚠️ 部分照片上传失败');
        }
      }
    }

    const tags = tagsStr ? tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
    await DB.saveMemory({
      id: Utils.uid(),
      title, date, description: desc, photos, tags,
      createdAt: new Date().toISOString(),
    });

    Utils.closeModal();
    Utils.showToast('✅ 回忆已保存');
    await MemoriesPage.render();
  },

  async saveEdit(id) {
    const old = await DB.getMemory(id);
    if (!old) return;

    const title = document.getElementById('mem-title')?.value.trim();
    const date = document.getElementById('mem-date')?.value;
    const desc = document.getElementById('mem-desc')?.value.trim();
    const tagsStr = document.getElementById('mem-tags')?.value.trim();
    const photoInput = document.getElementById('mem-photos');

    if (!title || !date) { Utils.showToast('请填写标题和日期'); return; }

    // 保留未被移除的照片 URL
    const keptPhotos = [];
    const previewItems = document.querySelectorAll('#photo-preview .photo-preview-item');
    previewItems.forEach(item => {
      const keepIdx = item.dataset.keep;
      if (keepIdx !== undefined) {
        // 检查是否被移除（img 还在就是保留）
        const img = item.querySelector('img');
        if (img && old.photos[parseInt(keepIdx)]) {
          keptPhotos.push(old.photos[parseInt(keepIdx)]);
        }
      }
    });

    // 上传新照片
    if (photoInput && photoInput.files.length > 0) {
      Utils.showToast('⏳ 正在上传新照片...');
      for (const file of photoInput.files) {
        try {
          const url = await DB.uploadPhoto(file);
          keptPhotos.push(url);
        } catch (e) { console.error('上传失败:', e); }
      }
    }

    const tags = tagsStr ? tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
    await DB.saveMemory({ ...old, title, date, description: desc, photos: keptPhotos, tags });

    Utils.closeModal();
    Utils.showToast('✅ 回忆已更新');
    await MemoriesPage.render();
  },

  async deleteMemory(id) {
    const confirmed = await Utils.confirm('确定要删除这段回忆吗？此操作不可恢复。');
    if (confirmed) {
      await DB.deleteMemory(id);
      Utils.showToast('🗑️ 回忆已删除');
      await MemoriesPage.render();
    }
  },
};
