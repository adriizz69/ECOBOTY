export const useAuth = () => {
  const config = useRuntimeConfig();
  const JUST_AUTHED_KEY = "ecoboty_auth_just_ok";

  const markJustAuthed = () => {
    if (!process.client) return;
    try {
      sessionStorage.setItem(JUST_AUTHED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const consumeJustAuthed = (maxAgeMs = 20000) => {
    if (!process.client) return false;
    try {
      const raw = sessionStorage.getItem(JUST_AUTHED_KEY);
      sessionStorage.removeItem(JUST_AUTHED_KEY);
      const at = Number(raw || 0);
      return Boolean(at) && Date.now() - at < maxAgeMs;
    } catch {
      return false;
    }
  };

  const login = () => {
    if (!process.client) return;
    const path =
      window.location.pathname === "/callback"
        ? "/servers"
        : `${window.location.pathname}${window.location.search || ""}`;
    const redirect = encodeURIComponent(path || "/servers");
    window.location.href = `${config.public.apiBase}/auth/discord/login?redirect=${redirect}`;
  };

  const getToken = () => {
    if (!process.client) return "";
    const sessionToken = sessionStorage.getItem("session_token");
    if (sessionToken) return sessionToken;
    return localStorage.getItem("token") || "";
  };

  const setToken = (token, options = {}) => {
    if (!process.client) return;
    const useSession = Boolean(options.session);
    if (useSession) {
      sessionStorage.setItem("session_token", token);
      return;
    }
    localStorage.setItem("token", token);
  };

  const logout = (options = {}) => {
    if (!process.client) return;
    const clearAll = Boolean(options.all);
    if (clearAll) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("session_token");
      return;
    }
    const hasSession = Boolean(sessionStorage.getItem("session_token"));
    const hasLocal = Boolean(localStorage.getItem("token"));
    if (hasSession && hasLocal) {
      sessionStorage.removeItem("session_token");
      return;
    }
    localStorage.removeItem("token");
    sessionStorage.removeItem("session_token");
  };

  const logoutAll = () => logout({ all: true });

  return {
    login,
    getToken,
    setToken,
    logout,
    logoutAll,
    markJustAuthed,
    consumeJustAuthed
  };
};
