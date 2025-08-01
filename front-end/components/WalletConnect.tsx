/**
 * 🔗 Wallet Connection Component
 *
 * This component handles wallet connection and displays connection status
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";

interface WalletConnectProps {
  className?: string;
  showBalance?: boolean;
  showNetwork?: boolean;
  compact?: boolean;
}

export function WalletConnect({
  className = "",
  showBalance = true,
  showNetwork = true,
  compact = false,
}: WalletConnectProps) {
  const {
    isConnected,
    walletAddress,
    isLoading,
    error,
    chainId,
    networkName,
    ethBalance,
    connectWallet,
    clearError,
  } = useBlockchain();

  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      clearError();
      await connectWallet();
    } catch (err) {
      console.error("Connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num < 0.001) return "< 0.001";
    return num.toFixed(4);
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {isConnected ? (
          <>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {formatAddress(walletAddress!)}
            </Badge>
            {showBalance && ethBalance && (
              <Badge variant="outline">{formatBalance(ethBalance)} ETH</Badge>
            )}
          </>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isLoading || isConnecting}
            size="sm"
            variant="outline"
          >
            {isLoading || isConnecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wallet className="w-4 h-4 mr-2" />
            )}
            Connect Wallet
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="w-5 h-5" />
          <span>Wallet Connection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isConnected ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Connect your wallet to interact with the blockchain and manage
              your strategies.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isLoading || isConnecting}
              className="w-full"
            >
              {isLoading || isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500">
              Make sure you have MetaMask or another Web3 wallet installed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Connected</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Address:</span>
                <Badge variant="outline" className="font-mono">
                  {formatAddress(walletAddress!)}
                </Badge>
              </div>

              {showNetwork && networkName && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Network:</span>
                  <Badge
                    variant={chainId === 84532 ? "default" : "destructive"}
                  >
                    {networkName}
                  </Badge>
                </div>
              )}

              {showBalance && ethBalance && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Balance:</span>
                  <Badge variant="outline">
                    {formatBalance(ethBalance)} ETH
                  </Badge>
                </div>
              )}
            </div>

            {chainId !== 84532 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please switch to Base Sepolia network for full functionality.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WalletConnect;
