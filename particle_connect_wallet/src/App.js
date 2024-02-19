import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ConnectButton, useAccountInfo, useParticleConnect } from '@particle-network/connectkit';
import { Avalanche } from '@particle-network/chains';
import { AAWrapProvider, SendTransactionMode, SmartAccount } from '@particle-network/aa';
import { ethers } from 'ethers';
import { notification } from 'antd';
import './App.css';
const App = () => {
    const { account, particleProvider } = useAccountInfo();
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
        const address = await smartAccount.getAddress();
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
            description: (_jsxs("div", { children: ["Transaction Hash: ", _jsx("a", { href: `https://snowtrace.io/tx/${txReceipt.transactionHash}`, target: "_blank", rel: "noopener noreferrer", children: txReceipt.transactionHash })] }))
        });
    };
    const executeBatchUserOp = async () => {
        const tx = {
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
            description: (_jsxs("div", { children: ["Transaction Hash: ", _jsx("a", { href: `https://snowtrace.io/tx/${txResponse}`, target: "_blank", rel: "noopener noreferrer", children: txResponse })] }))
        });
    };
    return (_jsx("div", { className: "App-container", children: _jsxs("div", { className: "App", children: [_jsxs("div", { className: "logo-section", children: [_jsx("img", { src: "/EerK7MS.png", alt: "Logo 1", className: "logo logo-big" }), _jsx("img", { src: "/eBJAx0s.png", alt: "Logo 2", className: "logo logo-big" })] }), !account ? (_jsx("div", { className: "connect-button", children: _jsx(ConnectButton, {}) })) : (_jsxs("div", { className: "profile-card", children: [_jsx("h6", { children: address }), _jsxs("div", { className: "balance-section", children: [_jsxs("small", { children: [balance, " AVAX"] }), _jsx("button", { className: "sign-message-button", onClick: executeUserOp, children: "Execute User Operation" }), _jsx("button", { className: "sign-message-button", onClick: executeBatchUserOp, children: "Execute Batch User Operation" }), _jsx("button", { className: "disconnect-button", onClick: disconnect, children: "Disconnect" })] })] }))] }) }));
};
export default App;
