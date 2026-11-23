(function () {
  window.EPILEG = window.EPILEG || {};

  const SLIDE_OUT_MS = 160;

  class CyclesDeck {
    constructor(options) {
      this.cycles = options.cycles || [];
      this.slideEl = options.slideEl;
      this.tagEl = options.tagEl;
      this.stripTrack = options.stripTrack;
      this.titleEl = options.titleEl;
      this.descriptionEl = options.descriptionEl;
      this.indexLeftEl = options.indexLeftEl;
      this.indexRightEl = options.indexRightEl;
      this.liveEl = options.liveEl;
      this.prevBtn = options.prevBtn;
      this.nextBtn = options.nextBtn;

      this.N = this.cycles.length;
      this.currentIndex = 0;
      this.enabled = false;
      this.isTransitioningCycle = false;

      this.cycleOutTimer = null;

      this.touchStartX = 0;
      this.touchStartY = 0;
      this.isTouchingSlide = false;

      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.bindEvents();
      this.renderCycle(this.currentIndex, false);
    }

    bindEvents() {
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', (e) => {
          if (!this.enabled) return;
          e.preventDefault();
          this.stepCycle(-1);
        });
      }

      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', (e) => {
          if (!this.enabled) return;
          e.preventDefault();
          this.stepCycle(1);
        });
      }

      if (this.slideEl) {
        this.slideEl.addEventListener(
          'touchstart',
          (e) => {
            if (!this.enabled || e.touches.length !== 1) return;
            this.isTouchingSlide = true;
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
          },
          { passive: true }
        );

        this.slideEl.addEventListener(
          'touchend',
          (e) => {
            if (!this.enabled || !this.isTouchingSlide) return;
            this.isTouchingSlide = false;
            const touch = e.changedTouches && e.changedTouches[0];
            if (!touch) return;
            const dx = touch.clientX - this.touchStartX;
            const dy = touch.clientY - this.touchStartY;
            if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.4) {
              this.stepCycle(dx < 0 ? 1 : -1);
            }
          },
          { passive: true }
        );
      }

      window.addEventListener('keydown', (e) => {
        if (!this.enabled) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.stepCycle(1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.stepCycle(-1);
        }
      });

      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionQuery.addEventListener) {
        motionQuery.addEventListener('change', (e) => {
          this.prefersReducedMotion = e.matches;
        });
      }
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      if (!this.enabled) {
        clearTimeout(this.cycleOutTimer);
        this.isTransitioningCycle = false;
        if (this.slideEl) {
          this.slideEl.classList.remove(
            'is-exiting-left',
            'is-exiting-right',
            'is-entering-from-right',
            'is-entering-from-left'
          );
        }
      }
    }

    stepCycle(delta) {
      if (this.N === 0 || this.isTransitioningCycle) return;
      const nextIndex = ((this.currentIndex + delta) % this.N + this.N) % this.N;
      this.stepCycleTo(nextIndex, delta);
    }

    goToCycle(targetIndex) {
      if (targetIndex < 0 || targetIndex >= this.N) return;
      if (targetIndex === this.currentIndex) {
        this.renderCycle(targetIndex, true);
        return;
      }
      const delta = targetIndex > this.currentIndex ? 1 : -1;
      this.stepCycleTo(targetIndex, delta);
    }

    stepCycleTo(nextIndex, delta) {
      if (this.N === 0 || this.isTransitioningCycle) return;

      if (this.prefersReducedMotion || !this.slideEl) {
        this.currentIndex = nextIndex;
        this.renderCycle(nextIndex, true);
        return;
      }

      this.isTransitioningCycle = true;

      const exitClass = delta >= 0 ? 'is-exiting-left' : 'is-exiting-right';
      const enterClass = delta >= 0 ? 'is-entering-from-right' : 'is-entering-from-left';

      this.slideEl.classList.add(exitClass);

      clearTimeout(this.cycleOutTimer);
      this.cycleOutTimer = setTimeout(() => {
        this.currentIndex = nextIndex;
        this.renderCycle(nextIndex, true);

        this.slideEl.classList.remove(exitClass);
        this.slideEl.classList.add(enterClass);
        void this.slideEl.offsetWidth;
        this.slideEl.classList.remove(enterClass);

        this.isTransitioningCycle = false;
      }, SLIDE_OUT_MS);
    }

    renderCycle(index, announce) {
      const cycle = this.cycles[index];
      if (!cycle) return;

      if (this.slideEl) {
        this.slideEl.dataset.cycleId = cycle.id;
      }

      if (this.tagEl) {
        this.tagEl.textContent = cycle.tag;
      }

      if (this.titleEl) {
        const frag = document.createDocumentFragment();
        cycle.titleLines.forEach((line) => {
          const span = document.createElement('span');
          span.className = 'cycle-title-line';
          span.textContent = line;
          frag.appendChild(span);
        });
        this.titleEl.textContent = '';
        this.titleEl.appendChild(frag);
      }

      if (this.descriptionEl) {
        this.descriptionEl.textContent = cycle.description;
      }

      if (this.indexLeftEl) {
        this.indexLeftEl.textContent = cycle.indexLabel;
      }

      if (this.indexRightEl) {
        const cur = String(index + 1).padStart(2, '0');
        const tot = String(this.N).padStart(2, '0');
        this.indexRightEl.textContent = `${cur} / ${tot}`;
      }

      if (this.stripTrack) {
        this.stripTrack.textContent = '';

        const frag = document.createDocumentFragment();
        (cycle.tiles || []).forEach((tile) => {
          const card = document.createElement('div');
          if (tile.type === 'tone') {
            card.className = 'cycle-tile cycle-tile--tone';
            card.style.backgroundColor = tile.color || '#CBC7BC';
            card.setAttribute('aria-hidden', 'true');
          } else if (tile.type === 'lightleak') {
            const variant = tile.variant || 'amber';
            card.className = `cycle-tile cycle-tile--lightleak cycle-tile--lightleak-${variant}`;
            card.setAttribute('aria-hidden', 'true');
            const grain = document.createElement('div');
            grain.className = 'cycle-tile-grain';
            card.appendChild(grain);
          } else {
            card.className = tile.filterClass ? `cycle-tile ${tile.filterClass}` : 'cycle-tile';
            const img = document.createElement('img');
            img.src = tile.src;
            img.alt = tile.alt || '';
            img.loading = 'eager';
            img.decoding = 'async';
            card.appendChild(img);
          }
          frag.appendChild(card);
        });
        this.stripTrack.appendChild(frag);
      }

      if (announce && this.liveEl) {
        this.liveEl.textContent = `${cycle.tag}: ${cycle.titleLines.join(' ')}`;
      }

      if (typeof this.onCycleChange === 'function') {
        this.onCycleChange(index);
      }
    }
  }

  window.EPILEG.CyclesDeck = CyclesDeck;
})();
