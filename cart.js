(function () {
  const data = window.ITHAVEN_DATA;
  const utils = data;
  const STORAGE_KEY = 'ithaven_cart';
  const LOCATION_KEY = 'ithaven_location';
  const PROMO_KEY = 'ithaven_promo';
  const PROMO_CATEGORY_KEY = 'ithaven_promo_category';
  const ORDER_KEY = 'ithaven_orders';

  let activePromoCode = localStorage.getItem(PROMO_KEY) || '';
  let selectedPromoCategory = localStorage.getItem(PROMO_CATEGORY_KEY) || 'all';
  let selectedLocation = localStorage.getItem(LOCATION_KEY) || data.locations[0].id;
  let drawerInjected = false;
  let confirmationOpen = false;
  let cartTrackTimer = null;

  function readJSON(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function getCart() {
    const stored = readJSON(STORAGE_KEY, []);
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((item) => item && item.id != null)
      .map((item) => ({
        id: item.id,
        name: String(item.name || 'Produit ITHAVEN'),
        price: Number(item.price || 0),
        image: String(item.image || 'img/logo.png'),
        color: String(item.color || 'Rouge'),
        qty: Math.max(1, Number(item.qty || 1))
      }));
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateBadge();
    window.dispatchEvent(new CustomEvent('ithaven:cart-change', { detail: { cart } }));
    trackCart(cart);
  }

  function trackCart(cart) {
    clearTimeout(cartTrackTimer);
    cartTrackTimer = setTimeout(() => {
      try {
        let email = '';
        try {
          email = JSON.parse(localStorage.getItem('ithaven_user') || 'null')?.email || '';
        } catch (_) {}
        fetch('/api/track/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: data.getSessionId(),
            email,
            itemsCount: cart.reduce((sum, item) => sum + Math.max(1, Number(item.qty || 1)), 0),
            total: data.calculateTotals(cart, selectedLocation, activePromoCode).total
          }),
          keepalive: true
        }).catch(() => {});
      } catch (_) {}
    }, 400);
  }

  function updateBadge() {
    const totalQty = getCart().reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('#cart-count, .cart-count, .cart-badge').forEach((el) => {
      el.textContent = String(totalQty);
      el.hidden = totalQty === 0;
    });
  }

  function toast(message, type) {
    let container = document.getElementById('ithaven-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ithaven-toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const item = document.createElement('div');
    item.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    item.textContent = message;
    container.appendChild(item);
    requestAnimationFrame(() => item.classList.add('visible'));
    setTimeout(() => {
      item.classList.remove('visible');
      setTimeout(() => item.remove(), 250);
    }, 3200);
  }

  function locationOptions() {
    return data.locations
      .map(
        (loc) =>
          `<option value="${utils.escapeHtml(loc.id)}"${loc.id === selectedLocation ? ' selected' : ''}>${utils.escapeHtml(loc.name)} (+${utils.formatPrice(loc.fee)})</option>`
      )
      .join('');
  }

  function promoCategoryOptions() {
    return data.promoCategories
      .map(
        (cat) =>
          `<option value="${utils.escapeHtml(cat.id)}"${cat.id === selectedPromoCategory ? ' selected' : ''}>${utils.escapeHtml(cat.name)}</option>`
      )
      .join('');
  }

  function promoCodeOptions() {
    const codes = data.promoCodes.filter(
      (promo) => selectedPromoCategory === 'all' || promo.category === selectedPromoCategory
    );
    return (
      '<option value="">Choisir un code...</option>' +
      codes
        .map(
          (promo) =>
            `<option value="${utils.escapeHtml(promo.code)}"${promo.code === activePromoCode ? ' selected' : ''}>${utils.escapeHtml(promo.code)} — ${utils.escapeHtml(promo.label)}</option>`
        )
        .join('')
    );
  }

  function injectDrawer() {
    if (drawerInjected && document.getElementById('cart-drawer')) return;
    drawerInjected = true;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="cart-overlay" class="cart-overlay"></div>
      <aside id="cart-drawer" class="cart-drawer" aria-label="Panier" aria-hidden="true">
        <div class="cart-drawer-header">
          <h2><i class="fas fa-shopping-bag"></i> MON <span>PANIER</span></h2>
          <button type="button" id="cart-close-btn" class="cart-close-btn" aria-label="Fermer le panier">✕</button>
        </div>

        <div id="cart-main-view" class="cart-main-view">
          <div id="cart-items-list" class="cart-items-list"></div>

          <div class="cart-drawer-footer">
            <div class="cart-field">
              <label for="cart-location"><i class="fas fa-map-marker-alt"></i> Localisation de livraison</label>
              <select id="cart-location">${locationOptions()}</select>
            </div>

            <div class="cart-field">
              <label for="cart-promo-category"><i class="fas fa-layer-group"></i> Catégorie du code promo</label>
              <select id="cart-promo-category">${promoCategoryOptions()}</select>
            </div>

            <div class="cart-field">
              <label for="cart-promo-code"><i class="fas fa-tag"></i> Code promo disponible</label>
              <select id="cart-promo-code">${promoCodeOptions()}</select>
            </div>

            <div class="cart-field">
              <label for="cart-promo-input">Saisir un autre code</label>
              <div class="promo-row">
                <input type="text" id="cart-promo-input" placeholder="Ex : ITHAVEN10" autocomplete="off" />
                <button type="button" id="cart-promo-apply" class="promo-apply-btn">Appliquer</button>
              </div>
              <div id="cart-promo-msg" class="promo-msg" aria-live="polite"></div>
              <div id="cart-promo-active" class="cart-promo-active" hidden>
                <span><i class="fas fa-check-circle"></i> Code <strong id="cart-promo-active-code"></strong> appliqué</span>
                <button type="button" id="cart-promo-remove">Retirer</button>
              </div>
            </div>

            <div class="cart-summary">
              <div class="summary-line"><span>Sous-total</span><span id="cart-subtotal">0 FCFA</span></div>
              <div class="summary-line discount"><span>Réduction</span><span id="cart-discount">- 0 FCFA</span></div>
              <div class="summary-line"><span>Livraison</span><span id="cart-shipping">0 FCFA</span></div>
              <div class="summary-line total"><span>Total à payer</span><span id="cart-total">0 FCFA</span></div>
            </div>

            <button type="button" id="cart-checkout-btn" class="checkout-btn">Valider la commande</button>
            <button type="button" id="cart-clear-btn" class="cart-clear-btn">Vider le panier</button>
          </div>
        </div>

        <div id="cart-confirmation-view" class="cart-confirmation-view" hidden>
          <div class="order-success-icon"><i class="fas fa-check"></i></div>
          <h3>Commande confirmée</h3>
          <p id="order-success-message" class="order-success-message"></p>
          <div id="order-success-details" class="order-success-details"></div>
          <button type="button" id="order-continue-btn" class="checkout-btn">Continuer mes achats</button>
          <button type="button" id="order-history-btn" class="cart-clear-btn">Voir mes commandes</button>
        </div>
      </aside>
    `;
    document.body.appendChild(wrapper);

    document.getElementById('cart-close-btn').addEventListener('click', closeCart);
    document.getElementById('cart-overlay').addEventListener('click', closeCart);
    document.getElementById('cart-clear-btn').addEventListener('click', clearCart);
    document.getElementById('cart-checkout-btn').addEventListener('click', submitOrder);
    document.getElementById('cart-promo-apply').addEventListener('click', applyPromoCode);
    document.getElementById('cart-promo-remove').addEventListener('click', removePromoCode);
    document.getElementById('order-continue-btn').addEventListener('click', closeCart);
    document.getElementById('order-history-btn').addEventListener('click', renderOrderHistory);

    document.getElementById('cart-location').addEventListener('change', (event) => {
      selectedLocation = event.target.value;
      localStorage.setItem(LOCATION_KEY, selectedLocation);
      renderCart();
    });

    document.getElementById('cart-promo-category').addEventListener('change', (event) => {
      selectedPromoCategory = event.target.value;
      localStorage.setItem(PROMO_CATEGORY_KEY, selectedPromoCategory);
      const select = document.getElementById('cart-promo-code');
      if (select) select.innerHTML = promoCodeOptions();
      const message = document.getElementById('cart-promo-msg');
      if (message) message.textContent = '';
    });

    document.getElementById('cart-promo-code').addEventListener('change', (event) => {
      const input = document.getElementById('cart-promo-input');
      if (input && event.target.value) input.value = event.target.value;
      if (event.target.value) applyPromoCode();
    });

    document.getElementById('cart-promo-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyPromoCode();
      }
    });

    renderCart();
  }

  function setView(view) {
    const main = document.getElementById('cart-main-view');
    const confirmation = document.getElementById('cart-confirmation-view');
    if (main) main.hidden = view !== 'main';
    if (confirmation) confirmation.hidden = view !== 'confirmation';
  }

  function updatePromoState() {
    const box = document.getElementById('cart-promo-active');
    const code = document.getElementById('cart-promo-active-code');
    const select = document.getElementById('cart-promo-code');
    if (code) code.textContent = activePromoCode || '';
    if (box) box.hidden = !activePromoCode;
    if (select) select.value = activePromoCode || '';
  }

  function removePromoCode() {
    activePromoCode = '';
    localStorage.removeItem(PROMO_KEY);
    const input = document.getElementById('cart-promo-input');
    if (input) input.value = '';
    const message = document.getElementById('cart-promo-msg');
    if (message) {
      message.className = 'promo-msg';
      message.textContent = '';
    }
    renderCart();
    toast('Code promo retiré.');
  }

  function showOrderConfirmation(info) {
    confirmationOpen = true;
    setView('confirmation');
    const message = document.getElementById('order-success-message');
    const details = document.getElementById('order-success-details');
    const orderLabel = info.orderId || info.id || 'enregistrée';
    if (message) {
      message.textContent = `Commande ${orderLabel} terminée. Total : ${utils.formatPrice(info.total || 0)}.`;
    }
    if (details) {
      const location = data.getLocation(info.location);
      const itemCount = Array.isArray(info.items)
        ? info.items.reduce((sum, item) => sum + Math.max(1, Number(item.qty || 1)), 0)
        : 0;
      details.innerHTML = `
        <div class="summary-line"><span>Articles</span><span>${itemCount} article(s)</span></div>
        <div class="summary-line"><span>Livraison</span><span>${utils.escapeHtml(location.name)}</span></div>
        <div class="summary-line"><span>Code promo</span><span>${info.promoCode ? utils.escapeHtml(info.promoCode) : 'Aucun'}</span></div>
        <div class="summary-line"><span>Mode</span><span>${info.mode === 'hors-ligne' ? 'Hors ligne' : 'Serveur'}</span></div>
      `;
    }
  }

  function renderOrderHistory() {
    const details = document.getElementById('order-success-details');
    if (!details) return;
    const orders = readJSON(ORDER_KEY, []);
    if (!orders.length) {
      details.innerHTML = '<p class="order-history-empty">Aucune commande enregistrée.</p>';
      return;
    }
    details.innerHTML =
      '<h4 class="order-history-title">Mes dernières commandes</h4>' +
      orders
        .slice(0, 5)
        .map(
          (order) => `
            <div class="order-history-row">
              <span>${utils.escapeHtml(order.id || order.orderId || 'Commande')}</span>
              <strong>${utils.formatPrice(order.total || 0)}</strong>
            </div>
          `
        )
        .join('');
  }

  function openCart() {
    injectDrawer();
    setView(confirmationOpen ? 'confirmation' : 'main');
    if (!confirmationOpen) renderCart();
    const overlay = document.getElementById('cart-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (!overlay || !drawer) return;
    overlay.classList.add('open');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
    const closeButton = document.getElementById('cart-close-btn');
    if (closeButton) closeButton.focus();
  }

  function closeCart() {
    const overlay = document.getElementById('cart-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (overlay) overlay.classList.remove('open');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('cart-open');
  }

  function applyPromoCode() {
    const input = document.getElementById('cart-promo-input');
    const select = document.getElementById('cart-promo-code');
    const message = document.getElementById('cart-promo-msg');
    if (!input || !message) return;

    const code = String(input.value || select?.value || '').trim().toUpperCase();
    if (!code) {
      activePromoCode = '';
      localStorage.removeItem(PROMO_KEY);
      message.className = 'promo-msg';
      message.textContent = '';
      renderCart();
      return;
    }

    const promo = data.getPromo(code);
    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    if (!promo) {
      activePromoCode = '';
      localStorage.removeItem(PROMO_KEY);
      message.className = 'promo-msg promo-error';
      message.textContent = 'Code promo invalide.';
      renderCart();
      return;
    }

    if (subtotal < Number(promo.minAmount || 0)) {
      message.className = 'promo-msg promo-error';
      message.textContent = `Ce code nécessite un minimum de ${utils.formatPrice(promo.minAmount)} d’achat.`;
      return;
    }

    activePromoCode = promo.code;
    localStorage.setItem(PROMO_KEY, promo.code);
    message.className = 'promo-msg promo-success';
    message.textContent = `${promo.code} appliqué : ${promo.label}`;
    renderCart();
  }

  function addItem(product, qty) {
    if (!product || product.id == null) return;
    confirmationOpen = false;
    setView('main');
    const cart = getCart();
    const quantity = Math.max(1, Number(qty || 1));
    const color = String(product.color || 'Rouge');
    const existing = cart.find((item) => String(item.id) === String(product.id) && item.color === color);

    if (existing) {
      existing.qty += quantity;
    } else {
      cart.push({
        id: product.id,
        name: String(product.name || 'Produit ITHAVEN'),
        price: Number(product.price || 0),
        image: String(product.image || product.image_url || 'img/logo.png'),
        color,
        qty: quantity
      });
    }

    saveCart(cart);
    openCart();
    toast(`${product.name || 'Produit'} ajouté au panier.`);
  }

  function removeItem(index) {
    const cart = getCart();
    if (!cart[index]) return;
    const removed = cart.splice(index, 1)[0];
    saveCart(cart);
    renderCart();
    toast(`${removed.name} retiré du panier.`);
  }

  function setQty(index, qty) {
    const cart = getCart();
    if (!cart[index]) return;
    const nextQty = Number(qty);
    if (!Number.isFinite(nextQty) || nextQty < 1) {
      removeItem(index);
      return;
    }
    cart[index].qty = Math.min(99, Math.floor(nextQty));
    saveCart(cart);
    renderCart();
  }

  function clearCart() {
    confirmationOpen = false;
    setView('main');
    saveCart([]);
    activePromoCode = '';
    localStorage.removeItem(PROMO_KEY);
    renderCart();
    toast('Panier vidé.');
  }

  function renderCart() {
    if (confirmationOpen) return;
    const list = document.getElementById('cart-items-list');
    if (!list) return;

    const cart = getCart();
    const totals = data.calculateTotals(cart, selectedLocation, activePromoCode);

    if (activePromoCode && !totals.promo) {
      activePromoCode = '';
      localStorage.removeItem(PROMO_KEY);
      const message = document.getElementById('cart-promo-msg');
      if (message) {
        message.className = 'promo-msg promo-error';
        message.textContent = 'Le code promo n’est plus applicable à ce panier.';
      }
      const select = document.getElementById('cart-promo-code');
      if (select) select.value = '';
      const input = document.getElementById('cart-promo-input');
      if (input) input.value = '';
    }

    if (!cart.length) {
      list.innerHTML = `
        <div class="cart-empty-state">
          <i class="fas fa-shopping-bag"></i>
          <p>Ton panier est vide pour le moment.</p>
          <a href="shop.html" class="cart-empty-link">Découvrir la boutique</a>
        </div>
      `;
      updateSummary(data.calculateTotals([], selectedLocation, ''));
      updatePromoState();
      return;
    }

    list.innerHTML = cart
      .map((item, index) => {
        const lineTotal = item.price * item.qty;
        const colors = ['Rouge', 'Bleu', 'Vert']
          .map(
            (color) =>
              `<button type="button" class="color-dot ${item.color === color ? 'active' : ''}" data-action="color" data-color="${color}" title="${color}" aria-label="Couleur ${color}"></button>`
          )
          .join('');

        return `
          <div class="cart-item" data-index="${index}">
            <img src="${utils.escapeHtml(item.image)}" alt="${utils.escapeHtml(item.name)}" />
            <div class="cart-item-info">
              <div class="cart-item-top">
                <h3 class="cart-item-title">${utils.escapeHtml(item.name)}</h3>
                <button type="button" class="cart-remove-btn" data-action="remove" title="Retirer" aria-label="Retirer ${utils.escapeHtml(item.name)}"><i class="fas fa-trash"></i></button>
              </div>
              <div class="cart-item-price">${utils.formatPrice(item.price)}</div>
              <div class="cart-colors">
                <span>Couleur : <strong>${utils.escapeHtml(item.color)}</strong></span>
                ${colors}
              </div>
              <div class="cart-qty-row">
                <div class="qty-controls">
                  <button type="button" class="qty-btn" data-action="minus" aria-label="Diminuer la quantité">−</button>
                  <span class="qty-val">${item.qty}</span>
                  <button type="button" class="qty-btn" data-action="plus" aria-label="Augmenter la quantité">+</button>
                </div>
                <span class="cart-line-total">${utils.formatPrice(lineTotal)}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    list.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => {
        img.src = 'img/logo.png';
      });
    });

    list.querySelectorAll('.cart-item').forEach((row) => {
      const index = Number(row.dataset.index);
      row.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        const cartItems = getCart();
        if (!cartItems[index]) return;

        if (action === 'plus') setQty(index, cartItems[index].qty + 1);
        if (action === 'minus') setQty(index, cartItems[index].qty - 1);
        if (action === 'remove') removeItem(index);
        if (action === 'color') {
          cartItems[index].color = target.dataset.color;
          saveCart(cartItems);
          renderCart();
        }
      });
    });

    updateSummary(totals);
    updatePromoState();
  }

  function updateSummary(totals) {
    const subtotal = document.getElementById('cart-subtotal');
    const discount = document.getElementById('cart-discount');
    const shipping = document.getElementById('cart-shipping');
    const total = document.getElementById('cart-total');
    if (!subtotal || !discount || !shipping || !total) return;
    subtotal.textContent = utils.formatPrice(totals.subtotal);
    discount.textContent = '- ' + utils.formatPrice(totals.discount);
    shipping.textContent = totals.shipping === 0 ? 'Gratuit' : utils.formatPrice(totals.shipping);
    total.textContent = utils.formatPrice(totals.total);
  }

  async function submitOrder() {
    const cart = getCart();
    if (!cart.length) {
      toast('Ajoutez un produit avant de valider la commande.', 'error');
      return;
    }

    const button = document.getElementById('cart-checkout-btn');
    if (!button) return;
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Validation en cours...';

    const payload = {
      items: cart,
      location: selectedLocation,
      promoCode: activePromoCode || null
    };

    try {
      const token = localStorage.getItem('ithaven_token');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Erreur lors de la commande.');

      const confirmedOrder = { ...payload, total: result.total, orderId: result.orderId, mode: 'serveur' };
      storeLocalOrder(confirmedOrder);
      saveCart([]);
      activePromoCode = '';
      localStorage.removeItem(PROMO_KEY);
      showOrderConfirmation(confirmedOrder);
      toast(`Commande ${result.orderId || ''} enregistrée. Total : ${utils.formatPrice(result.total)}`);
    } catch (error) {
      if (error instanceof TypeError) {
        const confirmedOrder = {
          ...payload,
          total: data.calculateTotals(cart, selectedLocation, activePromoCode).total,
          mode: 'hors-ligne'
        };
        storeLocalOrder(confirmedOrder);
        saveCart([]);
        activePromoCode = '';
        localStorage.removeItem(PROMO_KEY);
        showOrderConfirmation(confirmedOrder);
        toast('Mode hors ligne : commande enregistrée localement.', 'error');
      } else {
        toast(error.message || 'Impossible de valider la commande.', 'error');
      }
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
      renderCart();
    }
  }

  function storeLocalOrder(order) {
    const orders = readJSON(ORDER_KEY, []);
    orders.unshift({
      ...order,
      id: order.orderId || `LOCAL-${Date.now()}`,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(ORDER_KEY, JSON.stringify(orders.slice(0, 20)));
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('#cart-btn, .cart-btn, [data-cart-open]');
    if (!trigger) return;
    if (trigger.tagName === 'A') event.preventDefault();
    openCart();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCart();
  });

  document.addEventListener('DOMContentLoaded', () => {
    injectDrawer();
    updateBadge();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) updateBadge();
  });

  window.ITHavenCart = {
    getCart,
    saveCart,
    addItem,
    removeItem,
    setQty,
    clearCart,
    openCart,
    closeCart,
    renderCart,
    updateBadge,
    toast,
    applyPromoCode,
    removePromoCode,
    getOrders: () => readJSON(ORDER_KEY, []),
    getTotals: () => data.calculateTotals(getCart(), selectedLocation, activePromoCode)
  };
})();
