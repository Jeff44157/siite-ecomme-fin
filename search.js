(function () {
  const data = window.ITHAVEN_DATA;
  const utils = data;

  function init() {
    const searchBox = document.getElementById('search-box');
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (!searchBox || !searchInput || !searchResults) return;

    let timer;
    let lastQuery = '';

    function showResults(html) {
      searchResults.innerHTML = html;
      searchResults.classList.add('active');
      searchBox.classList.add('open');
    }

    function hideResults() {
      searchResults.classList.remove('active');
      searchResults.innerHTML = '';
    }

    function resultMarkup(product) {
      const price = Number(product.promo_price || product.price || 0);
      const oldPrice = product.promo_price ? Number(product.price) : 0;
      const image = product.image || product.image_url || 'img/logo.png';
      return `
        <div class="search-item">
          <a href="produit.html?id=${encodeURIComponent(product.id)}" class="search-item-main">
            <img src="${utils.escapeHtml(image)}" alt="${utils.escapeHtml(product.name)}" width="45" height="45" />
            <span class="search-item-text">
              <strong>${utils.escapeHtml(product.name)}</strong>
              <span>${utils.formatPrice(price)}${oldPrice ? ` <s>${utils.formatPrice(oldPrice)}</s>` : ''}</span>
            </span>
          </a>
          <button type="button" class="search-add-btn" data-id="${utils.escapeHtml(product.id)}" aria-label="Ajouter ${utils.escapeHtml(product.name)} au panier">
            <i class="fas fa-cart-plus"></i>
          </button>
        </div>
      `;
    }

    function fallbackSearch(query) {
      const q = query.toLocaleLowerCase('fr-FR');
      return data.products
        .filter((item) =>
          [item.name, item.category, item.description, item.slug]
            .join(' ')
            .toLocaleLowerCase('fr-FR')
            .includes(q)
        )
        .slice(0, 8);
    }

    async function runSearch(rawQuery) {
      const query = String(rawQuery || '').trim();
      lastQuery = query;

      if (!query) {
        hideResults();
        return;
      }

      showResults('<p class="search-status">Recherche en cours...</p>');

      let products = [];
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) throw new Error('Recherche indisponible');
        const result = await response.json();
        products = Array.isArray(result.products) ? result.products : [];
      } catch (_) {
        products = fallbackSearch(query);
      }

      if (query !== lastQuery) return;

      if (!products.length) {
        showResults(`<p class="search-status">Aucun résultat pour « ${utils.escapeHtml(query)} ».</p>`);
        return;
      }

      showResults(products.slice(0, 8).map(resultMarkup).join(''));
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = searchBox.classList.toggle('open');
        if (isOpen) {
          searchInput.focus();
        } else {
          hideResults();
        }
      });
    }

    searchInput.addEventListener('click', (event) => event.stopPropagation());
    searchResults.addEventListener('click', (event) => event.stopPropagation());

    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => runSearch(searchInput.value), 250);
    });

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        clearTimeout(timer);
        runSearch(searchInput.value);
      }
      if (event.key === 'Escape') {
        searchBox.classList.remove('open');
        hideResults();
        searchInput.blur();
      }
    });

    searchResults.addEventListener('click', (event) => {
      const addButton = event.target.closest('.search-add-btn');
      if (!addButton) return;
      event.preventDefault();
      const product = data.findProduct(addButton.dataset.id);
      if (product && window.ITHavenCart) {
        window.ITHavenCart.addItem(product);
      }
    });

    document.addEventListener('click', (event) => {
      if (searchBox.contains(event.target)) return;
      searchBox.classList.remove('open');
      hideResults();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
