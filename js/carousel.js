(function () {
  window.EPILEG = window.EPILEG || {};

  const PERSPECTIVE = 1200;
  const WHEEL_STEP_SENSITIVITY = 0.0028;
  const WHEEL_SETTLE_DELAY_MS = 130;

  class VerticalCarousel3D {
    constructor(options) {
      this.movies = options.movies || [];
      this.stage = options.stage;
      this.track = options.track;
      this.listEl = options.listEl;
      this.counterEl = options.counterEl;
      this.creditsEl = options.creditsEl;
      this.liveEl = options.liveEl;
      this.prevBtn = options.prevBtn;
      this.nextBtn = options.nextBtn;

      this.N = this.movies.length;
      this.currentPos = 0;
      this.targetPos = 0;
      this.activeIndex = -1;
      this.enabled = false;
      this.rafId = null;
      this.lastTime = 0;

      this.cardW = 560;
      this.cardH = 315;
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.wheelTimer = null;
      this.wheelStartIndex = 0;
      this.wheelActive = false;
      this.lastWheelDelta = 0;

      this.touchStartY = 0;
      this.touchStartPos = 0;
      this.touchDeltaY = 0;
      this.isTouching = false;

      this.items = [];
      this.listButtons = [];

      this.buildDOM();
      this.bindEvents();
      this.measure();
      this.render();
      this.updateActiveUI();
    }

    buildDOM() {
      const trackFrag = document.createDocumentFragment();
      const listFrag = document.createDocumentFragment();

      this.movies.forEach((movie, idx) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'carousel-item';
        item.dataset.index = String(idx);
        item.dataset.side = idx % 2 === 0 ? 'left' : 'right';
        item.setAttribute('aria-label', `${movie.title} — ${movie.director} (${movie.year})`);

        const frame = document.createElement('div');
        frame.className = 'carousel-frame';

        const img = document.createElement('img');
        img.src = movie.image;
        img.alt = movie.alt;
        img.loading = 'eager';
        img.decoding = 'async';

        const num = document.createElement('span');
        num.className = 'carousel-num';
        num.textContent = movie.indexLabel;
        num.setAttribute('aria-hidden', 'true');

        frame.appendChild(img);
        item.appendChild(frame);
        item.appendChild(num);

        item.addEventListener('click', () => {
          if (!this.enabled) return;
          this.goToIndex(idx);
        });

        trackFrag.appendChild(item);
        this.items.push(item);

        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'movies-list-btn';
        btn.textContent = movie.title;
        btn.dataset.index = String(idx);
        btn.addEventListener('click', () => {
          if (!this.enabled) return;
          this.goToIndex(idx);
        });

        li.appendChild(btn);
        listFrag.appendChild(li);
        this.listButtons.push(btn);
      });

      this.track.appendChild(trackFrag);
      this.listEl.appendChild(listFrag);
    }

    bindEvents() {
      this.onWheel = this.handleWheel.bind(this);
      this.onKeyDown = this.handleKeyDown.bind(this);
      this.onTouchStart = this.handleTouchStart.bind(this);
      this.onTouchMove = this.handleTouchMove.bind(this);
      this.onTouchEnd = this.handleTouchEnd.bind(this);
      this.onResize = () => {
        this.measure();
        this.render();
      };

      this.stage.addEventListener('wheel', this.onWheel, { passive: false });
      window.addEventListener('keydown', this.onKeyDown);
      this.stage.addEventListener('touchstart', this.onTouchStart, { passive: true });
      this.stage.addEventListener('touchmove', this.onTouchMove, { passive: false });
      this.stage.addEventListener('touchend', this.onTouchEnd, { passive: true });
      this.stage.addEventListener('touchcancel', this.onTouchEnd, { passive: true });
      window.addEventListener('resize', this.onResize);

      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => {
          if (!this.enabled) return;
          this.step(-1);
        });
      }

      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => {
          if (!this.enabled) return;
          this.step(1);
        });
      }

      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionQuery.addEventListener) {
        motionQuery.addEventListener('change', (e) => {
          this.prefersReducedMotion = e.matches;
          this.render();
        });
      }
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      if (!this.enabled) {
        clearTimeout(this.wheelTimer);
        this.wheelActive = false;
      } else {
        this.measure();
        this.render();
      }
    }

    measure() {
      const rect = this.stage.getBoundingClientRect();
      const stageW = rect.width || window.innerWidth;
      const stageH = rect.height || window.innerHeight;
      const isCompact = stageW <= 900;

      const maxHByHeight = stageH * (isCompact ? 0.30 : 0.36);
      const maxHByWidth = stageW * (isCompact ? 0.80 : 0.44) * (9 / 16);

      this.cardH = Math.max(120, Math.min(maxHByHeight, maxHByWidth));
      this.cardW = this.cardH * (16 / 9);

      this.stage.style.setProperty('--card-w', `${this.cardW.toFixed(1)}px`);
      this.stage.style.setProperty('--card-h', `${this.cardH.toFixed(1)}px`);
      document.documentElement.style.setProperty('--card-w', `${this.cardW.toFixed(1)}px`);
      document.documentElement.style.setProperty('--card-h', `${this.cardH.toFixed(1)}px`);
    }

    step(delta) {
      if (this.N === 0) return;
      const baseIndex = Math.round(this.targetPos);
      this.targetPos = baseIndex + delta;
      this.startLoop();
    }

    goToIndex(targetIdx) {
      if (this.N === 0) return;
      const baseIndex = Math.round(this.targetPos);
      const currentWrapped = ((baseIndex % this.N) + this.N) % this.N;
      let delta = targetIdx - currentWrapped;
      if (delta > this.N / 2) delta -= this.N;
      if (delta < -this.N / 2) delta += this.N;
      this.targetPos = baseIndex + delta;
      this.startLoop();
    }

    handleWheel(e) {
      if (!this.enabled) return;
      e.preventDefault();

      let deltaY = e.deltaY;
      if (e.deltaMode === 1) deltaY *= 32;
      else if (e.deltaMode === 2) deltaY *= 400;

      const clamped = Math.max(-180, Math.min(180, deltaY));
      if (clamped === 0) return;

      if (!this.wheelActive) {
        this.wheelActive = true;
        this.wheelStartIndex = Math.round(this.targetPos);
      }

      this.lastWheelDelta = clamped;
      this.targetPos += clamped * WHEEL_STEP_SENSITIVITY;
      this.startLoop();

      clearTimeout(this.wheelTimer);
      this.wheelTimer = setTimeout(() => {
        this.wheelActive = false;
        const rounded = Math.round(this.targetPos);
        if (rounded !== this.wheelStartIndex) {
          this.targetPos = rounded;
        } else if (Math.abs(this.targetPos - this.wheelStartIndex) > 0.10) {
          this.targetPos = this.wheelStartIndex + Math.sign(this.lastWheelDelta);
        } else {
          this.targetPos = this.wheelStartIndex;
        }
        this.startLoop();
      }, WHEEL_SETTLE_DELAY_MS);
    }

    handleKeyDown(e) {
      if (!this.enabled) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          this.step(1);
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          this.step(-1);
          break;
        case 'Home':
          e.preventDefault();
          this.goToIndex(0);
          break;
        case 'End':
          e.preventDefault();
          this.goToIndex(this.N - 1);
          break;
        default:
          break;
      }
    }

    handleTouchStart(e) {
      if (!this.enabled || e.touches.length !== 1) return;
      this.isTouching = true;
      this.touchStartY = e.touches[0].clientY;
      this.touchStartPos = this.targetPos;
      this.touchDeltaY = 0;
    }

    handleTouchMove(e) {
      if (!this.enabled || !this.isTouching || e.touches.length !== 1) return;
      e.preventDefault();
      const dy = this.touchStartY - e.touches[0].clientY;
      this.touchDeltaY = dy;
      this.targetPos = this.touchStartPos + dy / Math.max(180, this.cardH * 0.9);
      this.startLoop();
    }

    handleTouchEnd() {
      if (!this.isTouching) return;
      this.isTouching = false;
      const startIndex = Math.round(this.touchStartPos);
      const rounded = Math.round(this.targetPos);
      if (rounded !== startIndex) {
        this.targetPos = rounded;
      } else if (Math.abs(this.touchDeltaY) > 28) {
        this.targetPos = startIndex + Math.sign(this.touchDeltaY);
      } else {
        this.targetPos = startIndex;
      }
      this.startLoop();
    }

    startLoop() {
      if (this.prefersReducedMotion) {
        this.currentPos = this.targetPos;
        this.render();
        this.updateActiveUI();
        return;
      }

      if (this.rafId !== null) return;
      this.lastTime = performance.now();
      const tick = (now) => {
        const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
        this.lastTime = now;

        const diff = this.targetPos - this.currentPos;
        if (Math.abs(diff) < 0.0004) {
          this.currentPos = this.targetPos;
          this.render();
          this.updateActiveUI();
          this.rafId = null;
          return;
        }

        const factor = 1 - Math.exp(-11 * dt);
        this.currentPos += diff * factor;
        this.render();
        this.updateActiveUI();
        this.rafId = requestAnimationFrame(tick);
      };

      this.rafId = requestAnimationFrame(tick);
    }

    render() {
      const N = this.N;
      if (N === 0) return;

      for (let i = 0; i < N; i += 1) {
        const item = this.items[i];
        let d = ((i - this.currentPos) % N + N) % N;
        if (d > N / 2) d -= N;

        const absD = Math.abs(d);
        if (absD > 2.65) {
          item.style.opacity = '0';
          item.style.visibility = 'hidden';
          item.style.pointerEvents = 'none';
          item.classList.remove('is-center');
          continue;
        }

        const z = -420 * Math.pow(absD, 1.25);
        const s = PERSPECTIVE / (PERSPECTIVE - z);
        const yProj = Math.sign(d) * this.cardH * (1.08 * absD - 0.14 * absD * Math.min(absD, 3.0));
        const yWorld = yProj / s;
        const rx = this.prefersReducedMotion ? 0 : -Math.sign(d) * Math.min(absD * 20, 62);

        const opacity = absD <= 1
          ? (1 - absD * 0.08)
          : Math.max(0, 0.92 - (absD - 1) * 0.56);

        item.style.visibility = 'visible';
        item.style.pointerEvents = 'auto';
        item.style.opacity = opacity.toFixed(3);
        item.style.zIndex = String(Math.round(100 - absD * 20));
        item.style.transform = `translate3d(-50%, calc(-50% + ${yWorld.toFixed(2)}px), ${z.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg)`;

        if (absD < 0.35) {
          item.classList.add('is-center');
        } else {
          item.classList.remove('is-center');
        }
      }
    }

    updateActiveUI() {
      if (this.N === 0) return;
      const idx = ((Math.round(this.currentPos) % this.N) + this.N) % this.N;
      if (idx === this.activeIndex) return;

      this.activeIndex = idx;
      const movie = this.movies[idx];

      this.listButtons.forEach((btn, i) => {
        const active = i === idx;
        btn.classList.toggle('is-active', active);
        if (active) {
          btn.setAttribute('aria-current', 'true');
        } else {
          btn.removeAttribute('aria-current');
        }
      });

      if (this.counterEl) {
        const cur = String(idx + 1).padStart(2, '0');
        const tot = String(this.N).padStart(2, '0');
        this.counterEl.textContent = `${cur} / ${tot}`;
      }

      if (this.creditsEl) {
        const cycleNum = movie.cycle || (Math.floor(idx / 4) + 1);
        const cycleNames = {
          1: 'CICLE 01: CONTRA L’OBLIT',
          2: 'CICLE 02: PANTALLA DE FUM',
          3: 'CICLE 03: LA LÍNIA INVISIBLE'
        };
        const cycleLabel = cycleNames[cycleNum] || `CICLE 0${cycleNum}`;
        this.creditsEl.innerHTML = `<span class="meta-director-year">${movie.director}, ${movie.year}</span><span class="meta-cycle">${cycleLabel}</span>`;
      }

      if (this.liveEl) {
        const cycleNum = movie.cycle || (Math.floor(idx / 4) + 1);
        const cycleNames = {
          1: 'CICLE 01: CONTRA L’OBLIT',
          2: 'CICLE 02: PANTALLA DE FUM',
          3: 'CICLE 03: LA LÍNIA INVISIBLE'
        };
        const cycleLabel = cycleNames[cycleNum] || `CICLE 0${cycleNum}`;
        this.liveEl.textContent = `${movie.title}, ${movie.director} (${movie.year}), ${cycleLabel}`;
      }
    }
  }

  window.EPILEG.VerticalCarousel3D = VerticalCarousel3D;
})();
