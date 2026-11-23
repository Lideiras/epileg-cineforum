(function () {
  window.EPILEG = window.EPILEG || {};

  const CYCLE_LABELS = {
    1: 'CICLE 01 · CONTRA L’OBLIT',
    2: 'CICLE 02 · PANTALLA DE FUM',
    3: 'CICLE 03 · LA LÍNIA INVISIBLE',
  };

  const CUSTOM_TICKET_IMAGES = {
    'el-pico': 'entradas/ticket-el-pico.jpg',
    '120-pulsaciones-por-minuto': 'entradas/ticket-120-pulsaciones-por-minuto.jpg',
    'romeria': 'entradas/ticket-romeria.jpg',
    'la-bola-negra': 'entradas/ticket-la-bola-negra.jpg',
    'network': 'entradas/ticket-network.jpg',
    'the-truman-show': 'entradas/ticket-the-truman-show.jpg',
    'fight-club': 'entradas/ticket-fight-club.jpg',
    'no-mires-arriba': 'entradas/ticket-no-mires-arriba.jpg',
    'modern-times': 'entradas/ticket-modern-times.jpg',
    'la-haine': 'entradas/ticket-la-haine.jpg',
    'i-daniel-blake': 'entradas/ticket-i-daniel-blake.jpg',
    'parasite': 'entradas/ticket-parasite.jpg',
  };

  class EntradesController {
    constructor(options) {
      this.movies = options.movies || [];
      this.listEl = options.listEl;
      this.envelopeEl = options.envelopeEl;
      this.ticketsStackEl = options.ticketsStackEl;
      this.qtyBtns = options.qtyBtns || [];
      this.reserveBtn = options.reserveBtn;
      this.statusEl = options.statusEl;

      this.primaryTitleEl = options.primaryTitleEl;
      this.primaryDirectorEl = options.primaryDirectorEl;
      this.primaryCycleEl = options.primaryCycleEl;
      this.primarySerialEl = options.primarySerialEl;
      this.primaryThumbEl = options.primaryThumbEl;
      this.primarySeatEl = options.primarySeatEl;
      this.primaryTicketEl = options.primaryTicketEl;
      this.primaryCustomImgEl = options.primaryCustomImgEl;

      this.secondaryTicketEl = options.secondaryTicketEl;
      this.secondaryCustomImgEl = options.secondaryCustomImgEl;
      this.secondaryTitleEl = options.secondaryTitleEl;
      this.secondarySerialEl = options.secondarySerialEl;

      this.selectedIndex = 0;
      this.quantity = 2;
      this.switchTimer = null;
      this.animTimer = null;
      this.isAnimating = false;
      this.movieButtons = [];
      this.preloadedImages = [];

      this.preloadTicketImages();
      this.buildList();
      this.bindEvents();
      this.updateTickets(false);
    }

    preloadTicketImages() {
      Object.values(CUSTOM_TICKET_IMAGES).forEach((src) => {
        const img = new Image();
        img.src = src;
        this.preloadedImages.push(img);
      });
    }

    buildList() {
      if (!this.listEl) return;
      const frag = document.createDocumentFragment();

      this.movies.forEach((movie, idx) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'entrades-movie-btn';
        btn.dataset.index = String(idx);

        const numSpan = document.createElement('span');
        numSpan.className = 'entrades-movie-num';
        numSpan.textContent = String(idx + 1).padStart(2, '0');

        const titleSpan = document.createElement('span');
        titleSpan.className = 'entrades-movie-title';
        titleSpan.textContent = movie.title;

        btn.appendChild(numSpan);
        btn.appendChild(titleSpan);

        btn.addEventListener('click', () => {
          this.selectMovie(idx);
        });

        li.appendChild(btn);
        frag.appendChild(li);
        this.movieButtons.push(btn);
      });

      this.listEl.appendChild(frag);
    }

    bindEvents() {
      if (this.ticketsStackEl && this.envelopeEl) {
        this.ticketsStackEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.isAnimating) return;
          if (this.envelopeEl.classList.contains('is-front')) {
            this.returnToEnvelope();
          } else {
            this.bringToFront();
          }
        });
      }

      if (this.envelopeEl) {
        this.envelopeEl.addEventListener('click', () => {
          if (this.isAnimating) return;
          if (this.envelopeEl.classList.contains('is-front')) {
            this.returnToEnvelope();
          } else if (this.envelopeEl.classList.contains('is-open')) {
            this.bringToFront();
          } else {
            this.envelopeEl.classList.add('is-open');
          }
        });
      }

      this.qtyBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const qty = parseInt(btn.dataset.qty, 10) || 1;
          this.setQuantity(qty);
        });
      });

      if (this.reserveBtn) {
        this.reserveBtn.addEventListener('click', () => {
          this.reserveBtn.classList.add('is-confirmed');
          this.reserveBtn.textContent =
            this.quantity === 2 ? '2 ENTRADES RESERVADES ✓' : 'ENTRADA RESERVADA ✓';
          if (this.statusEl) {
            const movie = this.movies[this.selectedIndex];
            this.statusEl.textContent = movie
              ? `Reserva preparada per a ${movie.title}`
              : 'Reserva preparada';
          }
        });
      }
    }

    setQuantity(qty) {
      this.quantity = qty === 1 ? 1 : 2;
      this.qtyBtns.forEach((btn) => {
        const isActive = parseInt(btn.dataset.qty, 10) === this.quantity;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });
      if (this.envelopeEl) {
        this.envelopeEl.dataset.qty = String(this.quantity);
      }
      this.resetReserveButton();
    }

    resetReserveButton() {
      if (this.reserveBtn) {
        this.reserveBtn.classList.remove('is-confirmed');
        this.reserveBtn.textContent =
          this.quantity === 2 ? 'RESERVAR 2 ENTRADES' : 'RESERVAR ENTRADA';
      }
      if (this.statusEl) {
        this.statusEl.textContent = '';
      }
    }

    bringToFront() {
      if (!this.envelopeEl || this.isAnimating) return;
      this.isAnimating = true;
      clearTimeout(this.animTimer);
      this.envelopeEl.classList.add('is-open');
      this.envelopeEl.classList.add('is-extracting');

      this.animTimer = setTimeout(() => {
        this.envelopeEl.classList.remove('is-extracting');
        this.envelopeEl.classList.add('is-front');
        this.animTimer = setTimeout(() => {
          this.isAnimating = false;
        }, 320);
      }, 260);
    }

    returnToEnvelope() {
      if (!this.envelopeEl || this.isAnimating) return;
      this.isAnimating = true;
      clearTimeout(this.animTimer);
      this.envelopeEl.classList.remove('is-front');
      this.envelopeEl.classList.add('is-returning');

      this.animTimer = setTimeout(() => {
        this.envelopeEl.classList.remove('is-returning');
        this.animTimer = setTimeout(() => {
          this.isAnimating = false;
        }, 320);
      }, 260);
    }

    selectMovie(index) {
      if (index < 0 || index >= this.movies.length) return;
      this.selectedIndex = index;
      this.resetReserveButton();
      this.updateTickets(true);
    }

    updateTickets(animate) {
      const movie = this.movies[this.selectedIndex];
      if (!movie) return;

      this.movieButtons.forEach((btn, idx) => {
        const active = idx === this.selectedIndex;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-current', active ? 'true' : 'false');
      });

      const applyContent = () => {
        const customImg = CUSTOM_TICKET_IMAGES[movie.id];
        const hasCustom = Boolean(customImg);

        if (this.primaryTicketEl) {
          this.primaryTicketEl.classList.toggle('has-custom-ticket', hasCustom);
        }
        if (this.secondaryTicketEl) {
          this.secondaryTicketEl.classList.toggle('has-custom-ticket', hasCustom);
        }

        if (this.primaryCustomImgEl) {
          if (hasCustom) {
            this.primaryCustomImgEl.src = customImg;
            this.primaryCustomImgEl.alt = `Entrada de ${movie.title}`;
            this.primaryCustomImgEl.hidden = false;
          } else {
            this.primaryCustomImgEl.hidden = true;
          }
        }
        if (this.secondaryCustomImgEl) {
          if (hasCustom) {
            this.secondaryCustomImgEl.src = customImg;
            this.secondaryCustomImgEl.alt = '';
            this.secondaryCustomImgEl.hidden = false;
          } else {
            this.secondaryCustomImgEl.hidden = true;
          }
        }

        const numStr = String(this.selectedIndex + 1).padStart(2, '0');
        const cycleLabel = CYCLE_LABELS[movie.cycle] || `CICLE 0${movie.cycle || 1}`;
        const seatRow = String(3 + (this.selectedIndex % 6)).padStart(2, '0');
        const seatNum = 10 + (this.selectedIndex % 8);

        if (this.primaryTitleEl) this.primaryTitleEl.textContent = movie.title;
        if (this.primaryDirectorEl) {
          this.primaryDirectorEl.textContent = `${movie.director} · ${movie.year}`;
        }
        if (this.primaryCycleEl) this.primaryCycleEl.textContent = cycleLabel;
        if (this.primarySerialEl) this.primarySerialEl.textContent = `EP-${numStr}26-A`;
        if (this.primarySeatEl) {
          this.primarySeatEl.textContent = `SALA 01 · FILA ${seatRow} · SEIENT ${seatNum}`;
        }
        if (this.primaryThumbEl) {
          this.primaryThumbEl.src = movie.image;
          this.primaryThumbEl.alt = movie.alt || movie.title;
        }

        if (this.secondaryTitleEl) this.secondaryTitleEl.textContent = movie.title;
        if (this.secondarySerialEl) this.secondarySerialEl.textContent = `EP-${numStr}26-B`;
      };

      if (!animate || !this.envelopeEl) {
        applyContent();
        if (this.envelopeEl) {
          this.envelopeEl.dataset.qty = String(this.quantity);
          this.envelopeEl.classList.add('is-open');
        }
        return;
      }

      clearTimeout(this.switchTimer);
      clearTimeout(this.animTimer);
      this.isAnimating = false;
      this.envelopeEl.classList.remove('is-front', 'is-extracting', 'is-returning', 'is-open');
      this.switchTimer = setTimeout(() => {
        applyContent();
        this.envelopeEl.classList.add('is-open');
      }, 210);
    }
  }

  window.EPILEG.EntradesController = EntradesController;
})();
