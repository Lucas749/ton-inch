'use client';

import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import { WalletErrorBoundary } from './WalletErrorBoundary';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
          appName: 'c1nch',
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c1nch-demo',
  chains: [base],
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry wallet connection errors
        if (error?.message?.includes('Connection interrupted') ||
            error?.message?.includes('WalletConnect') ||
            error?.message?.includes('User rejected')) {
          return false;
        }
        return failureCount < 3;
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