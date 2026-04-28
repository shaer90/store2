// NOIR — API client
(function () {
  const BASE = '/api';

  function token() { return localStorage.getItem('noir.token') || ''; }

  async function req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token()) headers['Authorization'] = 'Bearer ' + token();
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error(err.detail || 'Request failed'), { status: res.status });
    }
    return res.json();
  }

  window.NOIR_API = {
    // Auth
    register: (email, password, name) => req('POST', '/auth/register', { email, password, name }),
    login:    (email, password)       => req('POST', '/auth/login',    { email, password }),
    me:       ()                      => req('GET',  '/auth/me'),

    // Products
    products: (params = {}) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
      ).toString();
      return req('GET', '/products' + (qs ? '?' + qs : ''));
    },
    product: (id) => req('GET', '/products/' + id),

    // Cart
    getCart:      ()            => req('GET',    '/cart'),
    addToCart:    (product_id, size, color, qty) => req('POST', '/cart', { product_id, size, color, qty }),
    updateCart:   (key, qty)    => req('PUT',    '/cart/' + encodeURIComponent(key), { qty }),
    removeCart:   (key)         => req('DELETE', '/cart/' + encodeURIComponent(key)),
    clearCart:    ()            => req('DELETE', '/cart'),

    // Wishlist
    getWishlist:    ()   => req('GET',  '/wishlist'),
    toggleWishlist: (id) => req('POST', '/wishlist/' + id),

    // Orders
    getOrders:  ()      => req('GET',  '/orders'),
    placeOrder: (body)  => req('POST', '/orders', body),

    // Promo
    validatePromo: (code, subtotal) => req('POST', '/promo/validate', { code, subtotal }),

    // Helpers
    saveToken:   (t) => localStorage.setItem('noir.token', t),
    clearToken:  ()  => localStorage.removeItem('noir.token'),
    hasToken:    ()  => !!token(),
  };
})();
