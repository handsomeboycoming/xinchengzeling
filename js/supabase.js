/* ============================================================
   supabase.js - Supabase 客户端初始化
   使用前请将下面的 URL 和 KEY 替换为你自己的 Supabase 项目信息
   ============================================================ */

// ⚠️ 替换为你的 Supabase 项目 URL 和 anon key
// 在 Supabase 控制台 → Settings → API 中可以找到
const SUPABASE_URL = 'https://fdjeqaieqymdkwptkqhy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HW9dQjAtC-35pq6l0SF8Sw_qpV3cGUP';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,       // 记住登录状态
    autoRefreshToken: true,     // 自动刷新 token
    detectSessionInUrl: true,   // 支持 OAuth 回调
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
