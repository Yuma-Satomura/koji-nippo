const Auth = {
  SESSION_KEY: 'admin_session',

  isLoggedIn() {
    return sessionStorage.getItem(this.SESSION_KEY) === '1';
  },

  // PIN をEdge Functionで検証（初回はサーバーにPINを登録）
  async login(pin) {
    try {
      const res = await fetch(`${EDGE_BASE}/admin-write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ action: 'auth', data: {} })
      });
      if (res.ok) {
        Storage.setPin(pin);
        sessionStorage.setItem(this.SESSION_KEY, '1');
        return true;
      }
    } catch (e) {
      console.error('Auth error:', e);
    }
    return false;
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      const current = encodeURIComponent(location.href);
      location.href = 'admin.html?next=' + current;
      return false;
    }
    return true;
  }
};
