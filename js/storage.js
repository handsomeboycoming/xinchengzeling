/* ============================================================
   storage.js - 数据存储层 (Supabase)
   接口与旧版 localStorage 版本一致，页面代码改动最小
   ============================================================ */

const DB = (() => {
  // 获取当前登录用户 ID
  function userId() {
    return supabase.auth.user()?.id;
  }

  // === 认证相关 ===
  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function getUser() {
    return supabase.auth.user();
  }

  function onAuthChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // === 设置 (Profiles) ===
  async function getSettings() {
    const uid = userId();
    if (!uid) return { togetherDate: '', partner1Name: '我', partner2Name: '你', theme: 'light' };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (error || !data) return { togetherDate: '', partner1Name: '我', partner2Name: '你', theme: 'light' };

    return {
      togetherDate: data.together_date || '',
      partner1Name: data.partner1_name || '我',
      partner2Name: data.partner2_name || '你',
      theme: data.theme || 'light',
    };
  }

  async function saveSettings(settings) {
    const uid = userId();
    if (!uid) return;

    await supabase
      .from('profiles')
      .upsert({
        user_id: uid,
        together_date: settings.togetherDate || null,
        partner1_name: settings.partner1Name || '我',
        partner2_name: settings.partner2Name || '你',
        theme: settings.theme || 'light',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }

  // === 回忆录 ===
  async function getMemories() {
    const uid = userId();
    if (!uid) return [];

    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false });

    if (error) { console.error('getMemories error:', error); return []; }
    return data.map(rowToMemory);
  }

  async function getMemory(id) {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return rowToMemory(data);
  }

  async function saveMemory(memory) {
    const uid = userId();
    if (!uid) return;

    const record = memoryToRow(memory, uid);
    const { error } = await supabase
      .from('memories')
      .upsert(record, { onConflict: 'id' });

    if (error) throw error;
  }

  async function deleteMemory(id) {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // === 重要日子 ===
  async function getImportantDates() {
    const uid = userId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('important_dates')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: true });
    if (error) return [];
    return data.map(rowToDate);
  }

  async function saveImportantDates(dates) {
    // 全量替换：先删后插
    const uid = userId();
    if (!uid) return;
    await supabase.from('important_dates').delete().eq('user_id', uid);
    if (dates.length === 0) return;
    const rows = dates.map(d => dateToRow(d, uid));
    const { error } = await supabase.from('important_dates').insert(rows);
    if (error) throw error;
  }

  // === 姨妈记录 ===
  async function getPeriodRecords() {
    const uid = userId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('period_records')
      .select('*')
      .eq('user_id', uid)
      .order('start_date', { ascending: false });
    if (error) return [];
    return data.map(rowToPeriod);
  }

  async function savePeriodRecords(records) {
    const uid = userId();
    if (!uid) return;
    await supabase.from('period_records').delete().eq('user_id', uid);
    if (records.length === 0) return;
    const rows = records.map(r => periodToRow(r, uid));
    const { error } = await supabase.from('period_records').insert(rows);
    if (error) throw error;
  }

  // === 人生规划 ===
  async function getPlans() {
    const uid = userId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data.map(rowToPlan);
  }

  async function savePlans(plans) {
    const uid = userId();
    if (!uid) return;
    await supabase.from('plans').delete().eq('user_id', uid);
    if (plans.length === 0) return;
    const rows = plans.map(p => planToRow(p, uid));
    const { error } = await supabase.from('plans').insert(rows);
    if (error) throw error;
  }

  // === 情书 ===
  async function getNotes() {
    const uid = userId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false });
    if (error) return [];
    return data.map(rowToNote);
  }

  async function saveNotes(notes) {
    const uid = userId();
    if (!uid) return;
    await supabase.from('notes').delete().eq('user_id', uid);
    if (notes.length === 0) return;
    const rows = notes.map(n => noteToRow(n, uid));
    const { error } = await supabase.from('notes').insert(rows);
    if (error) throw error;
  }

  // === 愿望清单 ===
  async function getWishlist() {
    const uid = userId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('wishlist')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data.map(rowToWish);
  }

  async function saveWishlist(items) {
    const uid = userId();
    if (!uid) return;
    await supabase.from('wishlist').delete().eq('user_id', uid);
    if (items.length === 0) return;
    const rows = items.map(w => wishToRow(w, uid));
    const { error } = await supabase.from('wishlist').insert(rows);
    if (error) throw error;
  }

  // === 照片上传到 Supabase Storage ===
  async function uploadPhoto(file) {
    const uid = userId();
    if (!uid) throw new Error('未登录');

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  async function uploadBase64Photo(base64Data, fileName) {
    const uid = userId();
    if (!uid) throw new Error('未登录');

    // Base64 转 Blob
    const parts = base64Data.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const byteStr = atob(parts[1]);
    const ab = new ArrayBuffer(byteStr.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
    const blob = new Blob([ab], { type: mime });

    const ext = mime.split('/')[1] || 'jpg';
    const filePath = `${uid}/${Date.now()}-${fileName || 'photo'}.${ext}`;

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  async function deletePhoto(url) {
    // 从 URL 中提取路径
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/photos\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from('photos').remove([pathMatch[1]]);
      }
    } catch (e) {
      console.warn('无法删除照片:', e);
    }
  }

  // === 数据导出/导入 ===
  async function exportAllData() {
    const [memories, importantDates, periodRecords, plans, notes, wishlist, settings] = await Promise.all([
      getMemories(), getImportantDates(), getPeriodRecords(),
      getPlans(), getNotes(), getWishlist(), getSettings(),
    ]);

    return {
      version: 2,
      exportDate: Utils.formatDate(new Date()),
      memories, importantDates, periodRecords,
      plans, notes, wishlist, settings,
    };
  }

  async function importAllData(data) {
    if (!data || !data.version) throw new Error('无效的备份文件');

    if (data.settings) await saveSettings(data.settings);
    if (data.memories) {
      for (const m of data.memories) await saveMemory(m);
    }
    // 对于列表型数据，直接替换
    if (data.importantDates) await saveImportantDates(data.importantDates);
    if (data.periodRecords) await savePeriodRecords(data.periodRecords);
    if (data.plans) await savePlans(data.plans);
    if (data.notes) await saveNotes(data.notes);
    if (data.wishlist) await saveWishlist(data.wishlist);
  }

  // === 行映射函数 ===
  function rowToMemory(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      date: row.date,
      photos: row.photos || [],
      tags: row.tags || [],
      createdAt: row.created_at,
    };
  }

  function memoryToRow(m, uid) {
    return {
      id: m.id,
      user_id: uid,
      title: m.title,
      description: m.description || '',
      date: m.date,
      photos: m.photos || [],
      tags: m.tags || [],
      updated_at: new Date().toISOString(),
    };
  }

  function rowToDate(row) {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      date: row.date,
      repeat: row.repeat || 'none',
      description: row.description || '',
      remindBeforeDays: row.remind_before_days || 0,
    };
  }

  function dateToRow(d, uid) {
    return {
      id: d.id,
      user_id: uid,
      type: d.type,
      title: d.title,
      date: d.date,
      repeat: d.repeat || 'none',
      description: d.description || '',
      remind_before_days: d.remindBeforeDays || 0,
    };
  }

  function rowToPeriod(row) {
    return {
      id: row.id,
      startDate: row.start_date,
      endDate: row.end_date || '',
      notes: row.notes || '',
    };
  }

  function periodToRow(r, uid) {
    return {
      id: r.id,
      user_id: uid,
      start_date: r.startDate,
      end_date: r.endDate || null,
      notes: r.notes || '',
    };
  }

  function rowToPlan(row) {
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      description: row.description || '',
      targetDate: row.target_date || '',
      status: row.status || 'planned',
      progress: row.progress || 0,
      subTasks: typeof row.sub_tasks === 'string' ? JSON.parse(row.sub_tasks) : (row.sub_tasks || []),
    };
  }

  function planToRow(p, uid) {
    return {
      id: p.id,
      user_id: uid,
      category: p.category,
      title: p.title,
      description: p.description || '',
      target_date: p.targetDate || null,
      status: p.status || 'planned',
      progress: p.progress || 0,
      sub_tasks: p.subTasks || [],
      updated_at: new Date().toISOString(),
    };
  }

  function rowToNote(row) {
    return {
      id: row.id,
      author: row.author,
      content: row.content,
      date: row.date,
      isPrivate: row.is_private || false,
    };
  }

  function noteToRow(n, uid) {
    return {
      id: n.id,
      user_id: uid,
      author: n.author,
      content: n.content,
      date: n.date,
      is_private: n.isPrivate || false,
    };
  }

  function rowToWish(row) {
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      description: row.description || '',
      status: row.status || 'wishlist',
      image: row.image_url || '',
    };
  }

  function wishToRow(w, uid) {
    return {
      id: w.id,
      user_id: uid,
      category: w.category,
      title: w.title,
      description: w.description || '',
      status: w.status || 'wishlist',
      image_url: w.image || '',
      updated_at: new Date().toISOString(),
    };
  }

  return {
    // Auth
    signUp, signIn, signOut, getUser, onAuthChange,
    // Settings
    getSettings, saveSettings,
    // Memories
    getMemories, getMemory, saveMemory, deleteMemory,
    // Important Dates
    getImportantDates, saveImportantDates,
    // Period Records
    getPeriodRecords, savePeriodRecords,
    // Plans
    getPlans, savePlans,
    // Notes
    getNotes, saveNotes,
    // Wishlist
    getWishlist, saveWishlist,
    // Photos
    uploadPhoto, uploadBase64Photo, deletePhoto,
    // Import/Export
    exportAllData, importAllData,
  };
})();
