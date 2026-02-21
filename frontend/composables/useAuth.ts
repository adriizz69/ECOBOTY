export const useAuth = () => {
  const config = useRuntimeConfig();

  const login = () => {
    if (!process.client) return;
    const current = window.location.pathname === "/callback"
      ? window.location.origin + "/servers"
      : window.location.href;
    const redirect = encodeURIComponent(current);
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

  const logout = () => {
    if (!process.client) return;
    const hasSession = Boolean(sessionStorage.getItem("session_token"));
    const hasLocal = Boolean(localStorage.getItem("token"));
    if (hasSession && hasLocal) {
      sessionStorage.removeItem("session_token");
      return;
    }
    localStorage.removeItem("token");
    sessionStorage.removeItem("session_token");
  };

  return { login, getToken, setToken, logout };
};
