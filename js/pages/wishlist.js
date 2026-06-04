/* ============================================================
   wishlist.js - 愿望清单：想去的地方、想做的事、想要的礼物
   ============================================================ */

window.WishlistPage = {
  currentFilter: 'all',

  render() {
    const items = DB.getWishlist();
    const container = document.querySelector('.wishlist-content');

    const categoryLabels = {
      travel: '✈️ 想去的地方',
      gift: '🎁 想要的礼物',
      experience: '🎪 想做的事',
      other: '📦 其他',
    };

    const statusLabels = {
      wishlist: '💭 想去/想要',
      planned: '📅 计划中',
      done: '✅ 已完成',
    };

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <h2 style="color:var(--primary)">✨ 愿望清单</h2>
        <button class="btn btn-primary" onclick="WishlistPage.showAddForm()">✨ 添加愿望</button>
      </div>

      <div class="wishlist-toolbar">
        <select id="wishlist-cat-filter" onchange="WishlistPage.currentFilter=this.value;WishlistPage.render()">
          <option value="all">📋 全部分类</option>
          ${Object.entries(categoryLabels).map(([k, v]) =>
            `<option value="${k}" ${WishlistPage.currentFilter === k ? 'selected' : ''}>${v}</option>`
          ).join('')}
        </select>
        <select id="wishlist-status-filter" onchange="WishlistPage.render()">
          <option value="all">📊 全部状态</option>
          <option value="wishlist">💭 想去/想要</option>
          <option value="planned">📅 计划中</option>
          <option value="done">✅ 已完成</option>
        </select>
      </div>

      <div id="wishlist-grid" class="wishlist-grid">
        ${WishlistPage.renderGrid(items, categoryLabels, statusLabels)}
      </div>
    `;
  },

  renderGrid(items, categoryLabels, statusLabels) {
    const statusFilter = document.getElementById('wishlist-status-filter')?.value || 'all';

    let filtered = items;
    if (WishlistPage.currentFilter !== 'all') {
      filtered = filtered.filter(item => item.category === WishlistPage.currentFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (filtered.length === 0) {
      return `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">✨</div>
          <p>还没有愿望，添加你们的第一个愿望吧</p>
          <p style="font-size:0.85rem">想去的地方、想要的礼物、想一起做的事...</p>
        </div>
      `;
    }

    return filtered.map(item => `
      <div class="wish-card">
        ${item.image
          ? `<img class="wish-card-img" src="${item.image}" alt="${Utils.escapeHtml(item.title)}" loading="lazy">`
          : `<div class="wish-card-img" style="display:flex;align-items:center;justify-content:center;font-size:2.5rem">${categoryLabels[item.category]?.split(' ')[0] || '✨'}</div>`
        }
        <div class="wish-card-body">
          <div class="wish-card-title">${Utils.escapeHtml(item.title)}</div>
          ${item.description ? `<div class="wish-card-desc">${Utils.escapeHtml(item.description)}</div>` : ''}
          <span class="wish-card-status ${item.status}">${statusLabels[item.status] || item.status}</span>
          <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            ${item.status !== 'done' ? `<button class="btn btn-sm btn-secondary" onclick="WishlistPage.markDone('${item.id}')">✅ 完成</button>` : ''}
            ${item.status !== 'planned' && item.status !== 'done' ? `<button class="btn btn-sm btn-secondary" onclick="WishlistPage.markPlanned('${item.id}')">📅 计划中</button>` : ''}
            <button class="btn btn-sm btn-danger" onclick="WishlistPage.deleteItem('${item.id}')">🗑️</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  showAddForm() {
    const html = `
      <h3>✨ 添加愿望</h3>
      <form class="memory-form" onsubmit="return false">
        <div>
          <label>分类</label>
          <select id="wish-category">
            <option value="travel">✈️ 想去的地方</option>
            <option value="gift">🎁 想要的礼物</option>
            <option value="experience">🎪 想做的事</option>
            <option value="other">📦 其他</option>
          </select>
        </div>
        <div>
          <label>标题 *</label>
          <input type="text" id="wish-title" placeholder="例如：一起去冰岛看极光" required maxlength="100">
        </div>
        <div>
          <label>描述</label>
          <textarea id="wish-desc" placeholder="描述一下..." maxlength="2000"></textarea>
        </div>
        <div>
          <label>图片（可选）</label>
          <input type="file" id="wish-image" accept="image/*" style="border:none;padding:0">
          <div id="wish-image-preview" style="margin-top:8px"></div>
        </div>
        <button class="btn btn-primary" onclick="WishlistPage.saveAdd()">💾 保存</button>
      </form>
    `;
    Utils.showModal(html);

    document.getElementById('wish-image').onchange = function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById('wish-image-preview').innerHTML = `
          <img src="${e.target.result}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px">
        `;
      };
      reader.readAsDataURL(file);
    };
  },

  saveAdd() {
    const category = document.getElementById('wish-category').value;
    const title = document.getElementById('wish-title').value.trim();
    const desc = document.getElementById('wish-desc').value.trim();
    const imagePreview = document.querySelector('#wish-image-preview img');

    if (!title) { Utils.showToast('请填写标题'); return; }

    const items = DB.getWishlist();
    items.push({
      id: Utils.uid(),
      category,
      title,
      description: desc,
      status: 'wishlist',
      image: imagePreview ? imagePreview.src : '',
    });

    DB.saveWishlist(items);
    Utils.closeModal();
    Utils.showToast('✅ 愿望已保存');
    WishlistPage.render();
  },

  markDone(id) {
    const items = DB.getWishlist();
    const item = items.find(i => i.id === id);
    if (item) {
      item.status = 'done';
      DB.saveWishlist(items);
      Utils.showToast('🎉 真棒！已完成一个愿望');
      WishlistPage.render();
    }
  },

  markPlanned(id) {
    const items = DB.getWishlist();
    const item = items.find(i => i.id === id);
    if (item) {
      item.status = 'planned';
      DB.saveWishlist(items);
      Utils.showToast('📅 已加入计划');
      WishlistPage.render();
    }
  },

  deleteItem(id) {
    Utils.confirm('确定要删除这个愿望吗？').then(confirmed => {
      if (confirmed) {
        const items = DB.getWishlist().filter(i => i.id !== id);
        DB.saveWishlist(items);
        Utils.showToast('🗑️ 已删除');
        WishlistPage.render();
      }
    });
  },
};
