/* ============================================================
   notes.js - 情书留言板
   ============================================================ */

window.NotesPage = {
  render() {
    const notes = DB.getNotes();
    const settings = DB.getSettings();
    const container = document.querySelector('.notes-content');

    // 解密私密消息（需要密码验证）
    const showPrivate = NotesPage._showPrivate || false;

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <h2 style="color:var(--primary)">💌 情书留言</h2>
        <div style="display:flex;gap:8px">
          ${!showPrivate ? `<button class="btn btn-sm btn-secondary" onclick="NotesPage.unlockPrivate()">🔓 查看私密留言</button>` : ''}
          <button class="btn btn-primary" onclick="NotesPage.showAddForm()">✍️ 写留言</button>
        </div>
      </div>

      <div id="notes-list" class="notes-list">
        ${NotesPage.renderList(notes, showPrivate)}
      </div>
    `;
  },

  renderList(notes, showPrivate) {
    const filtered = showPrivate ? notes : notes.filter(n => !n.isPrivate);

    if (filtered.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">💌</div>
          <p>还没有留言，写下你们的第一封情书吧</p>
        </div>
      `;
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    return sorted.map(n => `
      <div class="note-card ${n.isPrivate ? 'private' : ''}">
        <div class="note-header">
          <span class="note-author">
            ${n.author === 'partner1' ? '💙' : '💗'} ${Utils.escapeHtml(n.author === 'partner1' ? (DB.getSettings().partner1Name || '我') : (DB.getSettings().partner2Name || '你'))}
            ${n.isPrivate ? '<span class="note-private-badge">🔒 私密</span>' : ''}
          </span>
          <span class="note-date">${Utils.formatDateCN(n.date)}</span>
        </div>
        <div class="note-content">${Utils.escapeHtml(n.content)}</div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-sm btn-danger" onclick="NotesPage.deleteNote('${n.id}')">🗑️ 删除</button>
        </div>
      </div>
    `).join('');
  },

  async unlockPrivate() {
    const html = `
      <h3>🔓 查看私密留言</h3>
      <p style="margin-bottom:16px;color:var(--text-secondary)">需要验证密码才能查看私密留言</p>
      <div style="display:flex;gap:10px">
        <input type="password" id="private-pass" placeholder="输入网站密码" style="flex:1">
        <button class="btn btn-primary" id="verify-private-btn">🔓 验证</button>
      </div>
      <p id="private-error" class="lock-error hidden"></p>
    `;
    Utils.showModal(html);

    document.getElementById('verify-private-btn').onclick = async () => {
      const pass = document.getElementById('private-pass').value.trim();
      const savedHash = await DB.getPasswordHash();
      const inputHash = await Utils.sha256(pass);
      if (inputHash === savedHash) {
        NotesPage._showPrivate = true;
        Utils.closeModal();
        NotesPage.render();
      } else {
        const err = document.getElementById('private-error');
        err.textContent = '密码错误';
        err.classList.remove('hidden');
      }
    };
  },

  showAddForm() {
    const html = `
      <h3>✍️ 写留言</h3>
      <form class="memory-form" onsubmit="return false">
        <div>
          <label>我是</label>
          <select id="note-author">
            <option value="partner1">💙 ${DB.getSettings().partner1Name || '我'}</option>
            <option value="partner2">💗 ${DB.getSettings().partner2Name || '你'}</option>
          </select>
        </div>
        <div>
          <label>日期</label>
          <input type="date" id="note-date" value="${Utils.formatDate(new Date())}">
        </div>
        <div>
          <label>内容 *</label>
          <textarea id="note-content" placeholder="写下你想对ta说的话..." required maxlength="5000" style="min-height:120px"></textarea>
        </div>
        <div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="note-private" style="width:auto">
            🔒 设为私密（需要密码才能查看）
          </label>
        </div>
        <button class="btn btn-primary" onclick="NotesPage.saveNote()">💾 保存留言</button>
      </form>
    `;
    Utils.showModal(html);
  },

  saveNote() {
    const author = document.getElementById('note-author').value;
    const date = document.getElementById('note-date').value;
    const content = document.getElementById('note-content').value.trim();
    const isPrivate = document.getElementById('note-private').checked;

    if (!content) { Utils.showToast('请输入内容'); return; }

    const notes = DB.getNotes();
    notes.push({
      id: Utils.uid(),
      author,
      content,
      date: date || Utils.formatDate(new Date()),
      isPrivate,
    });

    DB.saveNotes(notes);
    Utils.closeModal();
    Utils.showToast('💌 留言已保存');
    NotesPage.render();
  },

  deleteNote(id) {
    Utils.confirm('确定要删除这条留言吗？').then(confirmed => {
      if (confirmed) {
        const notes = DB.getNotes().filter(n => n.id !== id);
        DB.saveNotes(notes);
        Utils.showToast('🗑️ 已删除');
        NotesPage.render();
      }
    });
  },
};
