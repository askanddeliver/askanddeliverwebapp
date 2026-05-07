import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { Auth0Provider, type AppState } from '@auth0/auth0-react';
import App from './App';
import './styles/index.css';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

/** Same-tab relative path only (avoid open redirects after Auth0 callback). */
function safeReturnTo(path: unknown): string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return '/';
  }
  return path;
}

function Auth0ProviderWithNavigate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    const returnTo = safeReturnTo(
      appState && typeof appState === 'object' && 'returnTo' in appState
        ? (appState as AppState & { returnTo?: string }).returnTo
        : undefined
    );
    navigate(returnTo, { replace: true });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      useRefreshTokens
      cacheLocation="localstorage"
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithNavigate>
        <App />
      </Auth0ProviderWithNavigate>
    </BrowserRouter>
  </React.StrictMode>
);
