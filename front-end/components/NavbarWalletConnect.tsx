"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  ChevronDown, 
  Copy, 
  ExternalLink, 
  LogOut,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavbarWalletConnect() {
  const { 
    isConnected, 
    walletAddress, 
    isLoading, 
    error, 
    chainId, 
    networkName,
    ethBalance,
    connectWallet,
    switchToBaseMainnet,
    clearError
  } = useBlockchain();
  
  const [copySuccess, setCopySuccess] = useState(false);

  const handleConnect = async () => {
    clearError();
    await connectWallet();
  };

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDisconnect = () => {
    // Reload the page to reset wallet state
    window.location.reload();
  };

  const handleSwitchToBase = async () => {
    clearError();
    await switchToBaseMainnet();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string | null) => {
    if (!balance) return "0.000";
    const num = parseFloat(balance);
    return num.toFixed(3);
  };

  const isWrongNetwork = chainId !== null && chainId !== 8453; // Base Mainnet

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-2">
        {error && (
          <div className="flex items-center space-x-1 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Connection Error</span>
          </div>
        )}
        <Button 
          onClick={handleConnect}
          disabled={isLoading}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
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
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Network Warning */}
      {isWrongNetwork && (
        <Button
          onClick={handleSwitchToBase}
          variant="outline"
          size="sm"
          className="border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          <AlertCircle className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Wrong Network</span>
        </Button>
      )}

      {/* Wallet Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center space-x-2 border-gray-200 hover:bg-gray-50"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-mono text-sm">
              {formatAddress(walletAddress!)}
            </span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {/* Wallet Info Header */}
          <div className="px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">Connected</span>
              </div>
              {networkName && (
                <Badge variant="secondary" className="text-xs">
                  {networkName}
                </Badge>
              )}
            </div>
            
            {/* Address */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-gray-600">
                {formatAddress(walletAddress!)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAddress}
                className="h-6 w-6 p-0"
              >
                {copySuccess ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>

            {/* Balance */}
            {ethBalance && (
              <div className="mt-2 text-sm text-gray-600">
                Balance: {formatBalance(ethBalance)} ETH
              </div>
            )}
          </div>

          <DropdownMenuSeparator />

          {/* Copy Full Address */}
          <DropdownMenuItem onClick={handleCopyAddress}>
            <Copy className="w-4 h-4 mr-2" />
            {copySuccess ? "Copied!" : "Copy Address"}
          </DropdownMenuItem>

          {/* View on Explorer */}
          <DropdownMenuItem onClick={() => {
            const explorerUrl = chainId === 8453 
              ? `https://basescan.org/address/${walletAddress}`
              : `https://etherscan.io/address/${walletAddress}`;
            window.open(explorerUrl, '_blank');
          }}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Explorer
          </DropdownMenuItem>

          {/* Switch Network (if needed) */}
          {isWrongNetwork && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSwitchToBase}>
                <AlertCircle className="w-4 h-4 mr-2 text-orange-600" />
                Switch to Base Mainnet
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          {/* Disconnect */}
          <DropdownMenuItem 
            onClick={handleDisconnect}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}