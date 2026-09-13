import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, base } from 'wagmi/chains';

// Non-custodial wallet connection (MetaMask, Coinbase Wallet, Rainbow,
// WalletConnect-compatible mobile wallets, etc.) -- real Ethereum mainnet
// and Base, real money. This app never holds a private key or seed
// phrase: every send is built here and signed by the user's own
// connected wallet, which shows them the real recipient/amount before
// they approve it. That's what keeps this non-custodial -- do not add
// server-side signing or key storage without redoing the legal/licensing
// analysis that ruled it out in the first place (see crypto-wallet.js's
// comments for the testnet-only custodial feature, which is a distinct,
// separate thing from this).
//
// VITE_WALLETCONNECT_PROJECT_ID is free from https://cloud.reown.com --
// without it, WalletConnect-based mobile wallets won't be offered, but
// browser-extension wallets (MetaMask, Coinbase Wallet, etc.) still work.
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

export const wagmiConfig = getDefaultConfig({
  appName: 'PlaySoFlo',
  projectId: projectId || 'MISSING_WALLETCONNECT_PROJECT_ID',
  chains: [mainnet, base],
  ssr: false,
});

export const SUPPORTED_CHAINS = [mainnet, base];

// Base mainnet USDC (Circle's official contract) -- the same asset the
// testnet feature uses, now on real Base mainnet.
export const USDC_ADDRESS_BY_CHAIN = {
  [mainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};
export const USDC_DECIMALS = 6;
