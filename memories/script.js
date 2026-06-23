/* ============================================
   复古胶片风回忆录 — 脚本
   ============================================ */

(function () {
    'use strict';

    // --- DOM 引用 ---
    const passwordScreen = document.getElementById('password-screen');
    const passwordInput = document.getElementById('password-input');
    const passwordSubmit = document.getElementById('password-submit');
    const passwordError = document.getElementById('password-error');
    const passwordInputGroup = passwordSubmit?.parentElement;
    const cover = document.getElementById('cover');
    const coverTitle = document.getElementById('cover-title');
    const coverSubtitle = document.getElementById('cover-subtitle');
    const enterBtn = document.getElementById('enter-btn');
    const mainContent = document.getElementById('main-content');
    const timeline = document.getElementById('timeline');
    const bgMusic = document.getElementById('bg-music');
    const musicToggle = document.getElementById('music-toggle');
    const musicInfo = document.getElementById('music-info');
    const musicTitleEl = musicInfo?.querySelector('.music-title');
    const musicArtistEl = musicInfo?.querySelector('.music-artist');

    let memoriesData = [];
    let musicPlaying = false;
    let appPassword = '';

    // ============================================
    // 数据加载
    // ============================================
    async function loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('data.json 加载失败');
            const data = await response.json();
            return data;
        } catch (err) {
            console.error('加载数据出错:', err);
            // 返回默认数据作为降级方案
            return {
                coverTitle: '答应我，别再拉黑我了！',
                coverSubtitle: '— 我们の回忆录 —',
                music: {
                    src: 'music/shuqianba-nvhai.mp3',
                    title: '数钱吧女孩',
                    artist: '连麻',
                },
                memories: [],
            };
        }
    }

    // ============================================
    // 初始化封面
    // ============================================
    function initCover(data) {
        coverTitle.textContent = data.coverTitle || '答应我，别再拉黑我了！';
        coverSubtitle.textContent = data.coverSubtitle || '— 我们の回忆录 —';
    }

    // ============================================
    // 设置音乐
    // ============================================
    function setupMusic(data) {
        const music = data.music || {};
        const src = music.src || 'music/shuqianba-nvhai.mp3';

        // 设置音频源
        const source = bgMusic.querySelector('source');
        if (!source) {
            const newSource = document.createElement('source');
            newSource.src = src;
            newSource.type = 'audio/mpeg';
            bgMusic.appendChild(newSource);
        } else {
            source.src = src;
        }
        bgMusic.load();

        // 显示歌曲信息
        if (musicTitleEl) musicTitleEl.textContent = music.title || '';
        if (musicArtistEl) musicArtistEl.textContent = music.artist || '';
    }

    // ============================================
    // 音乐控制
    // ============================================
    function toggleMusic() {
        if (musicPlaying) {
            bgMusic.pause();
            musicToggle.classList.remove('playing');
            musicToggle.classList.add('paused');
        } else {
            // 用户交互后播放
            bgMusic.play().catch(err => {
                console.warn('音乐播放失败:', err.message);
            });
            musicToggle.classList.remove('paused');
            musicToggle.classList.add('playing');
        }
        musicPlaying = !musicPlaying;
    }

    musicToggle.addEventListener('click', toggleMusic);

    // 监听音频实际状态
    bgMusic.addEventListener('play', () => {
        musicPlaying = true;
        musicToggle.classList.remove('paused');
        musicToggle.classList.add('playing');
    });

    bgMusic.addEventListener('pause', () => {
        musicPlaying = false;
        musicToggle.classList.remove('playing');
        musicToggle.classList.add('paused');
    });

    bgMusic.addEventListener('ended', () => {
        musicPlaying = false;
        musicToggle.classList.remove('playing');
        musicToggle.classList.add('paused');
    });

    // ============================================
    // 渲染回忆卡片
    // ============================================
    function renderMemories(memories) {
        if (!memories || memories.length === 0) {
            timeline.innerHTML = `
                <div style="text-align:center;padding:100px 20px;color:var(--sepia);">
                    <p style="font-size:1.2rem;">📷</p>
                    <p>还没有回忆，快去 data.json 里添加吧！</p>
                </div>
            `;
            return;
        }

        timeline.innerHTML = memories.map((memory, index) => {
            const imageHtml = memory.image
                ? `<img src="${escapeHtml(memory.image)}" alt="${escapeHtml(memory.text || '')}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">`
                : '';

            const placeholderHtml = memory.image
                ? `<div class="photo-placeholder" style="display:none;">📷</div>`
                : `<div class="photo-placeholder">📷<br><span style="font-size:0.7rem;">添加照片</span></div>`;

            return `
                <div class="memory-card" data-index="${index}">
                    <div class="photo-wrapper">
                        ${imageHtml}
                        ${placeholderHtml}
                    </div>
                    <div class="memory-text">
                        <div class="memory-date">${escapeHtml(memory.date || '')}</div>
                        <p class="memory-caption">${escapeHtml(memory.text || '')}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ============================================
    // 滚动动画 (Intersection Observer)
    // ============================================
    function setupScrollReveal() {
        const cards = document.querySelectorAll('.memory-card');
        if (cards.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        // 显示后不再观察
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.2,
                rootMargin: '0px 0px -50px 0px',
            }
        );

        cards.forEach(card => observer.observe(card));

        // 初始时立即检查（顶部可见的卡片）
        setTimeout(() => {
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    card.classList.add('revealed');
                    observer.unobserve(card);
                }
            });
        }, 300);
    }

    // ============================================
    // 封面进入动画
    // ============================================
    function enterMemories() {
        // 封面滑出
        cover.classList.add('hidden');

        // 显示主内容
        mainContent.classList.add('visible');

        // 开始播放音乐
        if (!musicPlaying) {
            bgMusic.play().then(() => {
                musicPlaying = true;
                musicToggle.classList.remove('paused');
                musicToggle.classList.add('playing');
            }).catch(err => {
                console.warn('音乐自动播放被浏览器阻止，请手动点击播放:', err.message);
                musicToggle.classList.add('paused');
            });
        }

        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 延迟设置滚动动画观察
        setTimeout(setupScrollReveal, 500);
    }

    enterBtn.addEventListener('click', enterMemories);

    // 键盘 Enter 键 — 优先处理密码页
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;

        // 密码页还在 → 提交密码
        if (!passwordScreen.classList.contains('hidden')) {
            e.preventDefault();
            checkPassword();
            return;
        }

        // 封面还在 → 进入回忆
        if (!cover.classList.contains('hidden')) {
            enterMemories();
        }
    });

    // ============================================
    // 密码验证
    // ============================================
    function checkPassword() {
        const input = passwordInput.value.trim();

        if (!input) {
            showPasswordError('请输入密码～');
            return;
        }

        if (input !== appPassword) {
            showPasswordError('密码不对哦，再试试～');
            // 抖动效果
            passwordInputGroup.classList.add('shake');
            setTimeout(() => passwordInputGroup.classList.remove('shake'), 500);
            passwordInput.value = '';
            passwordInput.focus();
            return;
        }

        // 密码正确 → 记住到会话，隐藏密码页，显示封面
        sessionStorage.setItem('memories_unlocked', 'true');
        hidePasswordScreen();
    }

    function showPasswordError(msg) {
        passwordError.textContent = msg;
        passwordError.classList.add('show');
        setTimeout(() => passwordError.classList.remove('show'), 2000);
    }

    function hidePasswordScreen() {
        passwordScreen.classList.add('hidden');
        // 密码页消失后聚焦封面
        setTimeout(() => {
            passwordInput.value = '';
        }, 600);
    }

    // 密码提交按钮
    passwordSubmit.addEventListener('click', checkPassword);

    // 密码输入框实时清空错误
    passwordInput.addEventListener('input', () => {
        passwordError.classList.remove('show');
    });

    // ============================================
    // 浮动光粒子（封面高级感）
    // ============================================
    function createParticles() {
        const container = document.getElementById('particles');
        if (!container) return;

        const count = 30;
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');

            const size = Math.random() * 3 + 1.5;
            const left = Math.random() * 100;
            const delay = Math.random() * 10;
            const duration = Math.random() * 8 + 8;
            const baseOpacity = Math.random() * 0.4 + 0.15;

            particle.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${left}%;
                bottom: -10px;
                animation-delay: ${delay}s;
                animation-duration: ${duration}s;
                opacity: ${baseOpacity};
            `;

            fragment.appendChild(particle);
        }

        container.appendChild(fragment);
    }

    // ============================================
    // 启动
    // ============================================
    async function init() {
        const data = await loadData();

        // 创建浮动粒子
        createParticles();

        // 保存密码（从 data.json 读取）
        appPassword = data.password || '';

        memoriesData = data.memories || [];

        initCover(data);
        setupMusic(data);
        renderMemories(memoriesData);

        // 如果没有设置密码，跳过密码页
        if (!appPassword) {
            hidePasswordScreen();
        }

        // 如果当前会话已经解锁过，直接跳过密码页
        if (sessionStorage.getItem('memories_unlocked') === 'true') {
            hidePasswordScreen();
        }

        // 如果 URL hash 是 #memories 且已解锁，直接进入
        if (window.location.hash === '#memories' && sessionStorage.getItem('memories_unlocked') === 'true') {
            setTimeout(enterMemories, 300);
        }
    }

    // 启动应用
    init().catch(err => {
        console.error('初始化失败:', err);
        // 降级：直接渲染空内容
        initCover({});
        renderMemories([]);
    });
})();
