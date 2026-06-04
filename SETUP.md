# 欣成则灵 - 部署设置指南

## 第1步：创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) 并注册/登录
2. 点击 **New project** 创建项目
3. 填写：
   - Name: `xinchengzeling`（或任意名字）
   - Database Password: 设置一个强密码（记下来！）uestc1956.lcq
   - Region: 选择离你最近的（亚洲选 Singapore 或 Tokyo）
4. 点击 **Create project**，等待约2分钟初始化

## 第2步：创建数据库表

1. 在 Supabase 控制台左侧点击 **SQL Editor**
2. 点击 **New query**
3. 打开本项目中的 `supabase-schema.sql` 文件，**复制全部内容**
4. 粘贴到 SQL Editor 中，点击 **Run**
5. 看到 "Success" 就完成了

## 第3步：创建存储桶（用 SQL 一键搞定）

1. 左侧点击 **SQL Editor** → **New query**
2. 粘贴以下 SQL，点击 **Run**：

```sql
-- 1. 创建存储桶（公开访问）
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 所有人都可以查看照片
CREATE POLICY "允许所有人查看照片"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

-- 3. 已登录用户可以上传照片
CREATE POLICY "允许已认证用户上传照片"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- 4. 已登录用户可以删除照片
CREATE POLICY "允许已认证用户删除照片"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- 5. 已登录用户可以更新照片
CREATE POLICY "允许已认证用户更新照片"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'photos' AND auth.role() = 'authenticated');
```

3. 看到 "Success" 就完成了！不需要在 UI 上点来点去。

## 第4步：配置 API Key

1. 左侧点击 **Settings** → **API**
2. 复制 **Project URL**（类似 `https://xxxxx.supabase.co`）
3. 复制 **anon public key**（很长的字符串）
4. 打开项目中 `js/supabase.js`，替换：
   ```js
   const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key-here';
   ```
   改为你的实际值

## 第5步：禁用邮箱验证（可选，推荐）

1. 左侧 **Authentication** → **Settings**
2. 找到 **Email confirmation** 部分
3. 如果不想验证邮箱，取消勾选 **Confirm email**
4. 这样注册后可以直接登录

## 第6步：生成 PWA 图标

用任意在线工具生成两个图标：
- 192x192 PNG → `assets/icons/icon-192.png`
- 512x512 PNG → `assets/icons/icon-512.png`

推荐工具：https://realfavicongenerator.net 或 https://www.favicon-generator.org

你也可以用下面这个简单的网页生成（复制到浏览器打开）：
```
data:text/html,<canvas id=c width=512 height=512></canvas><script>const x=c.getContext('2d');x.fillStyle='%23e91e63';x.beginPath();x.arc(256,256,240,0,Math.PI*2);x.fill();x.fillStyle='white';x.font='bold 200px sans-serif';x.textAlign='center';x.fillText('💕',256,330);c.toBlob(b=>{const a=document.createElement('a');a.download='icon-512.png';a.href=URL.createObjectURL(b);a.click()})</script>
```

## 第7步：部署到 Vercel

1. 把整个 `xinchengzeling` 文件夹推送到 GitHub
2. 打开 [vercel.com](https://vercel.com) 注册/登录
3. 点击 **New Project** → 导入你的 GitHub 仓库
4. 无需任何配置，直接点击 **Deploy**
5. 获得公开网址！分享给对象即可

## 使用

1. 打开网址
2. 首次使用点击「注册新账号」
3. 输入你和对象共用的邮箱 + 密码
4. 登录后就可以使用了！

双方都用同一个账号密码登录，所有数据实时同步。

## 从旧版迁移数据

1. 在旧版本（couple-memories）中打开设置 → 导出数据备份
2. 得到 JSON 文件
3. 在新版本中登录后，打开设置 → 从旧版迁移
4. 选择刚才导出的 JSON 文件
5. 等待迁移完成（照片会被上传到 Supabase 存储）
