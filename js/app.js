/* ============================================================
   app.js - 主应用：Supabase Auth + 路由 + 全局事件
   欣成则灵 v2.0
   ============================================================ */

(function () {
  // === DOM 引用 ===
  let lockScreen, lockTitle, lockSubtitle, lockEmail, lockPassword, lockSubmit, lockError, lockToggle;
  let appEl, mainNav, menuToggle, modalOverlay, modalClose, lightbox, lightboxClose, lightboxPrev, lightboxNext;
  let currentRoute = 'home';

  // === 启动 ===
  async function boot() {
    // 等待 DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  async function init() {
    cacheDom();
    initGlobalEvents();

    // 检查是否已有登录会话
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // 已登录，直接进入
      unlockApp();
    } else {
      // 未登录，显示登录页
      showLockScreen(false);
    }

    // 监听认证状态变化
    DB.onAuthChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        unlockApp();
      } else if (event === 'SIGNED_OUT') {
        lockApp();
      }
    });
  }

  function cacheDom() {
    lockScreen = document.getElementById('lock-screen');
    lockTitle = document.getElementById('lock-title');
    lockSubtitle = document.getElementById('lock-subtitle');
    lockEmail = document.getElementById('lock-email');
    lockPassword = document.getElementById('lock-password');
    lockSubmit = document.getElementById('lock-submit');
    lockError = document.getElementById('lock-error');
    lockToggle = document.getElementById('lock-toggle');
    appEl = document.getElementById('app');
    mainNav = document.getElementById('main-nav');
    menuToggle = document.getElementById('menu-toggle');
    modalOverlay = document.getElementById('modal-overlay');
    modalClose = document.getElementById('modal-close');
    lightbox = document.getElementById('lightbox');
    lightboxClose = document.querySelector('.lightbox-close');
    lightboxPrev = document.querySelector('.lightbox-prev');
    lightboxNext = document.querySelector('.lightbox-next');
  }

  // === 登录/注册界面 ===
  let isRegisterMode = false;

  function showLockScreen(isSignOut) {
    appEl.classList.add('hidden');
    lockScreen.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    isRegisterMode = false;

    if (isSignOut) {
      lockTitle.textContent = '👋 已退出';
      lockSubtitle.textContent = '输入密码重新登录';
    } else {
      lockTitle.textContent = '💕 欣成则灵';
      lockSubtitle.textContent = '登录你们的秘密基地';
    }

    lockEmail.value = '';
    lockPassword.value = '';
    lockError.classList.add('hidden');

    updateLockUI();
    bindLockEvents();
  }

  function updateLockUI() {
    if (isRegisterMode) {
      lockTitle.textContent = '✨ 创建账号';
      lockSubtitle.textContent = '首次使用？注册一个共用的账号吧';
      lockSubmit.textContent = '📝 注册';
      lockToggle.innerHTML = '已有账号？<a href="#">去登录</a>';
      lockEmail.parentElement.classList.remove('hidden');
    } else {
      lockTitle.textContent = '💕 欣成则灵';
      lockSubtitle.textContent = '登录你们的秘密基地';
      lockSubmit.textContent = '🔓 登录';
      lockToggle.innerHTML = '没有账号？<a href="#">注册新账号</a>';
    }
  }

  function bindLockEvents() {
    lockSubmit.onclick = handleAuth;
    lockPassword.onkeydown = (e) => {
      if (e.key === 'Enter') handleAuth();
    };
    lockEmail.onkeydown = (e) => {
      if (e.key === 'Enter') lockPassword.focus();
    };

    lockToggle.onclick = (e) => {
      e.preventDefault();
      isRegisterMode = !isRegisterMode;
      lockEmail.value = '';
      lockPassword.value = '';
      lockError.classList.add('hidden');
      updateLockUI();
      if (isRegisterMode) lockEmail.focus();
      else lockPassword.focus();
    };
  }

  async function handleAuth() {
    const email = lockEmail.value.trim();
    const password = lockPassword.value.trim();

    if (isRegisterMode && !email) { showLockError('请输入邮箱'); return; }
    if (!password || password.length < 6) { showLockError('密码至少6位'); return; }

    lockSubmit.disabled = true;
    lockSubmit.textContent = '⏳ 请稍候...';

    try {
      if (isRegisterMode) {
        await DB.signUp(email, password);
        showLockError('✅ 注册成功！请登录（可能需要验证邮箱）');
        isRegisterMode = false;
        updateLockUI();
      } else {
        // 登录：用邮箱，如果没有邮箱则用旧版方式（共享账号）
        // 如果用户没填邮箱，尝试用默认共享账号
        const loginEmail = email || 'xcfl@couple.app';
        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) throw error;
        // 登录成功，unlockApp 会由 onAuthChange 触发
      }
    } catch (err) {
      showLockError(err.message || '操作失败，请重试');
    } finally {
      lockSubmit.disabled = false;
      lockSubmit.textContent = isRegisterMode ? '📝 注册' : '🔓 登录';
    }
  }

  function showLockError(msg) {
    lockError.textContent = msg;
    lockError.classList.remove('hidden');
    lockPassword.value = '';
    lockPassword.focus();
  }

  function unlockApp() {
    lockScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    document.body.style.overflow = '';
    initApp();
  }

  function lockApp() {
    appEl.classList.add('hidden');
    showLockScreen(true);
  }

  // === 应用初始化 ===
  async function initApp() {
    applyTheme();
    initRouter();
    initSync();

    // 默认加载首页
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = '#home';
    } else {
      handleRoute();
    }
  }

  // === 主题 ===
  async function applyTheme() {
    const settings = await DB.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
  }

  async function toggleTheme() {
    const settings = await DB.getSettings();
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    await DB.saveSettings(settings);
    applyTheme();
  }

  // === 实时同步 ===
  function initSync() {
    Sync.initAll((table) => {
      Sync.autoRefresh(table);
      // 如果是首页且 profile 更新，刷新首页
      if (table === 'profiles') {
        const hash = window.location.hash.replace('#', '') || 'home';
        if (hash === 'home') HomePage.render();
      }
    });
  }

  // === 路由 ===
  function initRouter() {
    window.addEventListener('hashchange', handleRoute);

    mainNav.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        mainNav.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        mainNav.classList.remove('open');
      });
    });
  }

  function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'home';
    if (hash === currentRoute) return;
    currentRoute = hash;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${hash}`);
    if (targetPage) targetPage.classList.add('active');

    mainNav.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === hash);
    });

    loadPage(hash);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function loadPage(route) {
    switch (route) {
      case 'home': HomePage.render(); break;
      case 'memories': MemoriesPage.render(); break;
      case 'dates': DatesPage.render(); break;
      case 'plans': PlansPage.render(); break;
      case 'notes': NotesPage.render(); break;
      case 'wishlist': WishlistPage.render(); break;
      case 'settings': SettingsPage.render(); break;
    }
  }

  // === 全局事件 ===
  function initGlobalEvents() {
    // 移动端菜单
    menuToggle.addEventListener('click', () => mainNav.classList.toggle('open'));

    // 弹窗关闭
    modalClose.addEventListener('click', Utils.closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) Utils.closeModal();
      if (e.target.classList.contains('modal-photo-thumb')) {
        const grid = e.target.closest('.modal-photo-grid');
        if (grid && grid.dataset.photos) {
          const photos = JSON.parse(grid.dataset.photos.replace(/&#39;/g, "'"));
          const idx = parseInt(e.target.dataset.idx) || 0;
          Utils.openLightbox(photos, idx);
        }
      }
    });

    // 灯箱
    lightboxClose.addEventListener('click', Utils.closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) Utils.closeLightbox();
    });
    lightboxPrev.addEventListener('click', () => {
      if (!lightbox._images) return;
      lightbox._index = (lightbox._index - 1 + lightbox._images.length) % lightbox._images.length;
      document.getElementById('lightbox-img').src = lightbox._images[lightbox._index];
    });
    lightboxNext.addEventListener('click', () => {
      if (!lightbox._images) return;
      lightbox._index = (lightbox._index + 1) % lightbox._images.length;
      document.getElementById('lightbox-img').src = lightbox._images[lightbox._index];
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('hidden')) {
        if (e.key === 'Escape') Utils.closeLightbox();
        if (e.key === 'ArrowLeft') lightboxPrev.click();
        if (e.key === 'ArrowRight') lightboxNext.click();
      }
      if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
        Utils.closeModal();
      }
    });
  }

  // === 设置页面 ===
  window.SettingsPage = {
    async render() {
      const settings = await DB.getSettings();
      const container = document.querySelector('.settings-content');
      container.innerHTML = `
        <h2 style="margin-bottom:20px;color:var(--primary)">⚙️ 设置</h2>

        <div class="settings-section card">
          <h3>💑 基本信息</h3>
          <div class="settings-form">
            <div>
              <label>在一起的日期（第一天）</label>
              <input type="date" id="set-together-date" value="${settings.togetherDate || ''}">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <label>你的昵称</label>
                <input type="text" id="set-name1" value="${Utils.escapeHtml(settings.partner1Name || '我')}">
              </div>
              <div>
                <label>对方的昵称</label>
                <input type="text" id="set-name2" value="${Utils.escapeHtml(settings.partner2Name || '你')}">
              </div>
            </div>
            <button class="btn btn-primary" id="save-basic-settings">💾 保存</button>
          </div>
        </div>

        <div class="settings-section card">
          <h3>🔒 修改密码</h3>
          <div class="settings-form">
            <div>
              <label>新密码</label>
              <input type="password" id="set-new-password" placeholder="输入新密码（至少6位）">
            </div>
            <button class="btn btn-primary" id="change-password-btn">🔑 修改密码</button>
          </div>
        </div>

        <div class="settings-section card">
          <h3>🎨 主题</h3>
          <div class="settings-row">
            <button class="btn btn-secondary" id="toggle-theme-btn">
              ${settings.theme === 'dark' ? '☀️ 切换到浅色模式' : '🌙 切换到深色模式'}
            </button>
          </div>
        </div>

        <div class="settings-section card">
          <h3>📦 数据管理</h3>
          <div class="settings-row" style="gap:12px">
            <button class="btn btn-primary" id="export-data-btn">📤 导出数据备份</button>
            <button class="btn btn-secondary" id="import-data-btn">📥 导入数据备份</button>
            <button class="btn btn-secondary" id="migrate-old-btn">🔄 从旧版迁移</button>
          </div>
          <input type="file" id="import-file-input" accept=".json" class="hidden">
          <input type="file" id="migrate-file-input" accept=".json" class="hidden">
          <p style="margin-top:8px;font-size:0.8rem;color:var(--text-muted)">
            建议定期导出备份。旧版用户可导出JSON后在此导入迁移。
          </p>
        </div>

        <div class="settings-section card">
          <h3>🚪 退出登录</h3>
          <button class="btn btn-danger" id="signout-btn">🚪 退出登录</button>
        </div>
      `;

      // 保存设置
      document.getElementById('save-basic-settings').onclick = async () => {
        settings.togetherDate = document.getElementById('set-together-date').value;
        settings.partner1Name = document.getElementById('set-name1').value.trim() || '我';
        settings.partner2Name = document.getElementById('set-name2').value.trim() || '你';
        await DB.saveSettings(settings);
        Utils.showToast('✅ 设置已保存');
        if (currentRoute === 'home') HomePage.render();
      };

      // 修改密码
      document.getElementById('change-password-btn').onclick = async () => {
        const newPass = document.getElementById('set-new-password').value.trim();
        if (newPass.length < 6) { Utils.showToast('新密码至少6位'); return; }
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) { Utils.showToast('❌ ' + error.message); return; }
        Utils.showToast('✅ 密码修改成功');
        document.getElementById('set-new-password').value = '';
      };

      // 主题切换
      document.getElementById('toggle-theme-btn').onclick = async () => {
        await toggleTheme();
        SettingsPage.render();
      };

      // 导出
      document.getElementById('export-data-btn').onclick = async () => {
        const data = await DB.exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xinchengzeling-backup-${Utils.formatDate(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Utils.showToast('✅ 数据已导出');
      };

      // 导入
      document.getElementById('import-data-btn').onclick = () => document.getElementById('import-file-input').click();
      document.getElementById('import-file-input').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const confirmed = await Utils.confirm('导入将覆盖当前所有数据，确定继续？');
          if (confirmed) {
            await DB.importAllData(data);
            Utils.showToast('✅ 数据导入成功！');
            Sync.refreshCurrentPage();
          }
        } catch (err) { Utils.showToast('❌ 导入失败：' + err.message); }
        e.target.value = '';
      };

      // 从旧版迁移
      document.getElementById('migrate-old-btn').onclick = () => document.getElementById('migrate-file-input').click();
      document.getElementById('migrate-file-input').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data.version || data.version > 2) {
            Utils.showToast('⚠️ 不支持的备份文件格式');
            return;
          }
          Utils.showToast('⏳ 正在迁移数据，请稍候...');
          await Utils.importFromOldFormat(data, (done, total) => {
            // 进度可以在控制台查看
          });
          Utils.showToast('✅ 迁移完成！');
          Sync.refreshCurrentPage();
        } catch (err) { Utils.showToast('❌ 迁移失败：' + err.message); }
        e.target.value = '';
      };

      // 退出
      document.getElementById('signout-btn').onclick = async () => {
        const confirmed = await Utils.confirm('确定要退出登录吗？');
        if (confirmed) {
          Sync.cleanup();
          await DB.signOut();
        }
      };
    }
  };

  // === 启动 ===
  boot();
})();
