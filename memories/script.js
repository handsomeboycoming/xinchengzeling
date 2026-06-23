/* ============================================
   复古胶片风回忆录 — 脚本
   ============================================ */

(function () {
    'use strict';

    // --- DOM 引用 ---
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
    let dataLoaded = false;

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

    // 键盘 Enter 键也可以进入
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !cover.classList.contains('hidden')) {
            enterMemories();
        }
    });

    // ============================================
    // 启动
    // ============================================
    async function init() {
        const data = await loadData();
        dataLoaded = true;
        memoriesData = data.memories || [];

        initCover(data);
        setupMusic(data);
        renderMemories(memoriesData);

        // 如果 URL hash 是 #memories，直接跳过封面
        if (window.location.hash === '#memories') {
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
