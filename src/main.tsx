import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './sync/styles.css';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { SyncInfrastructure } from './sync';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SyncInfrastructure>
      <App />
    </SyncInfrastructure>
  </React.StrictMode>,
);

if (import.meta.env.PROD) {
  void registerServiceWorker();
}
