'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider , lightTheme } from '@rainbow-me/rainbowkit';

import { config } from '../wagmi';
import { zora } from 'viem/chains';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={zora} theme={lightTheme({
        accentColor: '#000000',
        accentColorForeground: 'white',
      })}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}