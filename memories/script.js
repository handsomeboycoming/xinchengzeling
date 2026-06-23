/* ============================================
   Retro Noir Pro — 复古酷酷回忆录脚本
   说明：保留原功能，增强高级感、容错性和交互动效。
   ============================================ */

(function () {
    'use strict';

    const $ = (selector) => document.querySelector(selector);
    const byId = (id) => document.getElementById(id);

    // --- DOM 引用 ---
    const passwordScreen = byId('password-screen');
    const passwordInput = byId('password-input');
    const passwordSubmit = byId('password-submit');
    const passwordError = byId('password-error');
    const passwordInputGroup = passwordSubmit?.parentElement || null;
    const cover = byId('cover');
    const coverTitle = byId('cover-title');
    const coverSubtitle = byId('cover-subtitle');
    const enterBtn = byId('enter-btn');
    const mainContent = byId('main-content');
    const timeline = byId('timeline');
    const bgMusic = byId('bg-music');
    const musicToggle = byId('music-toggle');
    const musicInfo = byId('music-info');
    const musicTitleEl = musicInfo?.querySelector('.music-title') || null;
    const musicArtistEl = musicInfo?.querySelector('.music-artist') || null;

    let memoriesData = [];
    let musicPlaying = false;
    let appPassword = '';
    let scrollObserver = null;

    // ============================================
    // 数据加载
    // ============================================
    async function loadData() {
        try {
            const response = await fetch('data.json', { cache: 'no-store' });
            if (!response.ok) throw new Error('data.json 加载失败');
            return await response.json();
        } catch (err) {
            console.error('加载数据出错:', err);
            // 降级数据：更符合复古酷酷风格
            return {
                coverTitle: '暗房里的我们',
                coverSubtitle: 'RETRO NOIR MEMORY ARCHIVE',
                music: {
                    src: 'music/shuqianba-nvhai.mp3',
                    title: 'Now Playing',
                    artist: 'Private Archive',
                },
                memories: [],
            };
        }
    }

    // ============================================
    // 初始化封面
    // ============================================
    function initCover(data) {
        if (coverTitle) coverTitle.textContent = data.coverTitle || '暗房里的我们';
        if (coverSubtitle) coverSubtitle.textContent = data.coverSubtitle || 'RETRO NOIR MEMORY ARCHIVE';
        document.title = data.pageTitle || data.coverTitle || document.title;
    }

    // ============================================
    // 设置音乐
    // ============================================
    function setupMusic(data) {
        if (!bgMusic) return;

        const music = data.music || {};
        const src = music.src || 'music/shuqianba-nvhai.mp3';
        let source = bgMusic.querySelector('source');

        if (!source) {
            source = document.createElement('source');
            source.type = 'audio/mpeg';
            bgMusic.appendChild(source);
        }

        source.src = src;
        bgMusic.load();

        if (musicTitleEl) musicTitleEl.textContent = music.title || 'Now Playing';
        if (musicArtistEl) musicArtistEl.textContent = music.artist || 'Private Archive';
    }

    // ============================================
    // 音乐控制
    // ============================================
    function setMusicState(isPlaying) {
        musicPlaying = isPlaying;
        if (!musicToggle) return;
        musicToggle.classList.toggle('playing', isPlaying);
        musicToggle.classList.toggle('paused', !isPlaying);
        musicToggle.setAttribute('aria-label', isPlaying ? '暂停音乐' : '播放音乐');
    }

    function toggleMusic() {
        if (!bgMusic) return;

        if (musicPlaying) {
            bgMusic.pause();
            setMusicState(false);
            return;
        }

        bgMusic.play()
            .then(() => setMusicState(true))
            .catch(err => {
                console.warn('音乐播放失败:', err.message);
                setMusicState(false);
            });
    }

    if (musicToggle) musicToggle.addEventListener('click', toggleMusic);
    if (bgMusic) {
        bgMusic.addEventListener('play', () => setMusicState(true));
        bgMusic.addEventListener('pause', () => setMusicState(false));
        bgMusic.addEventListener('ended', () => setMusicState(false));
    }

    // ============================================
    // 渲染回忆卡片
    // ============================================
    function renderMemories(memories) {
        if (!timeline) return;

        if (!memories || memories.length === 0) {
            timeline.innerHTML = `
                <div class="empty-state" style="text-align:center;padding:120px 20px;color:var(--text-muted);">
                    <p style="font-size:1.4rem;letter-spacing:.25em;">NO RECORD</p>
                    <p style="margin-top:12px;opacity:.7;">在 data.json 里添加照片和文字，这里会变成你的私人胶片档案。</p>
                </div>
            `;
            return;
        }

        timeline.innerHTML = memories.map((memory, index) => {
            const imageHtml = memory.image
                ? `<img src="${escapeHtml(memory.image)}" alt="${escapeHtml(memory.text || 'memory photo')}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">`
                : '';

            const placeholderHtml = memory.image
                ? `<div class="photo-placeholder" style="display:none;">NO IMAGE</div>`
                : `<div class="photo-placeholder">NO IMAGE<br><span style="font-size:0.62rem;letter-spacing:.18em;">ADD PHOTO</span></div>`;

            return `
                <div class="memory-card" data-index="${index}">
                    <div class="photo-wrapper">
                        ${imageHtml}
                        ${placeholderHtml}
                    </div>
                    <div class="memory-text">
                        <div class="memory-date">${escapeHtml(memory.date || 'UNDATED')}</div>
                        <p class="memory-caption">${escapeHtml(memory.text || '')}</p>
                    </div>
                </div>
            `;
        }).join('');

        decorateMemoryCards();
    }

    function decorateMemoryCards() {
        const cards = document.querySelectorAll('.memory-card');
        cards.forEach((card, index) => {
            const tilt = index % 2 === 0 ? '-1.8deg' : '1.8deg';
            card.style.setProperty('--tilt', tilt);
            card.style.transitionDelay = `${Math.min(index * 60, 300)}ms`;
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str ?? '');
        return div.innerHTML;
    }

    // ============================================
    // 滚动动画
    // ============================================
    function setupScrollReveal() {
        const cards = document.querySelectorAll('.memory-card');
        if (cards.length === 0) return;

        if (scrollObserver) scrollObserver.disconnect();

        scrollObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('revealed');
                    scrollObserver.unobserve(entry.target);
                });
            },
            {
                threshold: 0.18,
                rootMargin: '0px 0px -70px 0px',
            }
        );

        cards.forEach(card => scrollObserver.observe(card));

        setTimeout(() => {
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    card.classList.add('revealed');
                    scrollObserver.unobserve(card);
                }
            });
        }, 220);
    }

    // ============================================
    // 封面进入动画
    // ============================================
    function enterMemories() {
        if (cover) cover.classList.add('hidden');
        if (mainContent) mainContent.classList.add('visible');

        if (bgMusic && !musicPlaying) {
            bgMusic.play()
                .then(() => setMusicState(true))
                .catch(err => {
                    console.warn('音乐自动播放被浏览器阻止，请手动点击播放:', err.message);
                    setMusicState(false);
                });
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(setupScrollReveal, 420);
    }

    if (enterBtn) enterBtn.addEventListener('click', enterMemories);

    // 键盘 Enter 键 — 优先处理密码页
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;

        if (passwordScreen && !passwordScreen.classList.contains('hidden')) {
            e.preventDefault();
            checkPassword();
            return;
        }

        if (cover && !cover.classList.contains('hidden')) {
            enterMemories();
        }
    });

    // ============================================
    // 密码验证
    // ============================================
    function checkPassword() {
        if (!passwordInput) return;
        const input = passwordInput.value.trim();

        if (!input) {
            showPasswordError('请输入通行密钥');
            return;
        }

        if (input !== appPassword) {
            showPasswordError('密钥校验失败');
            passwordInputGroup?.classList.add('shake');
            setTimeout(() => passwordInputGroup?.classList.remove('shake'), 500);
            passwordInput.value = '';
            passwordInput.focus();
            return;
        }

        sessionStorage.setItem('memories_unlocked', 'true');
        hidePasswordScreen();
    }

    function showPasswordError(msg) {
        if (!passwordError) return;
        passwordError.textContent = msg;
        passwordError.classList.add('show');
        setTimeout(() => passwordError.classList.remove('show'), 2200);
    }

    function hidePasswordScreen() {
        if (!passwordScreen) return;
        passwordScreen.classList.add('hidden');
        setTimeout(() => {
            if (passwordInput) passwordInput.value = '';
        }, 600);
    }

    if (passwordSubmit) passwordSubmit.addEventListener('click', checkPassword);
    if (passwordInput) {
        passwordInput.addEventListener('input', () => passwordError?.classList.remove('show'));
    }

    // ============================================
    // 浪漫花瓣粒子
    // ============================================
    function createParticles() {
        const container = byId('petals');
        if (!container) return;
        container.innerHTML = '';

        const petals = ['🌸', '💕', '♥', '✿', '💗', '🌷', '✨', '🩷'];
        const count = window.matchMedia('(max-width: 768px)').matches ? 18 : 32;
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
            const petal = document.createElement('div');
            petal.classList.add('petal');

            const emoji = petals[Math.floor(Math.random() * petals.length)];
            const size = (Math.random() * 0.8 + 0.6).toFixed(1);
            const left = Math.random() * 100;
            const delay = Math.random() * 12;
            const duration = Math.random() * 10 + 10;
            const opacity = (Math.random() * 0.5 + 0.3).toFixed(2);

            petal.textContent = emoji;
            petal.style.cssText = `
                font-size: ${size}rem;
                left: ${left}%;
                top: -20px;
                animation-delay: ${delay}s;
                animation-duration: ${duration}s;
                opacity: ${opacity};
            `;

            fragment.appendChild(petal);
        }

        container.appendChild(fragment);
    }

    function setupPointerGlow() {
        const root = document.documentElement;
        const update = (e) => {
            const x = `${Math.round((e.clientX / window.innerWidth) * 100)}%`;
            const y = `${Math.round((e.clientY / window.innerHeight) * 100)}%`;
            root.style.setProperty('--pointer-x', x);
            root.style.setProperty('--pointer-y', y);
            if (cover) {
                cover.style.setProperty('--cover-x', x);
                cover.style.setProperty('--cover-y', y);
            }
        };
        window.addEventListener('pointermove', update, { passive: true });
    }

    // ============================================
    // 启动
    // ============================================
    async function init() {
        document.documentElement.classList.add('is-loading');

        const data = await loadData();
        appPassword = data.password || '';
        memoriesData = data.memories || [];

        createParticles();
        setupPointerGlow();
        initCover(data);
        setupMusic(data);
        renderMemories(memoriesData);

        if (!appPassword || sessionStorage.getItem('memories_unlocked') === 'true') {
            hidePasswordScreen();
        }

        if (window.location.hash === '#memories' && sessionStorage.getItem('memories_unlocked') === 'true') {
            setTimeout(enterMemories, 260);
        }

        requestAnimationFrame(() => {
            document.documentElement.classList.remove('is-loading');
            document.documentElement.classList.add('is-ready');
        });
    }

    init().catch(err => {
        console.error('初始化失败:', err);
        initCover({});
        renderMemories([]);
        hidePasswordScreen();
    });
})();
