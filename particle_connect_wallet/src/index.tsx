import React from 'react'
import ReactDOM from 'react-dom/client'
import { Avalanche } from '@particle-network/chains';
import { ModalProvider } from '@particle-network/connectkit';
import '@particle-network/connectkit/dist/index.css';
import { evmWallets, solanaWallets } from '@particle-network/connectors';
import App from './App'

import('buffer').then(({ Buffer }) => {
  window.Buffer = Buffer;
});

ReactDOM.createRoot(document.getElementById('connect-wallet-button') as HTMLElement).render(
  <React.StrictMode>
    <ModalProvider
      options={{
        projectId: "1c060dd2-b59e-449f-9cc2-ca18e1b3de1b",
        clientKey: "cKU9t583u6YKUtcdCnsg6wVXMpEZcohFy4Pv1b5d",
        appId: "f5d9d888-d36f-4ca1-b6bc-be07a480660b",
        chains: [Avalanche],
        connectors: [
          ...evmWallets({ projectId: '21d2a01621c47fb5f34b06c6390ac0bb', showQrModal: true })
        ],
        erc4337: {
          name: "SIMPLE",
          version: "1.0.0"
        },
        wallet: {
          customStyle: {
            supportChains: [Avalanche],
          },
        },
      }}
    >
      <App />
    </ModalProvider>
  </React.StrictMode>
)
