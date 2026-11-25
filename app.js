(function () {
  const data = window.ITHAVEN_DATA;
  const utils = data;
  const WISHLIST_KEY = 'ithaven_wishlist';

  function readJSON(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function getWishlist() {
    const stored = readJSON(WISHLIST_KEY, []);
    return Array.isArray(stored) ? stored.filter((id) => id != null) : [];
  }

  function saveWishlist(ids) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
    updateWishlistBadges();
    window.dispatchEvent(new CustomEvent('ithaven:wishlist-change', { detail: { ids } }));
  }

  function toggleWishlist(id) {
    const ids = getWishlist();
    const index = ids.indexOf(Number(id));
    if (index >= 0) {
      ids.splice(index, 1);
      window.ITHavenCart?.toast('Retiré de la wishlist.');
    } else {
      ids.push(Number(id));
      window.ITHavenCart?.toast('Ajouté à la wishlist.');
    }
    saveWishlist(ids);
    return index < 0;
  }

  function updateWishlistBadges() {
    const total = getWishlist().length;
    document.querySelectorAll('.wishlist-count').forEach((el) => {
      el.textContent = String(total);
      el.hidden = total === 0;
    });
  }

  async function apiGet(url, fallbackValue) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error('API indisponible');
      return await response.json();
    } catch (_) {
      return fallbackValue;
    }
  }

  function productsFrom(result) {
    const rows = Array.isArray(result) ? result : result?.products || [];
    return rows.map((row) => utils.normalizeProduct(row)).filter(Boolean);
  }

  function productCard(product, options) {
    const settings = options || {};
    const promo = Number(product.oldPrice || 0) > Number(product.price || 0);
    const price = Number(product.price || 0);
    const oldPrice = promo ? Number(product.oldPrice) : 0;
    const discount = promo ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
    const isWishlisted = getWishlist().includes(Number(product.id));
    const cardClass = settings.promo ? 'promo-card' : 'shop-card';
    const bodyClass = settings.promo ? 'promo-body' : 'shop-body';
    const catClass = settings.promo ? 'promo-cat' : 'shop-cat';
    const titleClass = settings.promo ? 'promo-title' : 'shop-title';
    const priceClass = settings.promo ? 'promo-prices' : 'shop-prices';
    const nowClass = settings.promo ? 'price-now' : 'shop-price-now';
    const addClass = settings.promo ? 'add-cart-btn' : 'shop-add-btn';
    const imageWrapClass = settings.promo ? 'promo-img-wrap' : 'shop-img-wrap';

    return `
      <article class="${cardClass}" data-product-id="${utils.escapeHtml(product.id)}">
        <div class="${imageWrapClass}">
          ${promo ? `<span class="discount-tag">-${discount}%</span>` : ''}
          <img src="${utils.escapeHtml(product.image)}" alt="${utils.escapeHtml(product.name)}" />
          <button type="button" class="wishlist-toggle${isWishlisted ? ' active' : ''}" data-wishlist-id="${utils.escapeHtml(product.id)}" aria-label="Ajouter à la wishlist">
            <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
          </button>
        </div>
        <div class="${bodyClass}">
          <span class="${catClass}">${utils.escapeHtml(product.category)}</span>
          <h2 class="${titleClass}"><a class="product-title-link" href="produit.html?id=${encodeURIComponent(product.id)}">${utils.escapeHtml(product.name)}</a></h2>
          ${settings.promo ? '' : `<span class="shop-stock">Stock : ${Number(product.stock || 0)}</span>`}
          <div class="${priceClass}">
            <span class="${nowClass}">${utils.formatPrice(price)}</span>
            ${promo ? `<span class="price-old">${utils.formatPrice(oldPrice)}</span>` : ''}
          </div>
          <button type="button" class="${addClass} add-to-cart" data-product-id="${utils.escapeHtml(product.id)}">
            <i class="fas fa-cart-plus"></i> Ajouter au panier
          </button>
        </div>
      </article>
    `;
  }

  function bindProductGrid(grid, options) {
    if (!grid) return;
    grid.addEventListener('click', (event) => {
      const addButton = event.target.closest('.add-to-cart');
      if (addButton) {
        const product = data.findProduct(addButton.dataset.productId) || options.products?.find((p) => String(p.id) === String(addButton.dataset.productId));
        if (!product) return;
        window.ITHavenCart?.addItem(product);
        const label = addButton.innerHTML;
        addButton.innerHTML = '<i class="fas fa-check"></i> Ajouté';
        setTimeout(() => {
          addButton.innerHTML = label;
        }, 900);
        return;
      }

      const wishlistButton = event.target.closest('.wishlist-toggle');
      if (wishlistButton) {
        toggleWishlist(wishlistButton.dataset.wishlistId);
        wishlistButton.classList.toggle('active');
        wishlistButton.querySelector('i')?.classList.toggle('fas');
        wishlistButton.querySelector('i')?.classList.toggle('far');
      }
    });
  }

  function setupFeaturedProducts() {
    document.querySelectorAll('[data-product-id].sh-add, [data-product-id].sh-cart').forEach((button) => {
      button.addEventListener('click', () => {
        const product = data.findProduct(button.dataset.productId);
        if (product) window.ITHavenCart?.addItem(product);
      });
    });
  }

  function setupNewsletter() {
    document.querySelectorAll('.newsletter-form').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const input = form.querySelector('input[type="email"]');
        if (!input) return;
        const email = input.value.trim();
        const button = form.querySelector('button');
        if (button) button.disabled = true;

        try {
          const response = await fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          if (!response.ok) throw new Error('Inscription indisponible');
          window.ITHavenCart?.toast('Inscription confirmée. Merci !');
          input.value = '';
        } catch (_) {
          const subscribers = readJSON('ithaven_newsletter', []);
          if (!subscribers.includes(email)) subscribers.push(email);
          localStorage.setItem('ithaven_newsletter', JSON.stringify(subscribers));
          window.ITHavenCart?.toast('Inscription enregistrée localement.');
          input.value = '';
        } finally {
          if (button) button.disabled = false;
        }
      });
    });
  }

  function setupContact() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const feedback = document.getElementById('contact-feedback');
      const button = document.getElementById('contact-submit');
      const payload = {
        name: document.getElementById('contact-name')?.value.trim() || '',
        email: document.getElementById('contact-email')?.value.trim() || '',
        subject: document.getElementById('contact-subject')?.value || 'Information produit',
        message: document.getElementById('contact-message')?.value.trim() || ''
      };

      if (button) button.disabled = true;
      if (feedback) {
        feedback.className = 'contact-feedback';
        feedback.textContent = 'Envoi en cours...';
      }

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || result.message || 'Erreur lors de l’envoi.');
        if (feedback) {
          feedback.classList.add('contact-success');
          feedback.textContent = result.message || 'Message envoyé avec succès !';
        }
        form.reset();
      } catch (error) {
        const messages = readJSON('ithaven_contact_messages', []);
        messages.unshift({ ...payload, createdAt: new Date().toISOString() });
        localStorage.setItem('ithaven_contact_messages', JSON.stringify(messages.slice(0, 20)));
        if (feedback) {
          feedback.classList.add('contact-error');
          feedback.textContent = 'Serveur indisponible : message enregistré localement.';
        }
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  function filterCatalog(filter) {
    if (filter === 'new') return data.products.filter((item) => item.isNew);
    if (filter === 'bestsellers') return [...data.products].sort((a, b) => b.sales - a.sales).slice(0, 12);
    return data.products;
  }

  function setupShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    const status = document.getElementById('shop-status');
    const title = document.getElementById('shop-title');
    const search = document.getElementById('shop-search');
    const params = new URLSearchParams(window.location.search);
    let currentFilter = params.get('filter') || 'all';
    let currentCategory = params.get('category') || 'all';
    let products = [];
    const titles = {
      all: 'TOUS LES <span>PRODUITS</span>',
      new: 'NOS <span>NOUVEAUTÉS</span>',
      bestsellers: 'MEILLEURES <span>VENTES</span>'
    };

    function render() {
      const query = String(search?.value || '').trim().toLocaleLowerCase('fr-FR');
      const filtered = products.filter((product) => {
        if (!query) return true;
        return [product.name, product.category, product.description]
          .join(' ')
          .toLocaleLowerCase('fr-FR')
          .includes(query);
      });

      grid.innerHTML = filtered.map((product) => productCard(product)).join('');
      if (status) status.textContent = `${filtered.length} produit(s) affiché(s)`;
      bindProductGrid(grid, { products });
    }

    async function load() {
      if (status) status.textContent = 'Chargement des produits...';
      const query = new URLSearchParams({ filter: currentFilter, category: currentCategory });
      const result = await apiGet(`/api/products?${query.toString()}`, { products: filterCatalog(currentFilter) });
      products = productsFrom(result);
      if (currentCategory !== 'all') {
        const category = currentCategory.toLocaleLowerCase('fr-FR');
        const filteredByCategory = products.filter((product) =>
          String(product.categorySlug || product.category).toLocaleLowerCase('fr-FR').includes(category)
        );
        if (filteredByCategory.length) products = filteredByCategory;
      }
      if (!products.length) products = filterCatalog(currentFilter);
      if (title) {
        title.innerHTML =
          currentCategory !== 'all'
            ? `PRODUITS <span>${utils.escapeHtml(currentCategory.toUpperCase())}</span>`
            : titles[currentFilter] || titles.all;
      }
      document.querySelectorAll('#shop-filters .shop-filter-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.filter === currentFilter);
      });
      render();
    }

    document.querySelectorAll('#shop-filters .shop-filter-btn').forEach((button) => {
      button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        const url = new URL(window.location.href);
        url.searchParams.set('filter', currentFilter);
        window.history.replaceState({}, '', url);
        load();
      });
    });
    search?.addEventListener('input', render);
    load();
  }

  function promoGroup(product) {
    const slug = String(product.categorySlug || '').toLowerCase();
    if (slug.includes('laptop')) return 'laptops';
    if (slug.includes('gaming') || slug.includes('speaker') || slug.includes('headphone')) return 'gaming';
    return 'accessoires';
  }

  function setupPromo() {
    const grid = document.getElementById('promo-grid');
    if (!grid) return;
    const status = document.getElementById('promo-status');
    let currentFilter = 'all';
    let products = [];

    function render() {
      const filtered = currentFilter === 'all' ? products : products.filter((p) => promoGroup(p) === currentFilter);
      grid.innerHTML = filtered.map((product) => productCard(product, { promo: true })).join('');
      if (status) status.textContent = filtered.length ? `${filtered.length} produit(s) en promotion` : 'Aucune promotion dans cette catégorie pour le moment.';
      bindProductGrid(grid, { products });
    }

    async function load() {
      if (status) status.textContent = 'Chargement des promotions...';
      const result = await apiGet('/api/products?promo=1', { products: data.products.filter((item) => Number(item.oldPrice) > Number(item.price)) });
      products = productsFrom(result).filter((product) => Number(product.oldPrice) > Number(product.price));
      if (!products.length) products = data.products.filter((item) => Number(item.oldPrice) > Number(item.price));
      render();
    }

    document.querySelectorAll('#promo-filters .filter-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('#promo-filters .filter-btn').forEach((b) => b.classList.remove('active'));
        button.classList.add('active');
        currentFilter = button.dataset.filter;
        render();
      });
    });
    load();
  }

  function setupCategories() {
    const cards = document.querySelectorAll('.category-card[data-category]');
    if (!cards.length) return;
    const countsBySlug = {};
    data.products.forEach((product) => {
      countsBySlug[product.categorySlug] = (countsBySlug[product.categorySlug] || 0) + 1;
    });

    async function load() {
      const result = await apiGet('/api/categories/counts', { categories: [] });
      if (Array.isArray(result.categories)) {
        result.categories.forEach((row) => {
          countsBySlug[row.slug] = Number(row.total);
        });
      }
      cards.forEach((card) => {
        const slug = card.dataset.category;
        const link = card.querySelector('.category-link');
        if (link && Number.isFinite(Number(countsBySlug[slug]))) {
          link.innerHTML = `Voir les ${countsBySlug[slug]} produit(s) <i class="fas fa-arrow-right"></i>`;
        }
      });
    }
    load();
  }

  function setupProductDetail() {
    const section = document.getElementById('product-detail');
    if (!section) return;
    const id = new URLSearchParams(window.location.search).get('id') || section.dataset.productId;
    const content = document.getElementById('product-content');
    if (!content) return;

    async function load() {
      let product = data.findProduct(id);
      const result = await apiGet(`/api/products/${encodeURIComponent(id)}`, null);
      if (result && result.product) product = utils.normalizeProduct(result.product) || product;
      if (!product) {
        content.innerHTML = '<p class="shop-status">Produit introuvable.</p>';
        return;
      }

      const promo = Number(product.oldPrice || 0) > Number(product.price || 0);
      const isWishlisted = getWishlist().includes(Number(product.id));
      content.innerHTML = `
        <div class="product-detail-grid">
          <div class="product-detail-media">
          <a class="product-card-link" href="produit.html?id=${encodeURIComponent(product.id)}"><img src="${utils.escapeHtml(product.image)}" alt="${utils.escapeHtml(product.name)}" /></a>
          </div>
          <div class="product-detail-info">
            <span class="shop-cat">${utils.escapeHtml(product.category)}</span>
            <h1>${utils.escapeHtml(product.name)}</h1>
            <div class="rv-stars" aria-label="4.5 étoiles">★★★★★ <small>${utils.escapeHtml(product.sales)} ventes</small></div>
            <p class="product-description">${utils.escapeHtml(product.description)}</p>
            <div class="product-price-block">
              <strong>${utils.formatPrice(product.price)}</strong>
              ${promo ? `<s>${utils.formatPrice(product.oldPrice)}</s><span class="discount-tag">-${Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%</span>` : ''}
            </div>
            <p class="product-stock ${Number(product.stock) > 0 ? 'in-stock' : 'out-stock'}">
              ${Number(product.stock) > 0 ? `En stock : ${product.stock}` : 'Rupture de stock'}
            </p>
            <div class="product-detail-actions">
              <div class="qty-controls">
                <button type="button" class="qty-btn" id="detail-minus" aria-label="Diminuer">−</button>
                <span class="qty-val" id="detail-qty">1</span>
                <button type="button" class="qty-btn" id="detail-plus" aria-label="Augmenter">+</button>
              </div>
              <button type="button" class="product-add-btn" id="product-add"><i class="fas fa-cart-plus"></i> Ajouter au panier</button>
              <button type="button" class="product-wishlist-btn${isWishlisted ? ' active' : ''}" id="product-wishlist" aria-label="Wishlist">
                <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
              </button>
            </div>
          </div>
        </div>
      `;

      let qty = 1;
      document.getElementById('detail-minus')?.addEventListener('click', () => {
        qty = Math.max(1, qty - 1);
        document.getElementById('detail-qty').textContent = String(qty);
      });
      document.getElementById('detail-plus')?.addEventListener('click', () => {
        qty = Math.min(99, qty + 1);
        document.getElementById('detail-qty').textContent = String(qty);
      });
      document.getElementById('product-add')?.addEventListener('click', () => {
        window.ITHavenCart?.addItem(product, qty);
      });
      document.getElementById('product-wishlist')?.addEventListener('click', (event) => {
        const active = toggleWishlist(product.id);
        event.currentTarget.classList.toggle('active', active);
        const icon = event.currentTarget.querySelector('i');
        icon?.classList.toggle('fas', active);
        icon?.classList.toggle('far', !active);
      });
    }
    load();
  }

  function setupWishlist() {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;
    const status = document.getElementById('wishlist-status');

    function render() {
      const ids = getWishlist();
      const products = ids.map((id) => data.findProduct(id)).filter(Boolean);
      grid.innerHTML = products.length
        ? products.map((product) => productCard(product)).join('')
        : '<p class="shop-status wishlist-empty">Ta wishlist est vide. Ajoute tes produits préférés depuis la boutique.</p>';
      if (status) status.textContent = `${products.length} produit(s) enregistré(s)`;
      bindProductGrid(grid, { products });
    }

    window.addEventListener('ithaven:wishlist-change', render);
    render();
  }

  function setupActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === path);
    });
  }

  function setupMobileMenu() {
    const header = document.querySelector('.header');
    const nav = header?.querySelector('.nav');
    if (!header || !nav || header.querySelector('.menu-toggle')) return;

    if (!nav.id) nav.id = 'main-nav';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'menu-toggle';
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', nav.id);
    toggle.innerHTML = '<span></span><span></span><span></span>';
    header.appendChild(toggle);

    function closeMenu() {
      nav.classList.remove('open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
      nav.querySelectorAll('.dropdown.open').forEach((item) => item.classList.remove('open'));
    }

    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
      if (!isOpen) closeMenu();
    });

    nav.querySelectorAll('.dropdown > .nav-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (window.innerWidth > 900) return;
        event.preventDefault();
        const dropdown = link.parentElement;
        const wasOpen = dropdown.classList.contains('open');
        nav.querySelectorAll('.dropdown.open').forEach((item) => item.classList.remove('open'));
        dropdown.classList.toggle('open', !wasOpen);
      });
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 900) closeMenu();
      });
    });

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('open')) return;
      if (event.target.closest('.nav') || event.target.closest('.menu-toggle')) return;
      closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  function setupCountdown() {
    const fields = ['days', 'hours', 'minutes', 'seconds'].map((id) => document.getElementById(id));
    if (fields.some((field) => !field)) return;

    const end = Date.now() + (2 * 24 * 60 * 60 + 14 * 60 * 60 + 36 * 60 + 48) * 1000;
    const pad = (value) => String(value).padStart(2, '0');

    function tick() {
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;
      fields[0].textContent = pad(days);
      fields[1].textContent = pad(hours);
      fields[2].textContent = pad(minutes);
      fields[3].textContent = pad(seconds);
      if (remaining === 0) clearInterval(timer);
    }

    const timer = setInterval(tick, 1000);
    tick();
  }

  function setupVisitTracking() {
    try {
      fetch('/api/track/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.getSessionId() }),
        keepalive: true
      }).catch(() => {});
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupVisitTracking();
    setupMobileMenu();
    setupCountdown();
    setupActiveNav();
    updateWishlistBadges();
    setupNewsletter();
    setupContact();
    setupFeaturedProducts();
    setupShop();
    setupPromo();
    setupCategories();
    setupProductDetail();
    setupWishlist();
  });

  window.ITHavenApp = {
    getWishlist,
    toggleWishlist,
    updateWishlistBadges
  };
})();
