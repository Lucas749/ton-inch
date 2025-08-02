/**
 * 🪝 React Hook for Blockchain Integration
 *
 * This hook provides easy access to blockchain functionality in React components
 */

import { useState, useEffect, useCallback } from "react";
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
  chainId: number | null;
  networkName: string | null;

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
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [indices, setIndices] = useState<CustomIndex[]>([]);
  const [isOwner, setIsOwner] = useState<boolean>(false);

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
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(errorMessage);
      console.error("❌ Wallet connection failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      // Clear cache first to force fresh data
      blockchainService.clearIndicesCache();
      const allIndices = await blockchainService.getAllIndices();
      setIndices(allIndices);
      
      // Also check ownership when refreshing
      await checkOwnership();
    } catch (err) {
      console.error("❌ Failed to refresh indices:", err);
      // Don't set error state for background refresh failures
    }
  }, [checkOwnership]);

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

  // Set up event listeners on mount
  useEffect(() => {
    try {
      // Check if already connected (with safe connection check)
      if (blockchainService.wallet.safeIsWalletConnected()) {
        const address = blockchainService.getWalletAddress();
        if (address) {
          setWalletAddress(address);
          setIsConnected(true);

          // Load initial data with error handling
          blockchainService.getNetworkInfo().then((networkInfo) => {
            setChainId(networkInfo.chainId);
            setNetworkName(networkInfo.networkName);
          }).catch((err) => {
            console.warn("Warning: Failed to get network info on mount:", err);
          });

          blockchainService.getETHBalance().then((balance) => {
            setEthBalance(balance);
          }).catch((err) => {
            console.warn("Warning: Failed to get ETH balance on mount:", err);
          });

          refreshIndices().catch((err) => {
            console.warn("Warning: Failed to refresh indices on mount:", err);
          });
        }
      }

      // Listen for account changes with error handling
      blockchainService.onAccountChanged((account) => {
        try {
          if (account) {
            setWalletAddress(account);
            setIsConnected(true);

            // Refresh balances and data for new account
            blockchainService.getETHBalance().then(setEthBalance).catch((err) => {
              console.warn("Warning: Failed to refresh ETH balance after account change:", err);
            });
            refreshIndices().catch((err) => {
              console.warn("Warning: Failed to refresh indices after account change:", err);
            });
          } else {
            setWalletAddress(null);
            setIsConnected(false);
            setEthBalance(null);
            setIndices([]);
            setIsOwner(false);
            // Clear any error state when disconnecting
            setError(null);
          }
        } catch (err) {
          console.error("Error handling account change:", err);
          // Reset state on error
          setWalletAddress(null);
          setIsConnected(false);
          setEthBalance(null);
          setIndices([]);
          setIsOwner(false);
        }
      });

      // Listen for network changes with error handling
      blockchainService.onNetworkChanged(async (chainId) => {
        try {
          // Re-check wallet connection status after network change
          if (blockchainService.wallet.safeIsWalletConnected()) {
            const address = blockchainService.getWalletAddress();
            setWalletAddress(address);
            setIsConnected(true);
            
            // Update network info
            try {
              const networkInfo = await blockchainService.getNetworkInfo();
              setChainId(networkInfo.chainId);
              setNetworkName(networkInfo.networkName);
            } catch (err) {
              console.warn("Warning: Failed to get network info after network change:", err);
            }
            
            // Refresh balance and indices for new network
            try {
              const balance = await blockchainService.getETHBalance();
              setEthBalance(balance);
            } catch (err) {
              console.warn("Warning: Failed to refresh ETH balance after network change:", err);
            }

            try {
              await refreshIndices();
            } catch (err) {
              console.warn("Warning: Failed to refresh indices after network change:", err);
            }
          } else {
            // Wallet disconnected
            setIsConnected(false);
            setWalletAddress(null);
            setEthBalance(null);
            setIndices([]);
            setIsOwner(false);
            setError(null); // Clear error state
          }
        } catch (err) {
          console.error("Error handling network change:", err);
          // On error, assume disconnection
          setIsConnected(false);
          setWalletAddress(null);
          setEthBalance(null);
          setIndices([]);
          setIsOwner(false);
        }
      });
    } catch (err) {
      console.error("Error setting up wallet event listeners:", err);
      setError("Failed to initialize wallet connection");
    }

    // Cleanup function
    return () => {
      try {
        // Clean up event listeners when component unmounts
        blockchainService.wallet.cleanup();
      } catch (err) {
        console.warn("Warning: Error during wallet cleanup:", err);
      }
    };
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
    switchToBaseMainnet,
    getPrivateKeyForDemo,

      // Utils
    clearError,
    isOwner,
  };
}

// Export operators for easy use
export { OPERATORS };
