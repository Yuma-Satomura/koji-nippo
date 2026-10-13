// 社員ログイン（Supabase Auth / メール＋パスワード）。
// 旧PIN認証の後継。セッションは localStorage に保持し、access_token を
// 書き込みAPI(admin-auth)に Bearer で渡す。読み取りは従来どおり anon キー。
const Auth = {
  KEY: 'kn_session',
  _session: undefined,

  _load() {
    if (this._session !== undefined) return this._session;
    try { this._session = JSON.parse(localStorage.getItem(this.KEY) || 'null'); }
    catch { this._session = null; }
    return this._session;
  },
  _save(s) { this._session = s; localStorage.setItem(this.KEY, JSON.stringify(s)); },

  isLoggedIn() { const s = this._load(); return !!(s && s.access_token); },
  user()    { return this._load(); },
  role()    { const s = this._load(); return s ? s.role : null; },
  name()    { const s = this._load(); return s ? s.name : ''; },
  isAdmin() { return this.role() === 'admin'; },

  // メール＋パスワードでログイン。成功で {ok:true}、失敗で {ok:false, error}
  async login(email, password) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: 'メールアドレスまたはパスワードが違います' };
      }
      // 社員(staff)として登録されているか確認し、氏名・役割を取得
      const sres = await fetch(
        `${SUPABASE_URL}/rest/v1/staff?id=eq.${data.user.id}&select=name,role`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${data.access_token}` } }
      );
      const staff = (await sres.json())[0];
      if (!staff) {
        return { ok: false, error: 'このアカウントには利用権限がありません（管理者にお問い合わせください）' };
      }
      this._save({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        user_id: data.user.id,
        email: data.user.email,
        name: staff.name,
        role: staff.role
      });
      return { ok: true };
    } catch (e) {
      console.error('Auth error:', e);
      return { ok: false, error: '通信エラーが発生しました' };
    }
  },

  // 有効な access_token を返す。期限切れが近ければリフレッシュする。
  async getAccessToken() {
    const s = this._load();
    if (!s) return null;
    const now = Math.floor(Date.now() / 1000);
    if (s.expires_at && s.expires_at - 60 > now) return s.access_token;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
        body: JSON.stringify({ refresh_token: s.refresh_token })
      });
      const data = await res.json();
      if (!res.ok) { this.logout(); return null; }
      this._save({ ...s, access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at });
      return data.access_token;
    } catch (e) {
      return s.access_token;
    }
  },

  // ログイン中の本人がパスワードを変更する
  async changePassword(newPassword) {
    const token = await this.getAccessToken();
    if (!token) return { ok: false, error: 'ログインが必要です' };
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.msg || 'パスワード変更に失敗しました' };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: '通信エラーが発生しました' };
    }
  },

  logout() { this._session = null; localStorage.removeItem(this.KEY); },

  requireAuth() {
    if (typeof DEMO !== 'undefined' && DEMO) return true;
    if (!this.isLoggedIn()) {
      location.href = 'admin.html?next=' + encodeURIComponent(location.href);
      return false;
    }
    return true;
  }
};
