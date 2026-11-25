(function () {
  'use strict';

  const TOKEN_KEY = 'ithaven_token';
  const STATUS_LABELS = {
    pending: 'En attente',
    paid: 'Payée',
    processing: 'En préparation',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée'
  };
  const PROMO_LABELS = {
    percent: 'Pourcentage',
    fixed: 'Montant fixe',
    free_shipping: 'Livraison offerte'
  };

  const state = {
    user: null,
    view: 'dashboard',
    categories: [],
    promoCategories: [],
    variants: [],
    variantProductId: null,
    variantEditId: null,
    importRows: [],
    dashboardTimer: null,
    products: { page: 1, limit: 10, search: '', category: 'all', total: 0 },
    orders: { page: 1, limit: 10, search: '', status: '', total: 0 },
    customers: { page: 1, limit: 10, search: '', segment: '', total: 0 },
    productsCache: [],
    ordersCache: [],
    customersCache: [],
    promoCache: [],
    flashCache: [],
    referralCache: [],
    cartCache: [],
    timers: {}
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatPrice(value) {
    const number = Number(value);
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number.isFinite(number) ? number : 0) + ' FCFA';
  }

  function formatDate(value) {
    if (!value) return '—';
    const raw = String(value);
    const hasTimezone = /(Z|z|[+-]\d{2}:?\d{2})$/.test(raw);
    const normalized = /^\d{4}-\d{2}-\d{2}[ T]/.test(raw) ? raw.replace(' ', 'T') + (hasTimezone ? '' : 'Z') : raw;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return escapeHtml(raw);
    return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function toServerDate(value) {
    if (!value) return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  function debounce(key, callback, delay) {
    clearTimeout(state.timers[key]);
    state.timers[key] = setTimeout(callback, delay || 260);
  }

  function checked(value) {
    return value ? ' checked' : '';
  }

  function isTrue(value) {
    if (typeof value === 'boolean') return value;
    return ['1', 'true', 'oui', 'yes', 'on'].includes(String(value == null ? '' : value).toLowerCase());
  }

  function emptyRow(colspan, text) {
    return '<tr><td class="admin-empty" colspan="' + colspan + '">' + escapeHtml(text) + '</td></tr>';
  }

  function field(form, name) {
    return form.querySelector('[name="' + name + '"]');
  }

  function valueOf(form, name) {
    const element = field(form, name);
    return element ? element.value : '';
  }

  function toast(message, type) {
    const container = $('#adminToasts');
    if (!container) return;
    const item = document.createElement('div');
    item.className = 'admin-toast ' + (type || 'info');
    const icon = type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    item.innerHTML = '<i class="fas ' + icon + '"></i><span>' + escapeHtml(message) + '</span>';
    container.appendChild(item);
    setTimeout(() => {
      item.style.opacity = '0';
      setTimeout(() => item.remove(), 240);
    }, 4600);
  }

  function showStatus(message, type) {
    const element = $('#adminStatus');
    if (!element) return;
    if (!message) {
      element.hidden = true;
      element.textContent = '';
      return;
    }
    element.hidden = false;
    element.textContent = message;
    element.classList.toggle('error', type === 'error');
  }

  function redirectToAuth() {
    window.location.replace('auth.html');
  }

  async function api(path, options) {
    const settings = options || {};
    const headers = Object.assign({}, settings.headers || {});
    const hasBody = settings.body !== undefined;
    if (hasBody) headers['Content-Type'] = 'application/json';
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = 'Bearer ' + token;

    let response;
    try {
      response = await fetch(path, {
        method: settings.method || 'GET',
        headers,
        body: hasBody ? JSON.stringify(settings.body) : undefined,
        cache: 'no-store'
      });
    } catch (error) {
      if (!settings.silent) toast('Impossible de contacter le serveur.', 'error');
      throw error;
    }

    const contentType = response.headers.get('content-type') || '';
    let payload;
    if (contentType.indexOf('application/json') >= 0) {
      payload = await response.json().catch(() => ({}));
    } else {
      payload = await response.text();
    }

    if (response.status === 401 || response.status === 403) {
      redirectToAuth();
      const denied = new Error((payload && payload.message) || 'Accès refusé.');
      denied.status = response.status;
      throw denied;
    }

    if (!response.ok) {
      const message = (payload && (payload.message || payload.error)) || 'Erreur lors de la requête (' + response.status + ').';
      if (!settings.silent) toast(message, 'error');
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  async function downloadExport(endpoint, format, fallbackName) {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    let response;
    try {
      response = await fetch(endpoint + '?format=' + encodeURIComponent(format), { headers });
    } catch (error) {
      toast('Export impossible : serveur indisponible.', 'error');
      return;
    }
    if (response.status === 401 || response.status === 403) {
      redirectToAuth();
      return;
    }
    if (!response.ok) {
      let message = 'Erreur lors de l’export.';
      try {
        const result = await response.json();
        if (result.message) message = result.message;
      } catch (error) {
        message = 'Erreur lors de l’export.';
      }
      toast(message, 'error');
      return;
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const name = match ? match[1] : fallbackName;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('Export téléchargé avec succès.', 'success');
  }

  let lastFocused = null;

  function openModal(options) {
    const modal = $('#adminModal');
    const dialog = $('#adminModalDialog');
    const title = $('#adminModalTitle');
    const body = $('#adminModalBody');
    const foot = $('#adminModalFoot');
    if (!modal || !dialog || !title || !body || !foot) return;

    lastFocused = document.activeElement;
    title.textContent = options.title || '';
    body.innerHTML = options.body || '';
    if (options.footer) {
      foot.innerHTML = options.footer;
      foot.hidden = false;
    } else {
      foot.innerHTML = '';
      foot.hidden = true;
    }
    dialog.classList.toggle('wide', Boolean(options.wide));
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-modal-open');
    if (typeof options.onOpen === 'function') options.onOpen(body, foot);
    const first = body.querySelector('input:not([type="hidden"]), select, textarea, button');
    if (first) setTimeout(() => first.focus(), 0);
  }

  function closeModal() {
    const modal = $('#adminModal');
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-modal-open');
    $('#adminModalBody').innerHTML = '';
    $('#adminModalFoot').innerHTML = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function statusBadge(status) {
    const key = String(status || '').toLowerCase();
    const tone = /^[a-z]+$/.test(key) ? key : 'inactive';
    return '<span class="admin-badge admin-status-' + escapeHtml(tone) + '">' + escapeHtml(STATUS_LABELS[key] || status || 'Inconnu') + '</span>';
  }

  function segmentBadge(segment) {
    const raw = String(segment || '');
    const key = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '') || 'inactive';
    return '<span class="admin-badge admin-badge-' + escapeHtml(key) + '">' + escapeHtml(raw || '—') + '</span>';
  }

  function statusOptions(current) {
    return Object.keys(STATUS_LABELS).map((status) => {
      return '<option value="' + status + '"' + (String(current) === status ? ' selected' : '') + '>' + escapeHtml(STATUS_LABELS[status]) + '</option>';
    }).join('');
  }

  function renderPagination(target) {
    const element = $('[data-pagination-target="' + target + '"]');
    if (!element) return;
    const settings = state[target];
    if (!settings) return;
    const total = Number(settings.total || 0);
    const page = Math.max(1, Number(settings.page || 1));
    const limit = Math.max(1, Number(settings.limit || 10));
    const pages = Math.max(1, Math.ceil(total / limit));
    const from = total ? (page - 1) * limit + 1 : 0;
    const to = Math.min(total, page * limit);
    let html = '<span class="admin-pagination-info">' + from + '–' + to + ' sur ' + total + '</span>';
    html += '<button type="button" class="admin-page-btn" data-page="' + (page - 1) + '" aria-label="Page précédente"' + (page <= 1 ? ' disabled' : '') + '><i class="fas fa-chevron-left"></i></button>';
    const start = Math.max(1, Math.min(page - 2, Math.max(1, pages - 4)));
    const end = Math.min(pages, start + 4);
    for (let number = start; number <= end; number += 1) {
      html += '<button type="button" class="admin-page-btn' + (number === page ? ' active' : '') + '" data-page="' + number + '" aria-label="Page ' + number + '"' + (number === page ? ' aria-current="page"' : '') + '>' + number + '</button>';
    }
    html += '<button type="button" class="admin-page-btn" data-page="' + (page + 1) + '" aria-label="Page suivante"' + (page >= pages ? ' disabled' : '') + '><i class="fas fa-chevron-right"></i></button>';
    element.innerHTML = html;
  }

  async function verifyAdmin() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      redirectToAuth();
      return false;
    }
    try {
      const result = await api('/api/admin/me', { silent: true });
      const user = result && result.user ? result.user : result;
      if (!user || String(user.role || '').toLowerCase() !== 'admin') {
        redirectToAuth();
        return false;
      }
      state.user = user;
      const name = $('#adminUserName');
      if (name) name.textContent = user.name || 'Administrateur';
      showStatus('');
      return true;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        redirectToAuth();
        return false;
      }
      showStatus('Impossible de vérifier vos droits administrateur. Rechargez la page.', 'error');
      return false;
    }
  }

  function startClock() {
    const element = $('#adminClock');
    if (!element) return;
    const update = () => {
      element.textContent = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    };
    update();
    setInterval(update, 30000);
  }

  function setView(view) {
    if (!view) return;
    state.view = view;
    $$('.admin-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view));
    $$('.admin-view').forEach((section) => {
      const active = section.dataset.view === view;
      section.classList.toggle('active', active);
      section.hidden = !active;
    });
    stopDashboardPolling();
    const loaders = {
      dashboard: loadDashboard,
      catalogue: loadCatalogue,
      commandes: loadOrders,
      marketing: loadMarketing,
      crm: loadCustomers
    };
    const loader = loaders[view];
    if (loader) loader().catch(() => {});
    if (view === 'dashboard') startDashboardPolling();
  }

  function startDashboardPolling() {
    stopDashboardPolling();
    state.dashboardTimer = setInterval(() => {
      if (state.view === 'dashboard' && !$('#adminModal').classList.contains('open')) loadDashboard().catch(() => {});
    }, 30000);
  }

  function stopDashboardPolling() {
    if (state.dashboardTimer) clearInterval(state.dashboardTimer);
    state.dashboardTimer = null;
  }

  async function loadDashboard() {
    const data = await api('/api/admin/dashboard', { silent: true });
    renderDashboard(data || {});
  }

  function renderDashboard(data) {
    const stats = [
      { label: 'Chiffre d’affaires', icon: 'fa-coins', value: formatPrice(data.revenue), hint: 'Hors commandes annulées' },
      { label: 'Commandes', icon: 'fa-bag-shopping', value: String(data.orders || 0), hint: 'Toutes commandes confondues' },
      { label: 'Panier moyen', icon: 'fa-cart-arrow-down', value: formatPrice(data.averageOrder), hint: 'Par commande facturable' },
      { label: 'Taux de conversion', icon: 'fa-percent', value: Number(data.conversionRate || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %', hint: Number(data.visits || 0).toLocaleString('fr-FR') + ' visiteurs enregistrés' }
    ];
    $('#dashboardStats').innerHTML = stats.map((item) => {
      return '<article class="admin-stat-card"><div class="admin-stat-card-label"><span>' + escapeHtml(item.label) + '</span><i class="fas ' + item.icon + '"></i></div><strong class="admin-stat-card-value">' + escapeHtml(item.value) + '</strong><span class="admin-stat-card-hint">' + escapeHtml(item.hint) + '</span></article>';
    }).join('');

    const sellers = Array.isArray(data.bestSellers) ? data.bestSellers : [];
    const max = Math.max(1, ...sellers.map((item) => Number(item.quantity || 0)));
    $('#dashboardBestSellers').innerHTML = sellers.length ? sellers.map((item) => {
      const width = Math.max(4, Math.round((Number(item.quantity || 0) / max) * 100));
      return '<div class="admin-bar-row"><div class="admin-bar-info"><span class="admin-bar-name">' + escapeHtml(item.name) + '</span><span class="admin-bar-meta">' + Number(item.quantity || 0) + ' vendus · ' + escapeHtml(formatPrice(item.revenue)) + '</span></div><div class="admin-bar-track" role="img" aria-label="' + escapeHtml(item.name + ' : ' + item.quantity + ' ventes') + '"><div class="admin-bar-fill" style="width:' + width + '%"></div></div></div>';
    }).join('') : '<p class="admin-empty">Aucune vente enregistrée pour le moment.</p>';

    const lowStock = Array.isArray(data.lowStock) ? data.lowStock : [];
    $('#dashboardLowStock').innerHTML = lowStock.length ? lowStock.map((item) => {
      const stock = Number(item.stock || 0);
      return '<tr><td><strong>' + escapeHtml(item.name) + '</strong></td><td>' + stock + '</td><td>' + (stock <= 0 ? '<span class="admin-badge admin-badge-cancelled">Rupture</span>' : '<span class="admin-badge admin-badge-pending">Stock faible</span>') + '</td></tr>';
    }).join('') : emptyRow(3, 'Aucune alerte de stock.');

    const recent = Array.isArray(data.recentOrders) ? data.recentOrders : [];
    $('#dashboardRecentOrders').innerHTML = recent.length ? recent.map((order) => {
      return '<tr><td><strong>#' + escapeHtml(order.id) + '</strong></td><td>' + escapeHtml(order.customer || 'Invité') + '<span class="admin-cell-sub">' + escapeHtml(order.customer_email || '') + '</span></td><td>' + escapeHtml(order.location || '—') + '</td><td>' + escapeHtml(formatPrice(order.total_amount)) + '</td><td>' + statusBadge(order.status) + '</td><td>' + escapeHtml(formatDate(order.created_at)) + '</td><td><button type="button" class="admin-btn admin-btn-sm" data-action="order-detail" data-id="' + escapeHtml(order.id) + '">Voir</button></td></tr>';
    }).join('') : emptyRow(7, 'Aucune commande récente.');
  }

  function fallbackCategories() {
    const products = window.ITHAVEN_DATA && Array.isArray(window.ITHAVEN_DATA.products) ? window.ITHAVEN_DATA.products : [];
    const seen = new Map();
    products.forEach((product) => {
      if (product.categorySlug && !seen.has(product.categorySlug)) seen.set(product.categorySlug, { id: product.categorySlug, slug: product.categorySlug, name: product.category || product.categorySlug });
    });
    return Array.from(seen.values());
  }

  function categoryOptions(current) {
    const categories = state.categories.length ? state.categories : fallbackCategories();
    return categories.map((category) => {
      const value = category.slug || category.name || category.id;
      const active = String(current || '') === String(value) || String(current || '') === String(category.name || '');
      return '<option value="' + escapeHtml(value) + '"' + (active ? ' selected' : '') + '>' + escapeHtml(category.name || value) + '</option>';
    }).join('');
  }

  async function loadCategories() {
    try {
      const result = await api('/api/categories/counts', { silent: true });
      if (result && Array.isArray(result.categories)) state.categories = result.categories;
    } catch (error) {
      state.categories = fallbackCategories();
    }
    const select = $('#productCategory');
    if (select) {
      const current = state.products.category;
      select.innerHTML = '<option value="all">Toutes les catégories</option>' + categoryOptions(current === 'all' ? '' : current);
      select.value = current;
    }
  }

  async function loadCatalogue() {
    await loadCategories();
    await loadProducts();
  }

  async function loadProducts() {
    const query = new URLSearchParams({
      page: String(state.products.page),
      limit: String(state.products.limit),
      search: state.products.search,
      category: state.products.category
    });
    const data = await api('/api/admin/products?' + query.toString(), { silent: true });
    state.productsCache = Array.isArray(data.products) ? data.products : [];
    state.products.total = Number(data.total || 0);
    renderProducts();
    renderPagination('products');
  }

  function renderProducts() {
    const body = $('#productsBody');
    if (!body) return;
    if (!state.productsCache.length) {
      body.innerHTML = emptyRow(8, 'Aucun produit ne correspond à ces filtres.');
      return;
    }
    body.innerHTML = state.productsCache.map((product) => {
      const image = product.image_url || 'img/logo.png';
      const stock = Number(product.stock || 0);
      const promo = product.promo_price == null || product.promo_price === '' ? null : formatPrice(product.promo_price);
      const variants = Array.isArray(product.variants) ? product.variants.length : 0;
      return '<tr>' +
        '<td><div class="admin-cell-main"><img class="admin-thumb" src="' + escapeHtml(image) + '" alt="" loading="lazy"><div><strong>' + escapeHtml(product.name) + '</strong><span class="admin-cell-sub">' + escapeHtml(product.slug || '') + '</span></div></div></td>' +
        '<td>' + escapeHtml(product.category || '—') + '</td>' +
        '<td>' + escapeHtml(formatPrice(product.price)) + '</td>' +
        '<td>' + (promo ? '<span class="admin-badge admin-badge-pending">' + escapeHtml(promo) + '</span>' : '—') + '</td>' +
        '<td>' + (stock <= 0 ? '<span class="admin-badge admin-badge-cancelled">0</span>' : stock <= 5 ? '<span class="admin-badge admin-badge-pending">' + stock + '</span>' : String(stock)) + '</td>' +
        '<td>' + variants + '</td>' +
        '<td>' + (isTrue(product.is_new) ? '<span class="admin-badge admin-status-processing">Nouveau</span>' : '<span class="admin-badge">Standard</span>') + '</td>' +
        '<td><div class="admin-cell-actions"><button type="button" class="admin-btn admin-btn-sm" data-action="product-variants" data-id="' + escapeHtml(product.id) + '"><i class="fas fa-layer-group"></i> Variantes</button><button type="button" class="admin-btn admin-btn-sm" data-action="product-edit" data-id="' + escapeHtml(product.id) + '"><i class="fas fa-pen"></i> Modifier</button><button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-action="product-delete" data-id="' + escapeHtml(product.id) + '" aria-label="Supprimer ' + escapeHtml(product.name) + '"><i class="fas fa-trash"></i></button></div></td>' +
        '</tr>';
    }).join('');
  }

  function openProductForm(product) {
    const item = product || {};
    const body = '<form id="adminForm" class="admin-form" data-form="product" data-id="' + escapeHtml(item.id || '') + '">' +
      '<label class="admin-form-group"><span>Nom du produit *</span><input name="name" required maxlength="200" value="' + escapeHtml(item.name || '') + '"></label>' +
      '<label class="admin-form-group"><span>Slug</span><input name="slug" maxlength="220" placeholder="généré automatiquement" value="' + escapeHtml(item.slug || '') + '"></label>' +
      '<label class="admin-form-group"><span>Catégorie *</span><select name="category" required>' + categoryOptions(item.category_slug || item.category || '') + '</select></label>' +
      '<label class="admin-form-group"><span>Prix (FCFA) *</span><input name="price" type="number" min="0" step="1" required value="' + escapeHtml(item.price == null ? '' : item.price) + '"></label>' +
      '<label class="admin-form-group"><span>Prix promo (FCFA)</span><input name="promo_price" type="number" min="0" step="1" value="' + escapeHtml(item.promo_price == null ? '' : item.promo_price) + '"></label>' +
      '<label class="admin-form-group"><span>Stock *</span><input name="stock" type="number" min="0" step="1" required value="' + escapeHtml(item.stock == null ? 0 : item.stock) + '"></label>' +
      '<label class="admin-form-group full"><span>Image (URL ou chemin)</span><input name="image_url" maxlength="500" placeholder="img/produit.png" value="' + escapeHtml(item.image_url || '') + '"></label>' +
      '<label class="admin-form-group full"><span>Description</span><textarea name="description" maxlength="10000">' + escapeHtml(item.description || '') + '</textarea></label>' +
      '<label class="admin-checkbox full"><input type="checkbox" name="is_new"' + checked(isTrue(item.is_new)) + '> Nouveauté</label>' +
      '</form>';
    openModal({
      title: item.id ? 'Modifier le produit' : 'Nouveau produit',
      wide: true,
      body,
      footer: '<button type="button" class="admin-btn" data-modal-close>Annuler</button><button type="submit" form="adminForm" class="admin-btn admin-btn-primary"><i class="fas fa-floppy-disk"></i> Enregistrer</button>'
    });
  }

  async function openVariants(productId) {
    const product = state.productsCache.find((item) => String(item.id) === String(productId));
    if (!product) {
      toast('Produit introuvable dans la liste affichée.', 'error');
      return;
    }
    let variants = [];
    try {
      const result = await api('/api/admin/products/' + encodeURIComponent(productId) + '/variants', { silent: true });
      variants = Array.isArray(result.variants) ? result.variants : [];
    } catch (error) {
      toast('Impossible de charger les déclinaisons.', 'error');
      return;
    }
    state.variants = variants;
    state.variantProductId = productId;
    state.variantEditId = null;

    const body = '<div class="admin-variant-bar"><span>Produit : <strong>' + escapeHtml(product.name) + '</strong></span><span id="variantCount"></span></div>' +
      '<form id="variantForm" class="admin-form admin-variant-form" data-form="variant" data-product-id="' + escapeHtml(productId) + '">' +
      '<label class="admin-form-group"><span>Nom *</span><input name="name" required maxlength="150" placeholder="128 Go"></label>' +
      '<label class="admin-form-group"><span>SKU</span><input name="sku" maxlength="100"></label>' +
      '<label class="admin-form-group"><span>Prix (FCFA)</span><input name="price" type="number" min="0" step="1"></label>' +
      '<label class="admin-form-group"><span>Stock *</span><input name="stock" type="number" min="0" step="1" value="0" required></label>' +
      '<label class="admin-form-group"><span>État</span><label class="admin-checkbox"><input type="checkbox" name="active" checked> Active</label></label>' +
      '<div class="admin-form-group"><button type="submit" class="admin-btn admin-btn-primary"><i class="fas fa-plus"></i> Ajouter</button></div>' +
      '</form>' +
      '<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>Nom</th><th>SKU</th><th>Prix</th><th>Stock</th><th>État</th><th>Actions</th></tr></thead><tbody id="variantRows"></tbody></table></div>';

    openModal({
      title: 'Déclinaisons du produit',
      wide: true,
      body,
      footer: '<button type="button" class="admin-btn" data-modal-close>Fermer</button>',
      onOpen: renderVariantList
    });
  }

  function renderVariantList() {
    const rows = $('#variantRows');
    const count = $('#variantCount');
    if (!rows) return;
    if (count) count.textContent = state.variants.length + ' déclinaison(s)';
    if (!state.variants.length) {
      rows.innerHTML = emptyRow(6, 'Aucune déclinaison pour ce produit.');
    } else {
      rows.innerHTML = state.variants.map((variant) => {
        return '<tr><td><strong>' + escapeHtml(variant.name) + '</strong></td><td>' + escapeHtml(variant.sku || '—') + '</td><td>' + (variant.price == null ? 'Prix du produit' : escapeHtml(formatPrice(variant.price))) + '</td><td>' + escapeHtml(variant.stock) + '</td><td>' + (isTrue(variant.active) ? '<span class="admin-badge admin-status-paid">Active</span>' : '<span class="admin-badge admin-badge-inactive">Inactive</span>') + '</td><td><div class="admin-cell-actions"><button type="button" class="admin-btn admin-btn-sm" data-action="variant-edit" data-id="' + escapeHtml(variant.id) + '"><i class="fas fa-pen"></i></button><button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-action="variant-delete" data-id="' + escapeHtml(variant.id) + '"><i class="fas fa-trash"></i></button></div></td></tr>';
      }).join('');
    }
    const form = $('#variantForm');
    if (!form) return;
    if (state.variantEditId) {
      form.dataset.variantId = String(state.variantEditId);
      const button = form.querySelector('button[type="submit"]');
      if (button) button.innerHTML = '<i class="fas fa-check"></i> Enregistrer';
    } else {
      delete form.dataset.variantId;
      const button = form.querySelector('button[type="submit"]');
      if (button) button.innerHTML = '<i class="fas fa-plus"></i> Ajouter';
    }
  }

  async function reloadVariants(productId) {
    const result = await api('/api/admin/products/' + encodeURIComponent(productId) + '/variants', { silent: true });
    state.variants = Array.isArray(result.variants) ? result.variants : [];
    state.variantEditId = null;
    renderVariantList();
    await loadProducts();
  }

  function openImportModal() {
    state.importRows = [];
    const body = '<form id="adminForm" class="admin-form" data-form="import">' +
      '<label class="admin-form-group full"><span>Fichier CSV, XLSX ou XLS *</span><input type="file" name="file" accept=".csv,.xlsx,.xls" required></label>' +
      '<label class="admin-form-group full"><span>Mode d’import</span><select name="mode"><option value="create">Créer les produits</option><option value="update">Mettre à jour les produits (id ou slug)</option></select></label>' +
      '<p class="admin-form-hint full">Colonnes attendues : name, slug, category, price, promo_price, stock, is_new, image_url, description. 500 lignes maximum.</p>' +
      '</form><div id="importPreview" class="admin-preview" hidden></div>';
    openModal({
      title: 'Importer des produits',
      wide: true,
      body,
      footer: '<button type="button" class="admin-btn" data-modal-close>Annuler</button><button type="submit" form="adminForm" class="admin-btn admin-btn-primary"><i class="fas fa-file-import"></i> Importer</button>'
    });
  }

  async function readImportFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (typeof window.XLSX === 'undefined') {
      toast('SheetJS est indisponible : import impossible.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = window.XLSX.read(new Uint8Array(reader.result), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true }).slice(0, 500);
        state.importRows = rows;
        renderImportPreview(rows);
        if (!rows.length) toast('Aucune ligne lisible dans ce fichier.', 'error');
      } catch (error) {
        state.importRows = [];
        toast('Lecture du fichier impossible : ' + error.message, 'error');
      }
    };
    reader.onerror = () => toast('Lecture du fichier impossible.', 'error');
    reader.readAsArrayBuffer(file);
  }

  function renderImportPreview(rows) {
    const preview = $('#importPreview');
    if (!preview) return;
    if (!rows.length) {
      preview.hidden = true;
      preview.innerHTML = '';
      return;
    }
    const columns = Object.keys(rows[0]).slice(0, 8);
    const head = columns.map((column) => '<th>' + escapeHtml(column) + '</th>').join('');
    const body = rows.slice(0, 5).map((row) => '<tr>' + columns.map((column) => '<td>' + escapeHtml(row[column]) + '</td>').join('') + '</tr>').join('');
    preview.hidden = false;
    preview.innerHTML = '<table class="admin-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table><p class="admin-form-hint" style="padding:8px 12px">Aperçu : 5 lignes sur ' + rows.length + '.</p>';
  }

  async function loadOrders() {
    const query = new URLSearchParams({
      page: String(state.orders.page),
      limit: String(state.orders.limit),
      status: state.orders.status,
      search: state.orders.search
    });
    const data = await api('/api/admin/orders?' + query.toString(), { silent: true });
    state.ordersCache = Array.isArray(data.orders) ? data.orders : [];
    state.orders.total = Number(data.total || 0);
    renderOrders();
    renderPagination('orders');
  }

  function renderOrders() {
    const body = $('#ordersBody');
    if (!body) return;
    if (!state.ordersCache.length) {
      body.innerHTML = emptyRow(7, 'Aucune commande ne correspond à ces filtres.');
      return;
    }
    body.innerHTML = state.ordersCache.map((order) => {
      const paid = String(order.status) === 'paid';
      return '<tr>' +
        '<td><strong>#' + escapeHtml(order.id) + '</strong></td>' +
        '<td>' + escapeHtml(order.customer || 'Invité') + '<span class="admin-cell-sub">' + escapeHtml(order.customer_email || '') + '</span></td>' +
        '<td>' + escapeHtml(order.location || '—') + '</td>' +
        '<td>' + escapeHtml(formatPrice(order.total_amount)) + '</td>' +
        '<td><select class="admin-btn admin-btn-sm" data-order-status="' + escapeHtml(order.id) + '" aria-label="Statut de la commande ' + escapeHtml(order.id) + '">' + statusOptions(order.status) + '</select></td>' +
        '<td>' + escapeHtml(formatDate(order.created_at)) + '</td>' +
        '<td><div class="admin-cell-actions"><button type="button" class="admin-btn admin-btn-sm admin-btn-primary" data-action="order-confirm" data-id="' + escapeHtml(order.id) + '"' + (paid ? ' disabled' : '') + '><i class="fas fa-check"></i> Confirmer la commande</button><button type="button" class="admin-btn admin-btn-sm" data-action="order-detail" data-id="' + escapeHtml(order.id) + '">Détails</button><button type="button" class="admin-btn admin-btn-sm" data-action="order-doc" data-doc="invoice" data-id="' + escapeHtml(order.id) + '">Facture</button><button type="button" class="admin-btn admin-btn-sm" data-action="order-doc" data-doc="delivery" data-id="' + escapeHtml(order.id) + '">Bon de livraison</button></div></td>' +
        '</tr>';
    }).join('');
  }

  async function changeOrderStatus(id, status) {
    if (!STATUS_LABELS[status]) {
      toast('Statut invalide.', 'error');
      return;
    }
    await api('/api/admin/orders/' + encodeURIComponent(id) + '/status', { method: 'PATCH', body: { status } });
    toast('Statut mis à jour : ' + STATUS_LABELS[status] + '.', 'success');
    await loadOrders();
    if (state.view === 'dashboard') loadDashboard().catch(() => {});
  }

  async function openOrderDetails(id) {
    let order;
    try {
      const result = await api('/api/admin/orders/' + encodeURIComponent(id), { silent: true });
      order = result.order;
    } catch (error) {
      toast('Commande introuvable.', 'error');
      return;
    }
    const items = Array.isArray(order.items) ? order.items : [];
    const body = '<div class="admin-document-meta" style="text-align:left;margin-bottom:14px"><strong>Commande #' + escapeHtml(order.id) + '</strong><span>' + escapeHtml(formatDate(order.created_at)) + ' · ' + escapeHtml(order.location || '—') + '</span></div>' +
      '<div class="admin-variant-bar"><span>Client : <strong>' + escapeHtml(order.customer || 'Invité') + '</strong></span><span>' + statusBadge(order.status) + '</span></div>' +
      '<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>Article</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody>' +
      (items.length ? items.map((item) => '<tr><td>' + escapeHtml(item.name) + '</td><td>' + escapeHtml(item.quantity) + '</td><td>' + escapeHtml(formatPrice(item.unit_price)) + '</td><td>' + escapeHtml(formatPrice(item.total)) + '</td></tr>').join('') : emptyRow(4, 'Aucun article.')) +
      '</tbody></table></div>' +
      '<div class="admin-document-totals"><div><span>Sous-total</span><strong>' + escapeHtml(formatPrice(order.subtotal)) + '</strong></div><div><span>Remise</span><strong>' + escapeHtml(formatPrice(order.discount)) + '</strong></div><div><span>Livraison</span><strong>' + escapeHtml(formatPrice(order.shipping)) + '</strong></div><div class="total"><span>Total</span><strong>' + escapeHtml(formatPrice(order.total)) + '</strong></div></div>';
    openModal({
      title: 'Détails de la commande #' + id,
      wide: true,
      body,
      footer: '<button type="button" class="admin-btn" data-modal-close>Fermer</button><button type="button" class="admin-btn" data-action="order-doc" data-doc="invoice" data-id="' + escapeHtml(id) + '"><i class="fas fa-file-invoice"></i> Facture</button><button type="button" class="admin-btn" data-action="order-doc" data-doc="delivery" data-id="' + escapeHtml(id) + '"><i class="fas fa-truck"></i> Bon de livraison</button>'
    });
  }

  function documentTemplate(doc, type) {
    const isInvoice = type === 'invoice';
    const client = doc.client || doc.customer || {};
    const items = Array.isArray(doc.items) ? doc.items : [];
    const title = isInvoice ? 'FACTURE' : 'BON DE LIVRAISON';
    const number = doc.number || doc.numero || '—';
    const rows = items.map((item) => '<tr><td>' + escapeHtml(item.name) + '</td><td>' + escapeHtml(item.quantity) + '</td>' + (isInvoice ? '<td>' + escapeHtml(formatPrice(item.unit_price)) + '</td><td>' + escapeHtml(formatPrice(item.total)) + '</td>' : '') + '</tr>').join('');
    let totals = '';
    if (isInvoice) {
      totals = '<div class="admin-document-totals"><div><span>Sous-total</span><strong>' + escapeHtml(formatPrice(doc.subtotal)) + '</strong></div><div><span>Remise</span><strong>' + escapeHtml(formatPrice(doc.discount)) + '</strong></div><div><span>Livraison</span><strong>' + escapeHtml(formatPrice(doc.shipping)) + '</strong></div><div class="total"><span>Total à payer</span><strong>' + escapeHtml(formatPrice(doc.total)) + '</strong></div></div>';
    } else {
      totals = '<div class="admin-document-totals"><div class="total"><span>Articles à livrer</span><strong>' + escapeHtml(doc.total_quantity == null ? items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : doc.total_quantity) + '</strong></div></div>';
    }
    return '<div class="admin-document">' +
      '<div class="admin-document-head"><div><h3>IT HAVEN</h3><span>REFERENCE TECH. — Lomé, Togo</span></div><div class="admin-document-meta"><strong>' + title + ' N° ' + escapeHtml(number) + '</strong><span>Date : ' + escapeHtml(formatDate(doc.date || doc.created_at)) + '</span><span>Commande #' + escapeHtml(doc.orderId || '') + '</span></div></div>' +
      '<div class="admin-document-client"><div><span class="admin-document-label">Client</span><strong>' + escapeHtml(client.name || 'Invité') + '</strong><br>' + escapeHtml(client.email || '') + '<br>' + escapeHtml(client.phone || '') + '</div><div><span class="admin-document-label">' + (isInvoice ? 'Adresse de facturation' : 'Adresse de livraison') + '</span>' + escapeHtml(doc.address || doc.location || '—') + (doc.promo ? '<br>Code promo : ' + escapeHtml(doc.promo) : '') + '</div></div>' +
      '<table><thead><tr><th>Désignation</th><th>Qté</th>' + (isInvoice ? '<th>Prix unitaire</th><th>Total</th>' : '') + '</tr></thead><tbody>' + (rows || '<tr><td colspan="4">Aucun article.</td></tr>') + '</tbody></table>' +
      totals +
      '<div class="admin-document-mentions">' + (isInvoice ? (doc.mentionsLegales || []).map((line) => '<p>' + escapeHtml(line) + '</p>').join('') : '<p>Bon de livraison généré électroniquement par IT Haven.</p><p>Veuillez vérifier les articles à la réception.</p>') + '</div>' +
      '</div>';
  }

  async function openDocument(id, type) {
    const endpoint = type === 'invoice' ? 'invoice' : 'delivery';
    let doc;
    try {
      const result = await api('/api/admin/orders/' + encodeURIComponent(id) + '/' + endpoint, { silent: true });
      doc = result.invoice || result.delivery;
    } catch (error) {
      toast('Document indisponible.', 'error');
      return;
    }
    if (!doc) {
      toast('Document indisponible.', 'error');
      return;
    }
    openModal({
      title: type === 'invoice' ? 'Facture' : 'Bon de livraison',
      wide: true,
      body: documentTemplate(doc, type),
      footer: '<button type="button" class="admin-btn" data-modal-close>Fermer</button><button type="button" class="admin-btn admin-btn-primary" data-action="print"><i class="fas fa-print"></i> Imprimer</button>'
    });
  }

  async function loadMarketing() {
    const [promoResult, loyaltyResult, cartsResult] = await Promise.all([
      api('/api/admin/promos', { silent: true }),
      api('/api/admin/loyalty', { silent: true }),
      api('/api/admin/abandoned-carts', { silent: true })
    ]);
    const promos = promoResult || {};
    state.promoCategories = Array.isArray(promos.categories) ? promos.categories : [];
    state.promoCache = Array.isArray(promos.codes) ? promos.codes : [];
    state.flashCache = Array.isArray(promos.flashSales) ? promos.flashSales : [];
    state.referralCache = loyaltyResult && Array.isArray(loyaltyResult.referrals) ? loyaltyResult.referrals : [];
    state.cartCache = cartsResult && Array.isArray(cartsResult.carts) ? cartsResult.carts : [];
    renderPromos();
    renderFlashSales();
    renderReferrals();
    renderLoyalty(loyaltyResult && Array.isArray(loyaltyResult.members) ? loyaltyResult.members : []);
    renderCarts();
  }

  function renderPromos() {
    const body = $('#promoBody');
    if (!body) return;
    body.innerHTML = state.promoCache.length ? state.promoCache.map((promo) => {
      const value = promo.type === 'free_shipping' ? '—' : promo.type === 'percent' ? Number(promo.value || 0) + ' %' : formatPrice(promo.value);
      return '<tr><td><strong>' + escapeHtml(promo.code) + '</strong></td><td>' + escapeHtml(promo.label || '—') + '</td><td>' + escapeHtml(PROMO_LABELS[promo.type] || promo.type || '—') + '</td><td>' + escapeHtml(value) + '</td><td>' + escapeHtml(formatPrice(promo.min_amount)) + '</td><td>' + escapeHtml(formatDate(promo.expires_at)) + '</td><td>' + (isTrue(promo.active) ? '<span class="admin-badge admin-status-paid">Actif</span>' : '<span class="admin-badge admin-badge-inactive">Inactif</span>') + '</td><td><div class="admin-cell-actions"><button type="button" class="admin-btn admin-btn-sm" data-action="promo-edit" data-id="' + escapeHtml(promo.id) + '"><i class="fas fa-pen"></i></button><button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-action="promo-delete" data-id="' + escapeHtml(promo.id) + '"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('') : emptyRow(8, 'Aucun code de réduction.');
  }

  function renderFlashSales() {
    const body = $('#flashBody');
    if (!body) return;
    body.innerHTML = state.flashCache.length ? state.flashCache.map((sale) => {
      return '<tr><td>' + escapeHtml(sale.product_name || ('Produit #' + sale.product_id)) + '</td><td><span class="admin-badge admin-badge-pending">-' + escapeHtml(sale.discount_percent) + ' %</span></td><td>' + escapeHtml(formatDate(sale.starts_at)) + '</td><td>' + escapeHtml(formatDate(sale.ends_at)) + '</td><td><button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-action="flash-delete" data-id="' + escapeHtml(sale.id) + '"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('') : emptyRow(5, 'Aucune vente flash.');
  }

  function renderReferrals() {
    const body = $('#referralBody');
    if (!body) return;
    body.innerHTML = state.referralCache.length ? state.referralCache.map((referral) => {
      return '<tr><td><strong>' + escapeHtml(referral.code) + '</strong></td><td>' + escapeHtml(formatPrice(referral.reward)) + '</td><td>' + escapeHtml(formatPrice(referral.discount)) + '</td><td>' + (isTrue(referral.active) ? '<span class="admin-badge admin-status-paid">Actif</span>' : '<span class="admin-badge admin-badge-inactive">Inactif</span>') + '</td><td><button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-action="referral-delete" data-id="' + escapeHtml(referral.id) + '"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('') : emptyRow(5, 'Aucun code de parrainage.');
  }

  function renderLoyalty(members) {
    const body = $('#loyaltyBody');
    if (!body) return;
    body.innerHTML = members.length ? members.map((member) => {
      return '<tr><td><strong>' + escapeHtml(member.name) + '</strong></td><td>' + escapeHtml(member.email) + '</td><td>' + escapeHtml(member.points) + '</td><td>' + segmentBadge(member.tier) + '</td><td>' + escapeHtml(formatPrice(member.totalSpent)) + '</td><td>' + escapeHtml(member.ordersCount) + '</td></tr>';
    }).join('') : emptyRow(6, 'Aucun membre fidélité.');
  }

  function renderCarts() {
    const body = $('#cartsBody');
    if (!body) return;
    body.innerHTML = state.cartCache.length ? state.cartCache.map((cart) => {
      return '<tr><td><input type="checkbox" data-cart-check value="' + escapeHtml(cart.id) + '" aria-label="Sélectionner le panier ' + escapeHtml(cart.id) + '"></td><td>' + escapeHtml(cart.email || 'Email inconnu') + '</td><td>' + escapeHtml(cart.items_count) + '</td><td>' + escapeHtml(formatPrice(cart.total)) + '</td><td>' + escapeHtml(formatDate(cart.updated_at)) + '</td><td>' + (cart.reminded_at ? escapeHtml(formatDate(cart.reminded_at)) : '<span class="admin-badge admin-badge-pending">Jamais</span>') + '</td></tr>';
    }).join('') : emptyRow(6, 'Aucun panier abandonné.');
  }

  function promoCategoryOptions(current) {
    return state.promoCategories.map((category) => {
      const active = String(current == null ? '' : current) === String(category.id);
      return '<option value="' + escapeHtml(category.id) + '"' + (active ? ' selected' : '') + '>' + escapeHtml(category.name) + '</option>';
    }).join('');
  }

  function openPromoForm(promo) {
    const item = promo || {};
    const type = item.type || 'percent';
    const body = '<form id="adminForm" class="admin-form" data-form="promo" data-id="' + escapeHtml(item.id || '') + '">' +
      '<label class="admin-form-group"><span>Code *</span><input name="code" required maxlength="50" value="' + escapeHtml(item.code || '') + '"></label>' +
      '<label class="admin-form-group"><span>Libellé</span><input name="label" maxlength="150" value="' + escapeHtml(item.label || '') + '"></label>' +
      '<label class="admin-form-group"><span>Type *</span><select name="type">' + Object.keys(PROMO_LABELS).map((key) => '<option value="' + key + '"' + (key === type ? ' selected' : '') + '>' + escapeHtml(PROMO_LABELS[key]) + '</option>').join('') + '</select></label>' +
      '<label class="admin-form-group"><span>Valeur</span><input name="value" type="number" min="0" step="1" value="' + escapeHtml(item.value == null ? 0 : item.value) + '"></label>' +
      '<label class="admin-form-group"><span>Montant minimum (FCFA)</span><input name="min_amount" type="number" min="0" step="1" value="' + escapeHtml(item.min_amount == null ? 0 : item.min_amount) + '"></label>' +
      '<label class="admin-form-group"><span>Catégorie promo *</span><select name="category_id" required>' + promoCategoryOptions(item.category_id) + '</select></label>' +
      '<label class="admin-form-group"><span>Expiration</span><input name="expires_at" type="date" value="' + escapeHtml(item.expires_at ? String(item.expires_at).slice(0, 10) : '') + '"></label>' +
      '<label class="admin-checkbox"><input type="checkbox" name="active"' + checked(item.id ? isTrue(item.active) : true) + '> Actif</label>' +
      '</form>';
    openModal({
      title: item.id ? 'Modifier le code promo' : 'Nouveau code promo',
      body,
      footer: '<button type="button" class="admin-btn" data-modal-close>Annuler</button><button type="submit" form="adminForm" class="admin-btn admin-btn-primary"><i class="fas fa-floppy-disk"></i> Enregistrer</button>'
    });
  }

  async function openFlashForm() {
    if (!state.productsCache.length) {
      try {
        const result = await api('/api/admin/products?page=1&limit=100', { silent: true });
        state.productsCache = Array.isArray(result.products) ? result.products : [];
      } catch (error) {
        toast('Impossible de charger les produits.', 'error');
        return;
      }
    }
    const options = state.productsCache.map((product) => '<option value="' + escapeHtml(product.id) + '">' + escapeHtml(product.name) + '</option>').join('');
    const body = '<form id="adminForm" class="admin-form" data-form="flash">' +
      '<label class="admin-form-group full"><span>Produit *</span><select name="product_id" required>' + options + '</select></label>' +
      '<label class="admin-form-group"><span>Remise (%) *</span><input name="discountPercent" type="number" min="1" max="100" step="1" value="20" required></label>' +
      '<label class="admin-form-group"><span>Début</span><input name="startsAt" type="datetime-local"></label>' +
      '<label class="admin-form-group"><span>Fin</span><input name="endsAt" type="datetime-local"></label>' +
      '<label class="admin-checkbox"><input type="checkbox" name="active" checked> Active</label>' +
      '</form>';
    openModal({
      title: 'Nouvelle vente flash',
      body,
      footer: '<button type="button" class="admin-btn" data-modal-close>Annuler</button><button type="submit" form="adminForm" class="admin-btn admin-btn-primary"><i class="fas fa-bolt"></i> Créer</button>'
    });
  }

  function openReferralForm() {
    const body = '<form id="adminForm" class="admin-form" data-form="referral">' +
      '<label class="admin-form-group full"><span>Code de parrainage *</span><input name="code" required maxlength="50" placeholder="PARRAIN10"></label>' +
      '<label class="admin-form-group"><span>Récompense (FCFA) *</span><input name="reward" type="number" min="0" step="1" value="5000" required></label>' +
      '<label class="admin-form-group"><span>Remise (FCFA) *</span><input name="discount" type="number" min="0" step="1" value="2000" required></label>' +
      '<label class="admin-checkbox full"><input type="checkbox" name="active" checked> Actif</label>' +
      '</form>';
    openModal({
      title: 'Nouveau code de parrainage',
      body,
      footer: '<button type="button" class="admin-btn" data-modal-close>Annuler</button><button type="submit" form="adminForm" class="admin-btn admin-btn-primary"><i class="fas fa-floppy-disk"></i> Créer</button>'
    });
  }

  async function loadCustomers() {
    const query = new URLSearchParams({ search: state.customers.search, segment: state.customers.segment });
    const data = await api('/api/admin/customers?' + query.toString(), { silent: true });
    state.customersCache = Array.isArray(data.customers) ? data.customers : [];
    state.customers.total = Number(data.total || state.customersCache.length);
    if (state.customers.page > Math.max(1, Math.ceil(state.customers.total / state.customers.limit))) state.customers.page = 1;
    renderCustomers();
    renderPagination('customers');
  }

  function renderCustomers() {
    const body = $('#customersBody');
    if (!body) return;
    const start = (state.customers.page - 1) * state.customers.limit;
    const pageRows = state.customersCache.slice(start, start + state.customers.limit);
    if (!pageRows.length) {
      body.innerHTML = emptyRow(8, 'Aucun client ne correspond à ces filtres.');
      return;
    }
    body.innerHTML = pageRows.map((customer) => {
      return '<tr><td><strong>' + escapeHtml(customer.name) + '</strong></td><td>' + escapeHtml(customer.email) + '</td><td>' + escapeHtml(customer.phone || '—') + '</td><td>' + escapeHtml(formatPrice(customer.totalSpent)) + '</td><td>' + escapeHtml(customer.ordersCount) + '</td><td>' + segmentBadge(customer.segment) + '</td><td>' + escapeHtml(formatDate(customer.last_order_at)) + '</td><td><button type="button" class="admin-btn admin-btn-sm" data-action="customer-detail" data-id="' + escapeHtml(customer.id) + '"><i class="fas fa-eye"></i> Historique</button></td></tr>';
    }).join('');
  }

  async function openCustomerDetails(id) {
    let data;
    try {
      data = await api('/api/admin/customers/' + encodeURIComponent(id), { silent: true });
    } catch (error) {
      toast('Client introuvable.', 'error');
      return;
    }
    const customer = data.customer || {};
    const orders = Array.isArray(data.orders) ? data.orders : [];
    const body = '<div class="admin-variant-bar"><span><strong>' + escapeHtml(customer.name) + '</strong><span class="admin-cell-sub">' + escapeHtml(customer.email) + '</span></span><span>' + segmentBadge(customer.segment) + '</span></div>' +
      '<div class="admin-stats" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:16px"><article class="admin-stat-card"><div class="admin-stat-card-label">Total dépensé</div><strong class="admin-stat-card-value">' + escapeHtml(formatPrice(customer.totalSpent)) + '</strong></article><article class="admin-stat-card"><div class="admin-stat-card-label">Commandes</div><strong class="admin-stat-card-value">' + escapeHtml(customer.ordersCount) + '</strong></article></div>' +
      '<h3 style="font-size:0.9rem;margin-bottom:10px">Historique d’achats</h3><div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>Commande</th><th>Date</th><th>Lieu</th><th>Code promo</th><th>Statut</th><th>Montant</th></tr></thead><tbody>' +
      (orders.length ? orders.map((order) => '<tr><td>#' + escapeHtml(order.id) + '</td><td>' + escapeHtml(formatDate(order.created_at)) + '</td><td>' + escapeHtml(order.location || '—') + '</td><td>' + escapeHtml(order.promo_code || '—') + '</td><td>' + statusBadge(order.status) + '</td><td>' + escapeHtml(formatPrice(order.total_amount)) + '</td></tr>').join('') : emptyRow(6, 'Aucun achat enregistré.')) +
      '</tbody></table></div>';
    openModal({ title: 'Historique client', wide: true, body, footer: '<button type="button" class="admin-btn" data-modal-close>Fermer</button>' });
  }

  async function handleFormSubmit(form) {
    const type = form.dataset.form;
    const submit = form.querySelector('button[type="submit"]') || $('#adminModalFoot button[type="submit"]');
    if (submit) submit.disabled = true;

    try {
      if (type === 'product') {
        const id = form.dataset.id;
        const payload = {
          name: valueOf(form, 'name').trim(),
          slug: valueOf(form, 'slug').trim(),
          category: valueOf(form, 'category'),
          description: valueOf(form, 'description').trim(),
          price: Number(valueOf(form, 'price')),
          promo_price: valueOf(form, 'promo_price') === '' ? null : Number(valueOf(form, 'promo_price')),
          image_url: valueOf(form, 'image_url').trim(),
          stock: Number(valueOf(form, 'stock')),
          is_new: field(form, 'is_new').checked
        };
        if (!payload.name || !payload.category || !Number.isFinite(payload.price) || !Number.isFinite(payload.stock)) {
          toast('Vérifiez les champs obligatoires.', 'error');
          return;
        }
        await api(id ? '/api/admin/products/' + encodeURIComponent(id) : '/api/admin/products', { method: id ? 'PUT' : 'POST', body: payload });
        closeModal();
        toast(id ? 'Produit mis à jour.' : 'Produit créé.', 'success');
        await loadProducts();
        return;
      }

      if (type === 'variant') {
        const productId = form.dataset.productId;
        const variantId = form.dataset.variantId;
        const priceValue = valueOf(form, 'price');
        const payload = {
          name: valueOf(form, 'name').trim(),
          sku: valueOf(form, 'sku').trim(),
          price: priceValue === '' ? null : Number(priceValue),
          stock: Number(valueOf(form, 'stock')),
          active: field(form, 'active').checked
        };
        if (!payload.name || !Number.isFinite(payload.stock)) {
          toast('Nom et stock de variante sont obligatoires.', 'error');
          return;
        }
        await api(variantId ? '/api/admin/variants/' + encodeURIComponent(variantId) : '/api/admin/products/' + encodeURIComponent(productId) + '/variants', { method: variantId ? 'PUT' : 'POST', body: payload });
        form.reset();
        toast(variantId ? 'Déclinaison mise à jour.' : 'Déclinaison ajoutée.', 'success');
        await reloadVariants(productId);
        return;
      }

      if (type === 'import') {
        const mode = valueOf(form, 'mode');
        if (!state.importRows.length) {
          toast('Choisissez un fichier contenant des lignes importables.', 'error');
          return;
        }
        const result = await api('/api/admin/products/import', { method: 'POST', body: { rows: state.importRows, mode } });
        closeModal();
        const errors = Array.isArray(result.errors) ? result.errors.length : 0;
        toast('Import terminé : ' + Number(result.created || 0) + ' créé(s), ' + Number(result.updated || 0) + ' mis à jour, ' + errors + ' erreur(s).', errors ? 'info' : 'success');
        state.products.page = 1;
        await loadProducts();
        return;
      }

      if (type === 'promo') {
        const id = form.dataset.id;
        const promoType = valueOf(form, 'type');
        const payload = {
          code: valueOf(form, 'code').trim(),
          label: valueOf(form, 'label').trim(),
          type: promoType,
          value: promoType === 'free_shipping' ? 0 : Number(valueOf(form, 'value')),
          min_amount: Number(valueOf(form, 'min_amount')),
          category_id: Number(valueOf(form, 'category_id')),
          expires_at: valueOf(form, 'expires_at') || null,
          active: field(form, 'active').checked
        };
        if (!payload.code || !Number.isFinite(payload.value) || !Number.isFinite(payload.min_amount)) {
          toast('Vérifiez les champs du code promo.', 'error');
          return;
        }
        await api(id ? '/api/admin/promos/' + encodeURIComponent(id) : '/api/admin/promos', { method: id ? 'PUT' : 'POST', body: payload });
        closeModal();
        toast(id ? 'Code promo mis à jour.' : 'Code promo créé.', 'success');
        await loadMarketing();
        return;
      }

      if (type === 'flash') {
        const payload = {
          product_id: Number(valueOf(form, 'product_id')),
          discountPercent: Number(valueOf(form, 'discountPercent')),
          startsAt: toServerDate(valueOf(form, 'startsAt')),
          endsAt: toServerDate(valueOf(form, 'endsAt')),
          active: field(form, 'active').checked
        };
        if (!payload.product_id || !Number.isFinite(payload.discountPercent)) {
          toast('Vérifiez les champs de la vente flash.', 'error');
          return;
        }
        await api('/api/admin/flash-sales', { method: 'POST', body: payload });
        closeModal();
        toast('Vente flash créée.', 'success');
        await loadMarketing();
        return;
      }

      if (type === 'referral') {
        const payload = {
          code: valueOf(form, 'code').trim(),
          reward: Number(valueOf(form, 'reward')),
          discount: Number(valueOf(form, 'discount')),
          active: field(form, 'active').checked
        };
        if (!payload.code || !Number.isFinite(payload.reward) || !Number.isFinite(payload.discount)) {
          toast('Vérifiez les champs du parrainage.', 'error');
          return;
        }
        await api('/api/admin/referrals', { method: 'POST', body: payload });
        closeModal();
        toast('Code de parrainage créé.', 'success');
        await loadMarketing();
      }
    } catch (error) {
      if (!error.status) toast('Enregistrement impossible.', 'error');
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function bindGlobalEvents() {
    document.addEventListener('click', async (event) => {
      const tab = event.target.closest('.admin-tab');
      if (tab) {
        setView(tab.dataset.view);
        return;
      }

      const pageButton = event.target.closest('.admin-page-btn');
      if (pageButton && pageButton.closest('.admin-pagination')) {
        if (pageButton.disabled) return;
        const container = pageButton.closest('.admin-pagination');
        const target = container.dataset.paginationTarget;
        const page = Number(pageButton.dataset.page);
        const settings = state[target];
        if (!settings || !Number.isFinite(page) || page < 1) return;
        settings.page = page;
        const loaders = { products: loadProducts, orders: loadOrders, customers: loadCustomers };
        if (loaders[target]) await loaders[target]().catch(() => {});
        return;
      }

      const target = event.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const id = target.dataset.id;

      try {
        if (action === 'sidebar-toggle') {
          const sidebar = $('#adminSidebar');
          const collapsed = sidebar.classList.toggle('collapsed');
          target.setAttribute('aria-expanded', String(!collapsed));
          return;
        }
        if (action === 'logout') {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('ithaven_user');
          redirectToAuth();
          return;
        }
        if (action === 'refresh-dashboard') {
          await loadDashboard();
          toast('Tableau de bord actualisé.', 'success');
          return;
        }
        if (action === 'product-new') {
          openProductForm(null);
          return;
        }
        if (action === 'product-edit') {
          const product = state.productsCache.find((item) => String(item.id) === String(id));
          if (product) openProductForm(product);
          return;
        }
        if (action === 'product-delete') {
          const product = state.productsCache.find((item) => String(item.id) === String(id));
          if (!window.confirm('Supprimer définitivement le produit « ' + (product ? product.name : id) + ' » ?')) return;
          await api('/api/admin/products/' + encodeURIComponent(id), { method: 'DELETE' });
          toast('Produit supprimé.', 'success');
          await loadProducts();
          return;
        }
        if (action === 'product-variants') {
          await openVariants(id);
          return;
        }
        if (action === 'import-open') {
          openImportModal();
          return;
        }
        if (action === 'export') {
          const endpoint = target.dataset.endpoint === 'customers' ? '/api/admin/customers/export' : '/api/admin/products/export';
          const format = target.dataset.format === 'xlsx' ? 'xlsx' : 'csv';
          await downloadExport(endpoint, format, (endpoint.indexOf('customers') >= 0 ? 'clients' : 'produits') + '-ithaven.' + format);
          return;
        }
        if (action === 'variant-edit') {
          const variant = state.variants.find((item) => String(item.id) === String(id));
          const form = $('#variantForm');
          if (!variant || !form) return;
          state.variantEditId = variant.id;
          field(form, 'name').value = variant.name || '';
          field(form, 'sku').value = variant.sku || '';
          field(form, 'price').value = variant.price == null ? '' : variant.price;
          field(form, 'stock').value = variant.stock == null ? 0 : variant.stock;
          field(form, 'active').checked = isTrue(variant.active);
          renderVariantList();
          field(form, 'name').focus();
          return;
        }
        if (action === 'variant-delete') {
          if (!window.confirm('Supprimer cette déclinaison ?')) return;
          await api('/api/admin/variants/' + encodeURIComponent(id), { method: 'DELETE' });
          toast('Déclinaison supprimée.', 'success');
          await reloadVariants(state.variantProductId);
          return;
        }
        if (action === 'order-confirm') {
          await changeOrderStatus(id, 'paid');
          return;
        }
        if (action === 'order-doc') {
          await openDocument(id, target.dataset.doc);
          return;
        }
        if (action === 'order-detail') {
          await openOrderDetails(id);
          return;
        }
        if (action === 'promo-new') {
          openPromoForm(null);
          return;
        }
        if (action === 'promo-edit') {
          const promo = state.promoCache.find((item) => String(item.id) === String(id));
          if (promo) openPromoForm(promo);
          return;
        }
        if (action === 'promo-delete') {
          if (!window.confirm('Supprimer ce code promo ?')) return;
          await api('/api/admin/promos/' + encodeURIComponent(id), { method: 'DELETE' });
          toast('Code promo supprimé.', 'success');
          await loadMarketing();
          return;
        }
        if (action === 'flash-new') {
          await openFlashForm();
          return;
        }
        if (action === 'flash-delete') {
          if (!window.confirm('Supprimer cette vente flash ?')) return;
          await api('/api/admin/flash-sales/' + encodeURIComponent(id), { method: 'DELETE' });
          toast('Vente flash supprimée.', 'success');
          await loadMarketing();
          return;
        }
        if (action === 'referral-new') {
          openReferralForm();
          return;
        }
        if (action === 'referral-delete') {
          if (!window.confirm('Supprimer ce code de parrainage ?')) return;
          await api('/api/admin/referrals/' + encodeURIComponent(id), { method: 'DELETE' });
          toast('Code de parrainage supprimé.', 'success');
          await loadMarketing();
          return;
        }
        if (action === 'carts-remind') {
          const ids = $$('[data-cart-check]:checked').map((box) => box.value);
          if (!ids.length) {
            toast('Sélectionnez au moins un panier à relancer.', 'error');
            return;
          }
          const result = await api('/api/admin/abandoned-carts/remind', { method: 'POST', body: { ids } });
          toast('Relances : ' + Number(result.sent || 0) + ' envoyée(s), ' + Number(result.queued || 0) + ' en file d’attente.', 'success');
          await loadMarketing();
          return;
        }
        if (action === 'customer-detail') {
          await openCustomerDetails(id);
          return;
        }
        if (action === 'print') {
          window.print();
        }
      } catch (error) {
        if (!error.status) toast('Action impossible.', 'error');
      }
    });

    document.addEventListener('change', async (event) => {
      const target = event.target;
      if (target.id === 'productCategory') {
        state.products.category = target.value || 'all';
        state.products.page = 1;
        await loadProducts().catch(() => {});
        return;
      }
      if (target.id === 'orderStatus') {
        state.orders.status = target.value || '';
        state.orders.page = 1;
        await loadOrders().catch(() => {});
        return;
      }
      if (target.id === 'customerSegment') {
        state.customers.segment = target.value || '';
        state.customers.page = 1;
        await loadCustomers().catch(() => {});
        return;
      }
      if (target.id === 'importFile') {
        await readImportFile(target);
        return;
      }
      if (target.matches('select[data-order-status]')) {
        await changeOrderStatus(target.dataset.orderStatus, target.value).catch(() => {
          target.value = (state.ordersCache.find((order) => String(order.id) === String(target.dataset.orderStatus)) || {}).status || '';
        });
      }
    });

    document.addEventListener('input', (event) => {
      const target = event.target;
      if (target.id === 'productSearch') {
        debounce('products-search', () => {
          state.products.search = target.value.trim();
          state.products.page = 1;
          loadProducts().catch(() => {});
        });
      }
      if (target.id === 'orderSearch') {
        debounce('orders-search', () => {
          state.orders.search = target.value.trim();
          state.orders.page = 1;
          loadOrders().catch(() => {});
        });
      }
      if (target.id === 'customerSearch') {
        debounce('customers-search', () => {
          state.customers.search = target.value.trim();
          state.customers.page = 1;
          loadCustomers().catch(() => {});
        });
      }
    });

    document.addEventListener('submit', (event) => {
      const form = event.target.closest('form[data-form]');
      if (!form) return;
      event.preventDefault();
      handleFormSubmit(form);
    });

    document.addEventListener('keydown', (event) => {
      const modal = $('#adminModal');
      if (!modal || !modal.classList.contains('open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = $('#adminModalDialog');
      const focusables = $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]', dialog).filter((element) => element.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    $('#adminModal').addEventListener('click', (event) => {
      if (event.target.closest('[data-modal-close]')) closeModal();
    });
  }

  function init() {
    bindGlobalEvents();
    startClock();
    verifyAdmin().then((authorized) => {
      if (!authorized) return;
      loadDashboard().catch(() => {});
      startDashboardPolling();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
