const Auth = {
  SESSION_KEY: 'admin_session',

  isLoggedIn() {
    return sessionStorage.getItem(this.SESSION_KEY) === '1';
  },

  login(pin) {
    const stored = Storage.getPin();
    if (!stored) {
      // First time: set the PIN and log in
      Storage.setPin(pin);
      sessionStorage.setItem(this.SESSION_KEY, '1');
      return true;
    }
    if (pin === stored) {
      sessionStorage.setItem(this.SESSION_KEY, '1');
      return true;
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
