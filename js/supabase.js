/* ============================================================
   supabase.js - Supabase 客户端初始化
   使用前请将下面的 URL 和 KEY 替换为你自己的 Supabase 项目信息
   ============================================================ */

// ⚠️ 替换为你的 Supabase 项目 URL 和 anon key
// 在 Supabase 控制台 → Settings → API 中可以找到
const SUPABASE_URL = 'https://fdjeqaieqymdkwptkqhy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HW9dQjAtC-35pq6l0SF8Sw_qpV3cGUP';

// 创建 Supabase 客户端
const supabase = (() => {
  if (!window.supabase) {
    console.error('❌ Supabase SDK 未加载，请检查网络连接');
    return null;
  }
  try {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    });
    console.log('✅ Supabase 客户端初始化成功');
    return client;
  } catch (e) {
    console.error('❌ Supabase 初始化失败:', e.message);
    return null;
  }
})();
