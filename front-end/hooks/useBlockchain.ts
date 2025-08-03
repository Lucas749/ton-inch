/**
 * 🪝 React Hook for Blockchain Integration
 *
 * This hook provides easy access to blockchain functionality in React components
 * Integrates with RainbowKit/wagmi for wallet connection
 */

import { useState, useEffect, useCallback, useMemo } from "react";
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
  clearIndexCache: () => Promise<void>;
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

  // Connect wallet using RainbowKit with improved error handling
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we already have a connection attempt in progress
      if (isLoading) {
        console.log("⏳ Connection already in progress, skipping duplicate attempt");
        return;
      }

      // Use the first available connector (usually MetaMask/injected)
      const connector = connectors[0];
      if (connector) {
        console.log("🔌 Attempting to connect with connector:", connector.name);
        connect({ connector });
      } else {
        throw new Error("No wallet connector available");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect wallet";
      
      // Don't set error for user rejection or connection interruption
      if (!errorMessage.includes("User rejected") && 
          !errorMessage.includes("Connection interrupted")) {
        setError(errorMessage);
      }
      
      console.error("❌ Wallet connection failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [connect, connectors, isLoading]);

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
      
      // Only check ownership if wallet is connected
      if (isConnected && walletAddress) {
        await checkOwnership();
      }
    } catch (err) {
      console.error("❌ Failed to refresh indices:", err);
      // Don't set error state for background refresh failures
    }
  }, [checkOwnership, isConnected, walletAddress]);

  // Force refresh indices from blockchain  
  const clearIndexCache = useCallback(async () => {
    try {
      console.log('🗑️ useBlockchain: Forcing fresh fetch from blockchain...');
      console.log('🔍 useBlockchain: Wallet connected:', isConnected);
      console.log('🔍 useBlockchain: Wallet address:', walletAddress);
      
      // Clear any pending requests
      blockchainService.clearIndicesCache();
      
      // Fetch fresh data from blockchain (always fresh now, no cache)
      const allIndices = await blockchainService.getAllIndices();
      
      console.log('🔍 useBlockchain: Loaded fresh indices from blockchain:', allIndices);
      setIndices(allIndices);
      
      // Only check ownership if wallet is connected
      if (isConnected && walletAddress) {
        await checkOwnership();
      }
      
      console.log('✅ useBlockchain: Fresh data fetched successfully');
    } catch (err) {
      console.error("❌ Failed to refresh indices:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh indices from blockchain");
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
        // Network info will be automatically updated by wagmi hooks
        console.log('Network switched successfully');
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

  // Load indices on component mount (regardless of wallet connection)
  useEffect(() => {
    console.log('🔄 useBlockchain: Loading indices on mount...');
    refreshIndices().catch((err) => {
      console.warn("Warning: Failed to load indices on mount:", err);
    });
  }, []); // Only run once on mount

  // Sync wagmi wallet state with blockchain service
  useEffect(() => {
    console.log('🔄 useBlockchain wallet sync triggered');
    console.log('🔍 isConnected:', isConnected);
    console.log('🔍 walletAddress:', walletAddress);
    
    // Sync wallet state with blockchain service
    blockchainService.wallet.syncExternalWallet(walletAddress);
    
    if (isConnected && walletAddress) {
      console.log('✅ Wallet connected, refreshing indices and checking ownership...');
      refreshIndices().catch((err) => {
        console.warn("Warning: Failed to refresh indices after wallet connection:", err);
      });
    } else {
      console.log('❌ Wallet not connected, clearing ownership status...');
      // Only reset ownership status, keep indices visible
      setIsOwner(false);
      // Clear errors on disconnect to prevent stale error states
      setError(null);
    }
  }, [isConnected, walletAddress]); // Removed refreshIndices from dependency array to prevent infinite loop

  // Handle wallet disconnect events and connection recovery
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 Accounts changed:', accounts);
      if (accounts.length === 0) {
        console.log('🚪 Wallet disconnected');
        // Clear any connection errors when wallet is manually disconnected
        setError(null);
      }
    };

    const handleDisconnect = () => {
      console.log('🚪 Wallet disconnected event');
      setError(null);
    };

    // Listen for wallet events
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      (window as any).ethereum.on('disconnect', handleDisconnect);
    }

    return () => {
      if ((window as any).ethereum) {
        (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
        (window as any).ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  // Memoize indices to prevent unnecessary re-renders
  const memoizedIndices = useMemo(() => indices, [indices]);

  return {
    // State
    isConnected,
    walletAddress,
    isLoading,
    error,
    chainId,
    networkName,
    ethBalance,
    indices: memoizedIndices,

    // Actions
    connectWallet,
    createIndex,
    updateIndex,
    refreshIndices,
    clearIndexCache,
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
