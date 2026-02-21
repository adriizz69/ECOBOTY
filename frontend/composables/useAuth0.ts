import { createAuth0Client } from "@auth0/auth0-spa-js";

let clientPromise = null;

const getClient = async () => {
  if (!process.client) return null;
  if (!clientPromise) {
    const config = useRuntimeConfig();
    clientPromise = createAuth0Client({
      domain: config.public.auth0Domain,
      clientId: config.public.auth0ClientId,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: config.public.auth0Audience
      }
    });
  }
  return clientPromise;
};

export const useAuth0 = () => {
  const login = async () => {
    const client = await getClient();
    if (!client) return;
    await client.loginWithRedirect();
  };

  const handleRedirect = async () => {
    const client = await getClient();
    if (!client) return;
    if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
      await client.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const getToken = async () => {
    const client = await getClient();
    if (!client) return "";
    return client.getTokenSilently();
  };

  const isAuthenticated = async () => {
    const client = await getClient();
    if (!client) return false;
    return client.isAuthenticated();
  };

  const logout = async () => {
    const client = await getClient();
    if (!client) return;
    client.logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return { login, handleRedirect, getToken, isAuthenticated, logout };
};
