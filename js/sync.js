/* ============================================================
   sync.js - 实时同步管理
   使用 Supabase Realtime 订阅数据库变更
   一方修改 → 另一方自动刷新对应页面
   ============================================================ */

const Sync = (() => {
  const channels = {};
  const listeners = {};

  function s() {
    if (!supabase) throw new Error('Supabase 未初始化');
    return supabase;
  }

  // 初始化所有表的实时订阅
  function initAll(onChange) {
    // 监听所有表
    const tables = ['memories', 'important_dates', 'period_records', 'plans', 'notes', 'wishlist', 'profiles'];

    tables.forEach(table => {
      const channel = supabase
        .channel(`sync-${table}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            console.log(`[Sync] ${table} 变更:`, payload.eventType);
            // 触发回调
            if (listeners[table]) {
              listeners[table].forEach(fn => fn(payload));
            }
            if (onChange) onChange(table, payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Sync] ${table} 订阅成功`);
          }
        });

      channels[table] = channel;
    });
  }

  // 监听特定表
  function onTableChange(table, callback) {
    if (!listeners[table]) listeners[table] = [];
    listeners[table].push(callback);
    // 返回取消订阅函数
    return () => {
      listeners[table] = listeners[table].filter(fn => fn !== callback);
    };
  }

  // 刷新当前页面
  function refreshCurrentPage() {
    const hash = window.location.hash.replace('#', '') || 'home';
    switch (hash) {
      case 'home': HomePage.render(); break;
      case 'memories': MemoriesPage.render(); break;
      case 'dates': DatesPage.render(); break;
      case 'plans': PlansPage.render(); break;
      case 'notes': NotesPage.render(); break;
      case 'wishlist': WishlistPage.render(); break;
      case 'settings': SettingsPage.render(); break;
    }
  }

  // 自动刷新（防抖）
  let refreshTimer = null;
  function autoRefresh(table) {
    const hash = window.location.hash.replace('#', '') || 'home';

    // 映射数据库表到页面路由
    const tableToRoute = {
      'memories': 'memories',
      'important_dates': 'dates',
      'period_records': 'dates',
      'plans': 'plans',
      'notes': 'notes',
      'wishlist': 'wishlist',
      'profiles': 'home',
    };

    const route = tableToRoute[table];
    if (route === hash) {
      // 防抖：2000ms 内多次变更只刷新一次
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refreshCurrentPage, 2000);
    }
  }

  // 清理所有订阅
  function cleanup() {
    Object.values(channels).forEach(ch => {
      s().removeChannel(ch);
    });
  }

  return { initAll, onTableChange, refreshCurrentPage, autoRefresh, cleanup };
})();
