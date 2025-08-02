'use client';

import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import { WalletErrorBoundary } from './WalletErrorBoundary';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'c1nch',
  projectId: process.env.NEXT_PUBLIC_WALLETID || '8ac9e16abce841daf165cffe1ce24e1e', // Fallback demo project ID
  chains: [base],
  ssr: true,
  // walletConnectParameters removed to fix type error
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry wallet connection errors immediately
        if (error?.message?.includes('Connection interrupted') ||
            error?.message?.includes('WalletConnect') ||
            error?.message?.includes('User rejected')) {
          return false;
        }
        return failureCount < 2; // Reduce retries to prevent connection spam
      },
      // Increase stale time to reduce connection pressure
      staleTime: 30000, // 30 seconds
      gcTime: 300000, // 5 minutes (formerly cacheTime)
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Never retry wallet mutations
        if (error?.message?.includes('Connection interrupted') ||
            error?.message?.includes('WalletConnect') ||
            error?.message?.includes('User rejected')) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </WalletErrorBoundary>
  );
}