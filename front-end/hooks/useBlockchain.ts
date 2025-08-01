/**
 * 🪝 React Hook for Blockchain Integration
 * 
 * This hook provides easy access to blockchain functionality in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { blockchainService, CustomIndex, OrderCondition, OPERATORS } from '@/lib/blockchain-service';

export interface UseBlockchainReturn {
  // Connection state
  isConnected: boolean;
  walletAddress: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Network info
  chainId: number | null;
  networkName: string | null;
  
  // Balances
  ethBalance: string | null;
  
  // Indices
  indices: CustomIndex[];
  
  // Actions
  connectWallet: () => Promise<void>;
  createIndex: (name: string, description: string, initialValue: number) => Promise<number>;
  updateIndex: (indexId: number, newValue: number) => Promise<boolean>;
  refreshIndices: () => Promise<void>;
  validateCondition: (condition: OrderCondition) => Promise<boolean>;
  getTokenBalance: (tokenAddress: string) => Promise<string>;
  
  // Utils
  clearError: () => void;
}

export function useBlockchain(): UseBlockchainReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [indices, setIndices] = useState<CustomIndex[]>([]);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const address = await blockchainService.connectWallet();
      if (address) {
        setWalletAddress(address);
        setIsConnected(true);
        
        // Get network info
        const networkInfo = await blockchainService.getNetworkInfo();
        setChainId(networkInfo.chainId);
        setNetworkName(networkInfo.networkName);
        
        // Get ETH balance
        const balance = await blockchainService.getETHBalance();
        setEthBalance(balance);
        
        // Load indices
        await refreshIndices();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('❌ Wallet connection failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new index
  const createIndex = useCallback(async (name: string, description: string, initialValue: number): Promise<number> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const indexId = await blockchainService.createIndex(name, description, initialValue);
      
      // Refresh indices to show the new one
      await refreshIndices();
      
      return indexId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create index';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update index value
  const updateIndex = useCallback(async (indexId: number, newValue: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await blockchainService.updateIndex(indexId, newValue);
      
      if (success) {
        // Refresh indices to show updated values
        await refreshIndices();
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update index';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh indices
  const refreshIndices = useCallback(async () => {
    try {
      const allIndices = await blockchainService.getAllIndices();
      setIndices(allIndices);
    } catch (err) {
      console.error('❌ Failed to refresh indices:', err);
      // Don't set error state for background refresh failures
    }
  }, []);

  // Validate order condition
  const validateCondition = useCallback(async (condition: OrderCondition): Promise<boolean> => {
    try {
      return await blockchainService.validateOrderCondition(condition);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate condition';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get token balance
  const getTokenBalance = useCallback(async (tokenAddress: string): Promise<string> => {
    try {
      return await blockchainService.getTokenBalance(tokenAddress);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get token balance';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Set up event listeners on mount
  useEffect(() => {
    // Check if already connected
    if (blockchainService.isWalletConnected()) {
      const address = blockchainService.getWalletAddress();
      if (address) {
        setWalletAddress(address);
        setIsConnected(true);
        
        // Load initial data
        blockchainService.getNetworkInfo().then(networkInfo => {
          setChainId(networkInfo.chainId);
          setNetworkName(networkInfo.networkName);
        });
        
        blockchainService.getETHBalance().then(balance => {
          setEthBalance(balance);
        });
        
        refreshIndices();
      }
    }

    // Listen for account changes
    blockchainService.onAccountChanged((account) => {
      if (account) {
        setWalletAddress(account);
        setIsConnected(true);
        
        // Refresh balances and data for new account
        blockchainService.getETHBalance().then(setEthBalance);
        refreshIndices();
      } else {
        setWalletAddress(null);
        setIsConnected(false);
        setEthBalance(null);
        setIndices([]);
      }
    });

    // Listen for network changes
    blockchainService.onNetworkChanged((chainId) => {
      blockchainService.getNetworkInfo().then(networkInfo => {
        setChainId(networkInfo.chainId);
        setNetworkName(networkInfo.networkName);
      });
    });
  }, [refreshIndices]);

  return {
    // State
    isConnected,
    walletAddress,
    isLoading,
    error,
    chainId,
    networkName,
    ethBalance,
    indices,
    
    // Actions
    connectWallet,
    createIndex,
    updateIndex,
    refreshIndices,
    validateCondition,
    getTokenBalance,
    
    // Utils
    clearError,
  };
}

// Export operators for easy use
export { OPERATORS };