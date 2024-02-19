import React, { useState, useEffect } from 'react';
import { ConnectButton, useAccountInfo, useParticleConnect } from '@particle-network/connectkit';
import { isEVMProvider } from '@particle-network/connectors';
import { Avalanche } from '@particle-network/chains';
import { AAWrapProvider, SendTransactionMode, SmartAccount } from '@particle-network/aa';
import { ethers } from 'ethers';
import { notification } from 'antd';

import './App.css';

const App = () => {
  const { account, particleProvider }: any = useAccountInfo();
  const { disconnect } = useParticleConnect();
  const [address, setAddress] = useState();

  const smartAccount = new SmartAccount(particleProvider, {
    projectId: "1c060dd2-b59e-449f-9cc2-ca18e1b3de1b",
    clientKey: "cKU9t583u6YKUtcdCnsg6wVXMpEZcohFy4Pv1b5d",
    appId: "f5d9d888-d36f-4ca1-b6bc-be07a480660b",
    aaOptions: {
      simple: [{ chainId: Avalanche.id, version: '1.0.0' }]
    }
  });

  const customProvider = new ethers.providers.Web3Provider(new AAWrapProvider(smartAccount, SendTransactionMode.Gasless), "any");
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (account) {
      fetchBalance();
    }
  }, [account, smartAccount, customProvider]);

  const fetchBalance = async () => {
    const address: any = await smartAccount.getAddress();
    setAddress(address);
    const balanceResponse = await customProvider.getBalance(address);
    setBalance(ethers.utils.formatEther(balanceResponse));
  };

  const executeUserOp = async () => {
    const signer = customProvider.getSigner();
    const tx = {
      to: "0x000000000000000000000000000000000000dEaD",
      value: ethers.utils.parseEther("0.0001"),
    };
    const txResponse = await signer.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
    notification.success({
      message: 'Transaction Successful',
      description: (
        <div>
          Transaction Hash: <a href={`https://snowtrace.io/tx/${txReceipt.transactionHash}`} target="_blank" rel="noopener noreferrer">{txReceipt.transactionHash}</a>
        </div>
      )
    });
  };

  const executeBatchUserOp = async () => {
    const tx: any = {
      tx: [{
        to: "0x000000000000000000000000000000000000dEaD",
        value: ethers.utils.parseEther("0.0001"),
      },
      {
        to: "0x000000000000000000000000000000000000dEaD",
        value: ethers.utils.parseEther("0.0001"),
      }]
    };
    const txResponse = await smartAccount.sendTransaction(tx);
    notification.success({
      message: 'Transaction Successful',
      description: (
        <div>
          Transaction Hash: <a href={`https://snowtrace.io/tx/${txResponse}`} target="_blank" rel="noopener noreferrer">{txResponse}</a>
        </div>
      )
    });
  };

  return (
    <div className="App-container">
      <div className="App">
        <div className="logo-section">
          <img src="/EerK7MS.png" alt="Logo 1" className="logo logo-big" />
          <img src="/eBJAx0s.png" alt="Logo 2" className="logo logo-big" />
        </div>
        {!account ? (
          <div className="connect-button">
            <ConnectButton />
          </div>
        ) : (
          <div className="profile-card">
            <h6>{address}</h6>
            <div className="balance-section">
              <small>{balance} AVAX</small>
              <button className="sign-message-button" onClick={executeUserOp}>Execute User Operation</button>
              <button className="sign-message-button" onClick={executeBatchUserOp}>Execute Batch User Operation</button>
              <button className="disconnect-button" onClick={disconnect}>Disconnect</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default App;
