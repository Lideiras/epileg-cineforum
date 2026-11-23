(function () {
  window.EPILEG = window.EPILEG || {};

  function getRouteFromHash() {
    const raw = (window.location.hash || '').toLowerCase().replace(/^#/, '');
    if (raw === 'movies' || raw === 'peliculas' || raw === 'pel-licules') {
      return { view: 'movies' };
    }
    const cycleMatch = raw.match(/^(?:cicle|ciclo)-?0?([1-3])$/);
    if (cycleMatch) {
      const idx = parseInt(cycleMatch[1], 10) - 1;
      return { view: 'cicle-page', cycleIndex: idx };
    }
    if (raw === 'ciclos' || raw === 'cicles' || raw === 'cycles') {
      return { view: 'ciclos' };
    }
    if (raw === 'entrades' || raw === 'tickets') {
      return { view: 'entrades' };
    }
    if (raw === 'subscriute' || raw === 'suscribete' || raw === 'subscribe') {
      return { view: 'subscriute' };
    }
    if (raw === 'sobre' || raw === 'sobre-nosaltres' || raw === 'about') {
      return { view: 'sobre' };
    }
    if (raw === 'galeria' || raw === 'gallery') {
      return { view: 'galeria' };
    }
    return { view: 'home' };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const viewHome = document.getElementById('view-home');
    const viewMovies = document.getElementById('view-movies');
    const viewCiclos = document.getElementById('view-ciclos');
    const viewCiclePage = document.getElementById('view-cicle-page');
    const viewEntrades = document.getElementById('view-entrades');
    const viewSubscriute = document.getElementById('view-subscriute');
    const viewSobre = document.getElementById('view-sobre');
    const viewGaleria = document.getElementById('view-galeria');

    const topMenuLinks = document.querySelectorAll(
      '.home-menu-link[data-route], .movies-menu-link[data-route], .ciclos-menu-link[data-route]'
    );
    const subnavLinks = document.querySelectorAll('.ciclos-subnav-link[data-cycle-target]');
    const badgeLinks = document.querySelectorAll('.ciclos-badge-link');
    const prevArrow = document.getElementById('cycle-prev');
    const nextArrow = document.getElementById('cycle-next');
    const routeTriggers = document.querySelectorAll('[data-route]');

    const carousel = new window.EPILEG.VerticalCarousel3D({
      movies: window.EPILEG.MOVIES || [],
      stage: document.getElementById('carousel-stage'),
      track: document.getElementById('carousel-track'),
      listEl: document.getElementById('movies-list'),
      counterEl: document.getElementById('meta-counter'),
      creditsEl: document.getElementById('meta-credits'),
      liveEl: document.getElementById('carousel-live'),
      prevBtn: document.getElementById('btn-prev'),
      nextBtn: document.getElementById('btn-next'),
    });

    const cyclesDeck = new window.EPILEG.CyclesDeck({
      cycles: window.EPILEG.CYCLES || [],
      slideEl: document.getElementById('cycle-slide'),
      tagEl: document.getElementById('cycle-tag'),
      stripViewport: document.getElementById('cycle-strip-viewport'),
      stripTrack: document.getElementById('cycle-strip-track'),
      titleEl: document.getElementById('cycle-title'),
      descriptionEl: document.getElementById('cycle-description'),
      indexLeftEl: document.getElementById('cycle-index-left'),
      indexRightEl: document.getElementById('cycle-index-right'),
      liveEl: document.getElementById('cycle-live'),
      prevBtn: prevArrow,
      nextBtn: nextArrow,
    });

    if (window.EPILEG.EntradesController) {
      new window.EPILEG.EntradesController({
        movies: window.EPILEG.MOVIES || [],
        listEl: document.getElementById('entrades-movies-list'),
        envelopeEl: document.getElementById('entrades-envelope'),
        ticketsStackEl: document.querySelector('#entrades-envelope .tickets-stack'),
        qtyBtns: document.querySelectorAll('.entrades-qty-btn'),
        reserveBtn: document.getElementById('entrades-reserve-btn'),
        statusEl: document.getElementById('entrades-status'),
        primaryTitleEl: document.getElementById('ticket-primary-title'),
        primaryDirectorEl: document.getElementById('ticket-primary-director'),
        primaryCycleEl: document.getElementById('ticket-primary-cycle'),
        primarySerialEl: document.getElementById('ticket-primary-serial'),
        primaryThumbEl: document.getElementById('ticket-primary-thumb'),
        primarySeatEl: document.getElementById('ticket-primary-seat'),
        primaryTicketEl: document.getElementById('ticket-primary'),
        primaryCustomImgEl: document.getElementById('ticket-primary-custom-img'),
        secondaryTicketEl: document.getElementById('ticket-secondary'),
        secondaryCustomImgEl: document.getElementById('ticket-secondary-custom-img'),
        secondaryTitleEl: document.getElementById('ticket-secondary-title'),
        secondarySerialEl: document.getElementById('ticket-secondary-serial'),
      });
    }

    function updateCiclePageControls(activeIndex) {
      const totalCycles = (window.EPILEG.CYCLES || []).length || 3;
      const prevIndex = ((activeIndex - 1) % totalCycles + totalCycles) % totalCycles;
      const nextIndex = (activeIndex + 1) % totalCycles;

      if (prevArrow) {
        prevArrow.setAttribute('href', `#cicle-${prevIndex + 1}`);
      }
      if (nextArrow) {
        nextArrow.setAttribute('href', `#cicle-${nextIndex + 1}`);
      }

      subnavLinks.forEach((link) => {
        const target = parseInt(link.dataset.cycleTarget, 10);
        if (target === activeIndex) {
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'page');
        } else {
          link.classList.remove('is-active');
          link.removeAttribute('aria-current');
        }
      });

      badgeLinks.forEach((link) => {
        link.classList.remove('is-active');
      });
    }

    cyclesDeck.onCycleChange = function (index) {
      if (document.body.dataset.view === 'cicle-page') {
        const targetHash = `#cicle-${index + 1}`;
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        }
        updateCiclePageControls(index);
      }
    };

    function setView(routeInfo, updateHash) {
      const view = routeInfo.view || 'home';
      document.body.dataset.view = view;

      if (viewHome) viewHome.hidden = view !== 'home';
      if (viewMovies) viewMovies.hidden = view !== 'movies';
      if (viewCiclos) viewCiclos.hidden = view !== 'ciclos';
      if (viewCiclePage) viewCiclePage.hidden = view !== 'cicle-page';
      if (viewEntrades) viewEntrades.hidden = view !== 'entrades';
      if (viewSubscriute) viewSubscriute.hidden = view !== 'subscriute';
      if (viewSobre) viewSobre.hidden = view !== 'sobre';
      if (viewGaleria) viewGaleria.hidden = view !== 'galeria';

      carousel.setEnabled(view === 'movies');
      cyclesDeck.setEnabled(view === 'cicle-page');

      if (view === 'movies') {
        requestAnimationFrame(() => {
          const stage = document.getElementById('carousel-stage');
          if (stage) stage.focus({ preventScroll: true });
        });
      }

      if (view === 'cicle-page') {
        const cIdx = typeof routeInfo.cycleIndex === 'number' ? routeInfo.cycleIndex : 0;
        cyclesDeck.goToCycle(cIdx);
        updateCiclePageControls(cIdx);
      } else if (view === 'ciclos') {
        badgeLinks.forEach((link) => {
          link.classList.add('is-active');
        });
        subnavLinks.forEach((link) => {
          link.classList.remove('is-active');
          link.removeAttribute('aria-current');
        });
      }

      // Update top menu links active states
      const activeNavTarget = view === 'cicle-page' ? 'ciclos' : view;
      topMenuLinks.forEach((link) => {
        if (link.dataset.route === activeNavTarget) {
          link.setAttribute('aria-current', 'page');
          link.classList.add('is-active');
        } else {
          link.removeAttribute('aria-current');
          link.classList.remove('is-active');
        }
      });

      if (updateHash) {
        let targetHash = `#${view}`;
        if (view === 'cicle-page') {
          targetHash = `#cicle-${(routeInfo.cycleIndex || 0) + 1}`;
        }
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        }
      }
    }

    routeTriggers.forEach((el) => {
      el.addEventListener('click', (e) => {
        const route = el.dataset.route;
        if (route) {
          e.preventDefault();
          setView({ view: route }, true);
        }
      });
    });

    window.addEventListener('hashchange', () => {
      setView(getRouteFromHash(), false);
    });

    const sobreStrips = Array.from(document.querySelectorAll('.sobre-strip'));
    function setActiveSobreStrip(targetStrip) {
      sobreStrips.forEach((strip) => {
        strip.classList.toggle('is-active', strip === targetStrip);
      });
    }
    sobreStrips.forEach((strip) => {
      strip.addEventListener('mouseenter', () => setActiveSobreStrip(strip));
      strip.addEventListener('click', () => setActiveSobreStrip(strip));
      strip.addEventListener('focus', () => setActiveSobreStrip(strip));
    });

    const subscriuteForm = document.getElementById('subscriute-form');
    const subscriuteFeedback = document.getElementById('subscriute-feedback');
    const subscriuteBtn = document.getElementById('subscriute-submit');
    if (subscriuteForm) {
      subscriuteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('subscriute-email');
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email) return;
        if (subscriuteBtn) {
          subscriuteBtn.classList.add('is-confirmed');
          subscriuteBtn.textContent = 'SUBSCRIPCIÓ CONFIRMADA ✓';
        }
        if (subscriuteFeedback) {
          subscriuteFeedback.textContent = `Gràcies! Hem registrat ${email} a la llista d'EPÍLEG.`;
        }
        subscriuteForm.reset();
      });
    }

    const galeriaItems = [
      {
        image: 'galeria/8831466f-8cce-496a-9a36-7b33d913d21a.JPG',
        title: 'ATENEU BARCELONÈS · JARDINS — CICLE 01 · CONTRA L’OBLIT',
        alt: "Instal·lació d'EPÍLEG als Jardins de l'Ateneu Barcelonès"
      },
      {
        image: 'galeria/e67352fb-9ab7-4fb1-91f9-f4676127958b.JPG',
        title: 'PROJECCIÓ I DEBAT OBERT — ATENEU BARCELONÈS',
        alt: "Projecció i col·loqui obert d'EPÍLEG als Jardins de l'Ateneu Barcelonès"
      },
      {
        image: 'galeria/fea706ba-0489-42b4-bad9-9b9d90b576e1.JPG',
        title: 'NIU · ESPAI ARTÍSTIC CONTEMPORANI — CICLE 03 · LA LÍNIA INVISIBLE',
        alt: "Exposició i punt de trobada d'EPÍLEG a NIU Espai Artístic Contemporani"
      }
    ];
    const galeriaImg = document.getElementById('galeria-img');
    const galeriaCounter = document.getElementById('galeria-counter');
    const galeriaTitle = document.getElementById('galeria-title');
    const galeriaPrev = document.getElementById('galeria-prev');
    const galeriaNext = document.getElementById('galeria-next');
    let galeriaIndex = 0;

    function renderGaleria(idx) {
      if (!galeriaItems.length) return;
      galeriaIndex = ((idx % galeriaItems.length) + galeriaItems.length) % galeriaItems.length;
      const item = galeriaItems[galeriaIndex];
      if (galeriaImg) {
        galeriaImg.src = item.image;
        galeriaImg.alt = item.alt;
      }
      if (galeriaCounter) {
        const cur = String(galeriaIndex + 1).padStart(2, '0');
        const tot = String(galeriaItems.length).padStart(2, '0');
        galeriaCounter.textContent = `${cur} / ${tot}`;
      }
      if (galeriaTitle) {
        galeriaTitle.textContent = item.title;
      }
    }

    if (galeriaPrev) {
      galeriaPrev.addEventListener('click', () => renderGaleria(galeriaIndex - 1));
    }
    if (galeriaNext) {
      galeriaNext.addEventListener('click', () => renderGaleria(galeriaIndex + 1));
    }
    window.addEventListener('keydown', (e) => {
      if (document.body.dataset.view !== 'galeria') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        renderGaleria(galeriaIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        renderGaleria(galeriaIndex - 1);
      }
    });
    renderGaleria(0);

    setView(getRouteFromHash(), false);
  });
})();
