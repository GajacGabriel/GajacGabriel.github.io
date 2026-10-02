// Portfolio Gabriel Gajac — script commun
// langue, barre du haut, ouverture, carrousel, vidéos de fond, modale vidéo, lightbox, sommaire, apparitions, compteurs
(function () {
    var root = document.documentElement;
    root.classList.add('js');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var KEY = 'portfolioLang';

    // ------------------------------------------------------------------
    // Langue FR / EN (mémorisée par visiteur, ?lang=fr|en l'emporte)
    // ------------------------------------------------------------------
    function setLang(lang) {
        lang = lang === 'fr' ? 'fr' : 'en';
        document.body.classList.toggle('en', lang === 'en');
        document.body.classList.toggle('fr', lang === 'fr');
        root.lang = lang;
        document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-btn') === lang));
        });
        try { localStorage.setItem(KEY, lang); } catch (e) { /* stockage indisponible */ }
    }
    var saved = 'en';
    try { saved = localStorage.getItem(KEY) || 'en'; } catch (e) { /* stockage indisponible */ }
    var forced = new URLSearchParams(location.search).get('lang');
    if (forced === 'fr' || forced === 'en') saved = forced;
    setLang(saved);
    window.switchLang = setLang;
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-lang-btn]');
        if (btn) setLang(btn.getAttribute('data-lang-btn'));
    });

    // ------------------------------------------------------------------
    // Barre du haut : transparente sur les visuels plein écran, opaque ensuite
    // ------------------------------------------------------------------
    var topbar = document.querySelector('.topbar');
    var heroLike = document.querySelector('.stage, .p-hero');
    function onScroll() {
        if (!topbar) return;
        topbar.classList.toggle('solid', !heroLike || window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ------------------------------------------------------------------
    // Vidéos YouTube en fond (muettes, en boucle) — bureau uniquement
    // ------------------------------------------------------------------
    var conn = navigator.connection || {};
    var canVideo = !reduced && !conn.saveData && window.matchMedia('(min-width: 900px) and (pointer: fine)').matches;
    function mountVideo(host) {
        if (!canVideo || !host) return;
        var box = host.querySelector('.bg-video');
        if (!box || box.querySelector('iframe')) return;
        clearTimeout(box._t);
        box._t = setTimeout(function () {
            var id = box.getAttribute('data-yt');
            var f = document.createElement('iframe');
            f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&loop=1&playlist=' + id +
                '&controls=0&disablekb=1&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&fs=0';
            f.allow = 'autoplay; encrypted-media';
            f.tabIndex = -1;
            f.title = '';
            f.setAttribute('aria-hidden', 'true');
            f.addEventListener('load', function () {
                // laisse YouTube masquer son titre avant d'afficher la vidéo
                box._r = setTimeout(function () { box.classList.add('ready'); }, 1800);
            });
            box.appendChild(f);
        }, 900);
    }
    function unmountVideo(host) {
        var box = host && host.querySelector('.bg-video');
        if (!box) return;
        clearTimeout(box._t); clearTimeout(box._r);
        box.classList.remove('ready');
        setTimeout(function () {
            if (!host.classList.contains('is-active')) {
                var f = box.querySelector('iframe');
                if (f) f.remove();
            }
        }, 1100);
    }
    var pHero = document.querySelector('.p-hero');
    if (pHero) { pHero.classList.add('is-active'); mountVideo(pHero); }

    // ------------------------------------------------------------------
    // Modale vidéo (avec le son)
    // ------------------------------------------------------------------
    var vmodal = null, onModal = null;
    function openVideo(id) {
        if (!vmodal) {
            vmodal = document.createElement('div');
            vmodal.className = 'vmodal';
            vmodal.setAttribute('role', 'dialog');
            vmodal.setAttribute('aria-modal', 'true');
            vmodal.innerHTML = '<button type="button" aria-label="Fermer / Close">✕</button><div class="vmodal-box"><div class="video"></div></div>';
            document.body.appendChild(vmodal);
            vmodal.addEventListener('click', function (e) { if (!e.target.closest('.video')) closeVideo(); });
        }
        vmodal.querySelector('.video').innerHTML = '<iframe src="https://www.youtube.com/embed/' + id +
            '?autoplay=1&rel=0" title="Video" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
        vmodal.classList.add('open');
        if (onModal) onModal(true);
    }
    function closeVideo() {
        if (!vmodal || !vmodal.classList.contains('open')) return;
        vmodal.classList.remove('open');
        vmodal.querySelector('.video').innerHTML = '';
        if (onModal) onModal(false);
    }
    document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-play]');
        if (b) { e.preventDefault(); openVideo(b.getAttribute('data-play')); }
    });

    // ------------------------------------------------------------------
    // Carrousel plein écran
    // ------------------------------------------------------------------
    var stage = document.querySelector('.stage');
    var startCarousel = function () {};
    // points d'accroche remplis par le panneau de détail plus bas
    var carousel = { onPick: function () {}, onStep: function () {}, onStart: function () {}, go: function () {}, lock: function () {}, slides: [] };
    if (stage) {
        var slides = Array.prototype.slice.call(stage.querySelectorAll('.slide'));
        var thumbs = Array.prototype.slice.call(stage.querySelectorAll('.thumb'));
        var countEl = stage.querySelector('[data-count]');
        var DUR = 8000, idx = 0, elapsed = 0, last = 0, paused = false, modalOpen = false, running = false, locked = false;
        // ?slide=N ouvre directement une diapositive (lien à partager vers un projet)
        var startAt = Math.max(0, Math.min(slides.length - 1, parseInt(new URLSearchParams(location.search).get('slide'), 10) || 0));

        function pad(n) { return (n < 10 ? '0' : '') + n; }
        function paintBars() {
            thumbs.forEach(function (t, j) {
                var bar = t.querySelector('.t-bar i');
                if (!bar) return;
                bar.style.width = j < idx ? '100%' : j > idx ? '0%' : (reduced ? 100 : Math.min(100, elapsed / DUR * 100)) + '%';
            });
        }
        function go(i) {
            i = (i + slides.length) % slides.length;
            if (i !== idx) {
                slides[idx].classList.remove('is-active');
                slides[idx].setAttribute('aria-hidden', 'true');
                unmountVideo(slides[idx]);
            }
            idx = i;
            elapsed = 0;
            var s = slides[idx];
            s.classList.add('is-active');
            s.removeAttribute('aria-hidden');
            thumbs.forEach(function (t, j) {
                t.classList.toggle('is-active', j === idx);
                t.setAttribute('aria-current', j === idx ? 'true' : 'false');
            });
            root.style.setProperty('--acc', s.getAttribute('data-accent'));
            if (countEl) countEl.innerHTML = pad(idx + 1) + '<small> / ' + pad(slides.length) + '</small>';
            mountVideo(s);
            paintBars();
        }
        function tick(now) {
            var dt = last ? now - last : 0;
            last = now;
            var visible = window.scrollY < window.innerHeight * 0.6;
            if (running && !reduced && !locked && !paused && !modalOpen && !document.hidden && visible) {
                elapsed += dt;
                if (elapsed >= DUR) go(idx + 1);
            }
            paintBars();
            requestAnimationFrame(tick);
        }
        onModal = function (open) { modalOpen = open; };

        // clic sur une vignette = choix du visiteur : on change aussi le détail sous le carrousel
        thumbs.forEach(function (t, j) { t.addEventListener('click', function () { go(j); carousel.onPick(slides[j].getAttribute('data-key')); }); });
        // flèches : si un détail est ouvert, il suit
        stage.querySelectorAll('[data-dir]').forEach(function (b) {
            b.addEventListener('click', function () { go(idx + Number(b.getAttribute('data-dir'))); carousel.onStep(slides[idx].getAttribute('data-key')); });
        });
        stage.querySelectorAll('[data-next]').forEach(function (b) {
            b.addEventListener('click', function (e) { e.preventDefault(); go(idx + 1); });
        });
        // pause au survol du texte
        stage.querySelectorAll('.slide-content').forEach(function (c) {
            c.addEventListener('mouseenter', function () { paused = true; });
            c.addEventListener('mouseleave', function () { paused = false; });
        });
        // clavier
        document.addEventListener('keydown', function (e) {
            if (window.scrollY > window.innerHeight * 0.6 || (vmodal && vmodal.classList.contains('open'))) return;
            if (e.key === 'ArrowRight') { go(idx + 1); carousel.onStep(slides[idx].getAttribute('data-key')); }
            if (e.key === 'ArrowLeft') { go(idx - 1); carousel.onStep(slides[idx].getAttribute('data-key')); }
        });
        // glisser (tactile ou souris)
        var sx = null, sy = 0;
        stage.addEventListener('pointerdown', function (e) {
            if (e.target.closest('a, button')) return;
            sx = e.clientX; sy = e.clientY;
        });
        stage.addEventListener('pointerup', function (e) {
            if (sx === null) return;
            var dx = e.clientX - sx, dy = e.clientY - sy;
            sx = null;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { go(idx + (dx < 0 ? 1 : -1)); carousel.onStep(slides[idx].getAttribute('data-key')); }
        });
        // parallaxe légère à la souris
        if (!reduced && window.matchMedia('(pointer: fine)').matches) {
            var raf = 0;
            stage.addEventListener('mousemove', function (e) {
                if (raf) return;
                raf = requestAnimationFrame(function () {
                    raf = 0;
                    var r = stage.getBoundingClientRect();
                    stage.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
                    stage.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
                });
            });
        }

        slides.forEach(function (s, j) { if (j) s.setAttribute('aria-hidden', 'true'); });
        // La première diapositive ne s'anime qu'une fois l'ouverture terminée
        startCarousel = function () {
            if (running) return;
            running = true;
            go(startAt);
            requestAnimationFrame(tick);
            setTimeout(function () { carousel.onStart(); }, 0);
        };
        carousel.go = function (key) {
            for (var j = 0; j < slides.length; j++) if (slides[j].getAttribute('data-key') === key) { if (running) go(j); else startAt = j; return; }
        };
        carousel.lock = function (v) { locked = v; elapsed = 0; stage.classList.toggle('has-detail', v); };
        carousel.slides = slides;
    }

    // ------------------------------------------------------------------
    // Écran d'ouverture (une fois par visite)
    // ------------------------------------------------------------------
    var boot = document.querySelector('.boot');
    var bootSeen = false;
    try { bootSeen = !!sessionStorage.getItem('booted'); } catch (e) { /* stockage indisponible */ }
    var deepLink = new URLSearchParams(location.search).has('slide') || /^#p-/.test(location.hash);
    if (boot && !bootSeen && !reduced && !deepLink) {
        var finished = false;
        var finish = function () {
            if (finished) return;
            finished = true;
            try { sessionStorage.setItem('booted', '1'); } catch (e) { /* stockage indisponible */ }
            boot.classList.add('done');
            setTimeout(startCarousel, 250);
            setTimeout(function () { boot.remove(); }, 1000);
        };
        boot.addEventListener('click', finish);
        document.addEventListener('keydown', finish, { once: true });
        setTimeout(finish, 1500);
    } else {
        if (boot) boot.remove();
        startCarousel();
    }

    // ------------------------------------------------------------------
    // Lightbox sur les images .zoomable (délégation : marche aussi pour le contenu chargé)
    // ------------------------------------------------------------------
    var lbox = null;
    function openImage(img) {
        if (!lbox) {
            lbox = document.createElement('div');
            lbox.className = 'lightbox';
            lbox.setAttribute('role', 'dialog');
            lbox.setAttribute('aria-modal', 'true');
            lbox.innerHTML = '<button type="button" aria-label="Fermer / Close">✕</button><img alt="">';
            document.body.appendChild(lbox);
            lbox.addEventListener('click', function () { lbox.classList.remove('open'); });
        }
        var big = lbox.querySelector('img');
        big.src = img.src; big.alt = img.alt;
        lbox.classList.add('open');
    }
    function prepZoom(scope) { scope.querySelectorAll('img.zoomable').forEach(function (img) { img.setAttribute('tabindex', '0'); }); }
    prepZoom(document);
    document.addEventListener('click', function (e) { var img = e.target.closest('img.zoomable'); if (img) openImage(img); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.matches && e.target.matches('img.zoomable')) openImage(e.target);
        if (e.key !== 'Escape') return;
        closeVideo();
        if (lbox) lbox.classList.remove('open');
    });

    // ------------------------------------------------------------------
    // Sommaire : surligne la section en cours
    // ------------------------------------------------------------------
    var spies = [];
    function bindToc(scope) {
        var tocLinks = scope.querySelectorAll('.toc a[href^="#"]');
        if (!tocLinks.length || !('IntersectionObserver' in window)) return;
        var map = {};
        tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    tocLinks.forEach(function (a) { a.classList.remove('active'); });
                    var a = map[en.target.id];
                    if (a) a.classList.add('active');
                }
            });
        }, { rootMargin: '-30% 0px -60% 0px' });
        Object.keys(map).forEach(function (id) {
            var el = scope.querySelector('#' + id);
            if (el) spy.observe(el);
        });
        spies.push(spy);
    }
    bindToc(document);

    // ------------------------------------------------------------------
    // Détail du projet sous le carrousel : s'ouvre seulement sur un clic
    // (vignette, « Étude de cas », tuile ou pastille). L'étude de cas est lue
    // dans la page du projet, qui reste la seule source du contenu.
    // ------------------------------------------------------------------
    var pd = document.querySelector('.pd');
    if (pd) {
        var pdBody = pd.querySelector('.pd-body');
        var pdTitle = pd.querySelector('.pd-title');
        var pdLabel = pd.querySelector('[data-pd-label]');
        var pdFull = pd.querySelector('[data-pd-full]');
        var pdPlay = pd.querySelector('[data-pd-play]');
        var pill = document.querySelector('.detail-pill');
        var overview = document.getElementById('overview');
        var cache = {}, current = null, ticket = 0;
        var canFetch = !!window.fetch && location.protocol !== 'file:';

        var info = function (key) {
            var s = null;
            carousel.slides.forEach(function (x) { if (x.getAttribute('data-key') === key) s = x; });
            if (!s) return null;
            return { href: s.getAttribute('data-href'), acc: s.getAttribute('data-accent'), fr: s.getAttribute('data-label-fr'), en: s.getAttribute('data-label-en') };
        };
        var getDoc = function (href) {
            if (!cache[href]) {
                cache[href] = fetch(href).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
                    .then(function (t) { return new DOMParser().parseFromString(t, 'text/html'); });
            }
            return cache[href];
        };
        var fill = function (nodes) {
            spies.forEach(function (sp) { sp.disconnect(); });
            spies = [];
            pdBody.innerHTML = '';
            nodes.forEach(function (n) { if (n) pdBody.appendChild(n); });
            prepZoom(pdBody);
            bindInview(pdBody);
            bindToc(document);
            requestAnimationFrame(function () { pdBody.classList.remove('swap'); pd.classList.remove('loading'); });
        };
        var buildFromDoc = function (doc) {
            var hero = doc.querySelector('.p-hero-inner');
            var intro = document.createElement('div');
            intro.className = 'pd-intro';
            hero.querySelectorAll('.lead').forEach(function (l) { intro.appendChild(l.cloneNode(true)); });
            var stats = hero.querySelector('.p-stats');
            if (stats) intro.appendChild(stats.cloneNode(true));
            var layout = doc.querySelector('.p-layout').cloneNode(true);
            layout.querySelectorAll('.p-next').forEach(function (n) { n.remove(); });
            var play = hero.querySelector('[data-play]');
            return { nodes: [intro, layout], title: hero.querySelector('h1').innerHTML, play: play && play.getAttribute('data-play') };
        };
        var reveal = function (scroll) {
            pd.hidden = false;
            if (scroll) pd.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        };
        var closeDetail = function (opts) {
            opts = opts || {};
            if (pd.hidden) return;
            var wasBelow = window.scrollY > 40;
            ticket++;
            current = null;
            pd.hidden = true;
            pdBody.innerHTML = '';
            if (overview) overview.hidden = false;
            if (pill) pill.hidden = true;
            carousel.lock(false);
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* hors http */ }
            if (wasBelow && !opts.keepScroll) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
        };
        var openDetail = function (key, opts) {
            opts = opts || {};
            if (!key) { closeDetail(); return; }
            var it = info(key);
            if (!it) return;
            if (key !== 'eden' && !canFetch) { location.href = it.href; return; }
            if (opts.sync !== false) carousel.go(key);
            carousel.lock(true);
            if (overview) overview.hidden = true;
            pd.style.setProperty('--accent', it.acc);
            pdLabel.innerHTML = '<span class="lang-fr">' + it.fr + '</span><span class="lang-en">' + it.en + '</span>';
            if (pill) pill.hidden = false;
            try { history.replaceState(null, '', '#p-' + key); } catch (e) { /* hors http */ }
            if (current === key) { reveal(opts.scroll); return; }
            current = key;
            var my = ++ticket;
            pd.classList.add('loading');
            pdBody.classList.add('swap');
            reveal(opts.scroll);

            if (key === 'eden') {
                var card = document.querySelector('#experience .xp-card');
                pdTitle.innerHTML = 'Eden Games';
                pdFull.hidden = true;
                pdPlay.hidden = true;
                setTimeout(function () {
                    if (my !== ticket) return;
                    var c = card.cloneNode(true);
                    c.classList.remove('reveal');
                    c.classList.add('in');
                    fill([c]);
                }, 120);
                return;
            }
            pdFull.hidden = false;
            pdFull.href = it.href;
            getDoc(it.href).then(function (doc) {
                if (my !== ticket) return;
                var b = buildFromDoc(doc);
                pdTitle.innerHTML = b.title;
                pdPlay.hidden = !b.play;
                if (b.play) pdPlay.setAttribute('data-play', b.play);
                fill(b.nodes);
            }).catch(function () { location.href = it.href; });
        };

        carousel.onPick = function (key) { openDetail(key, { sync: false, scroll: false }); };
        carousel.onStep = function (key) { if (!pd.hidden) openDetail(key, { sync: false, scroll: false }); };
        carousel.onStart = function () {
            var m = /^#p-([\w-]+)$/.exec(location.hash);
            if (m) setTimeout(function () { openDetail(m[1], { scroll: true }); }, 300);
        };
        pd.querySelector('[data-pd-close]').addEventListener('click', function () { closeDetail(); });
        // un lien du menu vers une section de l'aperçu (Expérience, Projets, Compétences) referme le détail d'abord
        document.addEventListener('click', function (e) {
            var a = e.target.closest('a[href^="#"]');
            if (!a || pd.hidden || !overview) return;
            var id = a.getAttribute('href').slice(1);
            var target = id && document.getElementById(id);
            if (!target || !overview.contains(target)) return;
            e.preventDefault();
            closeDetail({ keepScroll: true });
            requestAnimationFrame(function () { target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
        });
        if (pill) pill.addEventListener('click', function () { reveal(true); });
        document.addEventListener('click', function (e) {
            var a = e.target.closest('[data-open]');
            if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
            e.preventDefault();
            openDetail(a.getAttribute('data-open'), { scroll: true });
        });
    }

    // ------------------------------------------------------------------
    // Apparitions + compteurs au défilement
    // ------------------------------------------------------------------
    function countUp(el) {
        var to = Number(el.getAttribute('data-count-to'));
        if (reduced) { el.firstChild.nodeValue = to; return; }
        var t0 = performance.now(), D = 1400;
        (function step(now) {
            var p = Math.min(1, (now - t0) / D);
            el.firstChild.nodeValue = Math.round(to * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        })(t0);
    }
    // vidéos muettes en boucle : ne jouent que quand elles sont à l'écran (data-inview)
    function bindInview(scope) {
        var vids = scope.querySelectorAll('video[data-inview]');
        if (!vids.length || !('IntersectionObserver' in window)) return;
        var vio = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                var v = en.target;
                if (reduced) { v.controls = true; return; }
                if (en.isIntersecting) { v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () { v.controls = true; }); }
                else v.pause();
            });
        }, { threshold: 0.25 });
        vids.forEach(function (v) { vio.observe(v); });
    }
    bindInview(document);
    var reveals = document.querySelectorAll('.reveal, [data-count-to]');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                en.target.classList.add('in');
                if (en.target.hasAttribute('data-count-to')) countUp(en.target);
                io.unobserve(en.target);
            });
        }, { rootMargin: '0px 0px -8% 0px' });
        reveals.forEach(function (el) { io.observe(el); });
    } else {
        reveals.forEach(function (el) { el.classList.add('in'); });
    }
})();
