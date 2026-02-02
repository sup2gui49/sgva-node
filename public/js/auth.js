(function () {
  const STORAGE_KEY = 'sgva.session';
  const LEGACY_TOKEN_KEY = 'token';
  const LEGACY_USER_KEY = 'user';
  const DEFAULT_LOGIN_PAGE = 'login.html';
  const DEFAULT_APP_PAGE = 'index.html';
  // Use relative path for API to work in both dev and production
  const API_URL = '/api';

  const readSession = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.token && parsed?.user) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Não foi possível ler a sessão persistida:', error);
    }

    // Fallback legacy chaves
    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
    const legacyUserRaw = localStorage.getItem(LEGACY_USER_KEY);
    if (legacyToken && legacyUserRaw) {
      try {
        const legacyUser = JSON.parse(legacyUserRaw);
        return { token: legacyToken, user: legacyUser };
      } catch (error) {
        console.warn('Não foi possível interpretar o usuário legado:', error);
      }
    }
    return null;
  };

  const persistSession = (token, user) => {
    const payload = {
      token,
      user,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
    return payload;
  };

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  };

  const getCurrentPath = () => {
    return window.location.pathname + window.location.search + window.location.hash;
  };

  const buildRedirectURL = (target, nextPath) => {
    const params = new URLSearchParams();
    if (nextPath) {
      params.set('redirect', nextPath);
    }
    return params.toString() ? `${target}?${params.toString()}` : target;
  };

  const getToken = () => readSession()?.token || null;
  const getUser = () => readSession()?.user || null;

  const isAuthenticated = () => !!getToken();

  const setSession = (token, user) => persistSession(token, user);

  const requireAuth = (options = {}) => {
    if (isAuthenticated()) {
      return true;
    }
    const loginPage = options.redirectTo || DEFAULT_LOGIN_PAGE;
    const next = options.next || getCurrentPath();
    window.location.href = buildRedirectURL(loginPage, next);
    return false;
  };

  const login = async (email, senha) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Credenciais inválidas');
    }

    const data = await response.json();
    if (!data.success || !data.data?.token) {
      throw new Error(data.message || 'Falha ao autenticar');
    }

    const session = setSession(data.data.token, data.data.user);
    return session;
  };

  const register = async ({ nome, email, senha }) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Não foi possível criar a conta');
    }
    return data;
  };

  const logout = (options = {}) => {
    clearSession();
    const target = options.redirectTo || DEFAULT_LOGIN_PAGE;
    window.location.href = buildRedirectURL(target, options.redirectNext ? options.redirectNext : null);
  };

  const apiFetch = async (input, init = {}) => {
    const opts = { ...init, headers: { ...(init.headers || {}) } };
    const token = getToken();
    if (token) {
      opts.headers.Authorization = opts.headers.Authorization || `Bearer ${token}`;
    }

    const response = await fetch(input, opts);
    if (response.status === 401) {
      console.warn('Sessão expirada. Redirecionando para login...');
      logout({ redirectNext: getCurrentPath() });
      throw new Error('Sessão expirada');
    }
    return response;
  };

  const redirectToApp = (target) => {
    window.location.href = target || DEFAULT_APP_PAGE;
  };

  window.auth = {
    API_URL,
    isAuthenticated,
    getSession: readSession,
    getToken,
    getUser,
    setSession,
    clearSession,
    requireAuth,
    login,
    register,
    logout,
    apiFetch,
    redirectToApp,
    DEFAULT_APP_PAGE,
    DEFAULT_LOGIN_PAGE
  };
})();
