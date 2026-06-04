-- ============================================================
-- 欣成则灵 - Supabase 数据库初始化 SQL
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 1. 情侣信息表
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  together_date DATE,
  partner1_name TEXT DEFAULT '我',
  partner2_name TEXT DEFAULT '你',
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 回忆录
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL,
  photos TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_memories_date ON memories(date DESC);
CREATE INDEX idx_memories_user ON memories(user_id);

-- 3. 重要日子
CREATE TABLE important_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('anniversary', 'period', 'birthday', 'custom')),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  repeat TEXT DEFAULT 'none' CHECK (repeat IN ('yearly', 'monthly', 'none')),
  description TEXT DEFAULT '',
  remind_before_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_important_dates_user ON important_dates(user_id);

-- 4. 姨妈记录
CREATE TABLE period_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_period_records_user ON period_records(user_id);

-- 5. 人生规划
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_date DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'completed')),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  sub_tasks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_plans_user ON plans(user_id);

-- 6. 情书留言
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  date DATE DEFAULT now(),
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notes_user ON notes(user_id);

-- 7. 愿望清单
CREATE TABLE wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'wishlist' CHECK (status IN ('wishlist', 'planned', 'done')),
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_wishlist_user ON wishlist(user_id);

-- ============================================================
-- RLS (Row Level Security) 策略
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- 每个用户只能访问自己的数据
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own memories" ON memories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own dates" ON important_dates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own period records" ON period_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own plans" ON plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own notes" ON notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist" ON wishlist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 实时同步 (启用 Supabase Realtime)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE memories;
ALTER PUBLICATION supabase_realtime ADD TABLE important_dates;
ALTER PUBLICATION supabase_realtime ADD TABLE period_records;
ALTER PUBLICATION supabase_realtime ADD TABLE plans;
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE wishlist;

-- ============================================================
-- 触发器：自动创建 profile
-- ============================================================
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- ============================================================
-- Storage 存储桶 + 策略
-- (创建 photos bucket 后执行这部分)
-- ============================================================

-- 如果你还没在 UI 创建 photos bucket，先运行：
-- SELECT storage.create_bucket('photos');

-- 策略1：所有人都可以查看照片（公开读取）
CREATE POLICY "允许所有人查看照片"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

-- 策略2：只有已登录用户可以上传照片
CREATE POLICY "允许已认证用户上传照片"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- 策略3：已登录用户可以删除自己上传的照片
CREATE POLICY "允许已认证用户删除照片"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- 策略4：已登录用户可以更新照片
CREATE POLICY "允许已认证用户更新照片"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'photos' AND auth.role() = 'authenticated');
