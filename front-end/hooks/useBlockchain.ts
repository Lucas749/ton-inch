/**
 * 🪝 React Hook for Blockchain Integration
 *
 * This hook provides easy access to blockchain functionality in React components
 * Integrates with RainbowKit/wagmi for wallet connection
 */

import { useState, useEffect, useCallback } from "react";
import { useAccount, useBalance, useChainId, useConnect, useDisconnect } from "wagmi";
import {
  blockchainService,
  CustomIndex,
  OrderCondition,
  OPERATORS,
} from "@/lib/blockchain-service";

export interface UseBlockchainReturn {
  // Connection state
  isConnected: boolean;
  walletAddress: string | null;
  isLoading: boolean;
  error: string | null;

  // Network info
  chainId: number;
  networkName: string;

  // Balances
  ethBalance: string | null;

  // Indices
  indices: CustomIndex[];

  // Actions
  connectWallet: () => Promise<void>;
  createIndex: (
    name: string,
    description: string,
    initialValue: number
  ) => Promise<number>;
  updateIndex: (indexId: number, newValue: number) => Promise<boolean>;
  refreshIndices: () => Promise<void>;
  validateCondition: (condition: OrderCondition) => Promise<boolean>;
  getTokenBalance: (tokenAddress: string) => Promise<string>;
  switchToBaseMainnet: () => Promise<boolean>;
  getPrivateKeyForDemo: () => Promise<string>;

  // Utils
  clearError: () => void;
  isOwner: boolean;
}

export function useBlockchain(): UseBlockchainReturn {
  // Use RainbowKit/wagmi hooks for wallet state
  const { address, isConnected: wagmiIsConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Local state for blockchain-specific data
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indices, setIndices] = useState<CustomIndex[]>([]);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  // Derive state from wagmi
  const isConnected = wagmiIsConnected;
  const walletAddress = address || null;
  const ethBalance = balance ? balance.formatted : null;
  const networkName = chainId === 8453 ? "Base Mainnet" : `Chain ${chainId}`;

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Connect wallet using RainbowKit
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the first available connector (usually MetaMask/injected)
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      } else {
        throw new Error("No wallet connector available");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(errorMessage);
      console.error("❌ Wallet connection failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [connect, connectors]);

  // Create new index
  const createIndex = useCallback(
    async (
      name: string,
      description: string,
      initialValue: number
    ): Promise<number> => {
      try {
        setIsLoading(true);
        setError(null);

        const indexId = await blockchainService.createIndex(
          name,
          description,
          initialValue
        );

        // Refresh indices to show the new one
        await refreshIndices();

        return indexId;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create index";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Update index value
  const updateIndex = useCallback(
    async (indexId: number, newValue: number): Promise<boolean> => {
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
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update index";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Check if user is contract owner
  const checkOwnership = useCallback(async () => {
    try {
      const ownerStatus = await blockchainService.isContractOwner();
      setIsOwner(ownerStatus);
    } catch (err) {
      console.error("❌ Failed to check ownership:", err);
      setIsOwner(false);
    }
  }, []);

  // Refresh indices with debounce to prevent multiple rapid calls
  const refreshIndices = useCallback(async () => {
    try {
      console.log('🔄 useBlockchain: Refreshing indices...');
      console.log('🔍 useBlockchain: Wallet connected:', isConnected);
      console.log('🔍 useBlockchain: Wallet address:', walletAddress);
      
      // DON'T clear cache - we want to preserve cached orders and data
      // Only fetch fresh data and merge with existing cache
      const allIndices = await blockchainService.getAllIndices();
      
      console.log('🔍 useBlockchain: Loaded indices from service:', allIndices);
      setIndices(allIndices);
      
      // Also check ownership when refreshing
      await checkOwnership();
    } catch (err) {
      console.error("❌ Failed to refresh indices:", err);
      // Don't set error state for background refresh failures
    }
  }, [checkOwnership, isConnected, walletAddress]);

  // Validate order condition
  const validateCondition = useCallback(
    async (condition: OrderCondition): Promise<boolean> => {
      try {
        return await blockchainService.validateOrderCondition(condition);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to validate condition";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Get token balance
  const getTokenBalance = useCallback(
    async (tokenAddress: string): Promise<string> => {
      try {
        return await blockchainService.getTokenBalance(tokenAddress);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get token balance";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Switch to Base Mainnet network
  const switchToBaseMainnet = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const success = await blockchainService.switchToBaseMainnet();
      
      if (success) {
        // Refresh network info after switching
        const networkInfo = await blockchainService.getNetworkInfo();
        setChainId(networkInfo.chainId);
        setNetworkName(networkInfo.networkName);
      }
      
      return success;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to switch network";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get private key for demo operations (WARNING: Demo only!)
  const getPrivateKeyForDemo = useCallback(async (): Promise<string> => {
    try {
      setError(null);
      return await blockchainService.getPrivateKeyForDemo();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get demo private key";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Sync wagmi wallet state with blockchain service and load indices
  useEffect(() => {
    console.log('🔄 useBlockchain useEffect triggered');
    console.log('🔍 isConnected:', isConnected);
    console.log('🔍 walletAddress:', walletAddress);
    
    // Sync wallet state with blockchain service
    blockchainService.wallet.syncExternalWallet(walletAddress);
    
    if (isConnected && walletAddress) {
      console.log('✅ Wallet connected, refreshing indices...');
      refreshIndices().catch((err) => {
        console.warn("Warning: Failed to refresh indices after wallet connection:", err);
      });
    } else {
      console.log('❌ Wallet not connected, resetting indices...');
      // Reset indices when wallet disconnects
      setIndices([]);
      setIsOwner(false);
      setError(null);
    }
  }, [isConnected, walletAddress]); // Removed refreshIndices from dependency array to prevent infinite loop

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
    switchToBaseMainnet,
    getPrivateKeyForDemo,

    // Utils
    clearError,
    isOwner,
  };
}

// Export operators for easy use
export { OPERATORS };
