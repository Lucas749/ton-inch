"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowUpDown,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import {
  OneInchService,
  TOKENS,
  SwapQuoteResponse,
  IntentSwapQuoteResponse,
  SwapMode,
  OrderStatus,
} from "@/lib/1inch-service";
import { TokenSelector } from "@/components/TokenSelector";
import { Token, tokenService } from "@/lib/token-service";

interface SwapInterfaceProps {
  walletAddress?: string;
  apiKey?: string;
  rpcUrl?: string;
}

export function SwapInterface({
  walletAddress,
  apiKey,
  rpcUrl,
}: SwapInterfaceProps) {
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(1);
  const [swapMode, setSwapMode] = useState<SwapMode>("classic");
  const [quote, setQuote] = useState<SwapQuoteResponse | null>(null);
  const [intentQuote, setIntentQuote] =
    useState<IntentSwapQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [orderHash, setOrderHash] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [preset, setPreset] = useState<"fast" | "fair" | "auction">("fast");

  const oneInchService =
    apiKey && rpcUrl && walletAddress
      ? new OneInchService({
          apiKey,
          rpcUrl,
          walletAddress,
        })
      : null;

  const isConfigured = !!oneInchService;

  // Initialize with popular tokens
  useEffect(() => {
    const popularTokens = tokenService.getPopularTokens();
    if (popularTokens.length >= 2 && !fromToken && !toToken) {
      setFromToken(popularTokens[0]); // WETH
      setToToken(popularTokens[1]); // USDC
    }
  }, [fromToken, toToken]);

  // Get quote when amount or tokens change
  useEffect(() => {
    if (
      fromAmount &&
      parseFloat(fromAmount) > 0 &&
      isConfigured &&
      fromToken &&
      toToken
    ) {
      if (swapMode === "classic") {
        getQuote();
      } else {
        getIntentQuote();
      }
    } else {
      setToAmount("");
      setQuote(null);
      setIntentQuote(null);
    }
  }, [
    fromAmount,
    fromToken,
    toToken,
    slippage,
    swapMode,
    preset,
    isConfigured,
  ]);

  const getQuote = async () => {
    if (
      !oneInchService ||
      !fromAmount ||
      parseFloat(fromAmount) <= 0 ||
      !fromToken ||
      !toToken
    )
      return;

    setIsLoadingQuote(true);
    setError("");

    try {
      const amount = OneInchService.parseTokenAmount(
        fromAmount,
        fromToken.decimals
      );

      const quoteResponse = await oneInchService.getSwapQuote({
        src: fromToken.address,
        dst: toToken.address,
        amount,
        from: walletAddress!,
        slippage,
      });

      setQuote(quoteResponse);
      const formattedAmount = OneInchService.formatTokenAmount(
        quoteResponse.dstAmount,
        toToken.decimals
      );
      setToAmount(formattedAmount);
    } catch (err) {
      setError(`Failed to get quote: ${(err as Error).message}`);
      setToAmount("");
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const getIntentQuote = async () => {
    if (
      !oneInchService ||
      !fromAmount ||
      parseFloat(fromAmount) <= 0 ||
      !fromToken ||
      !toToken
    )
      return;

    setIsLoadingQuote(true);
    setError("");

    try {
      const amount = OneInchService.parseTokenAmount(
        fromAmount,
        fromToken.decimals
      );

      const intentQuoteResponse = await oneInchService.getIntentSwapQuote({
        srcToken: fromToken.address,
        dstToken: toToken.address,
        amount,
        walletAddress: walletAddress!,
        preset,
      });

      setIntentQuote(intentQuoteResponse);
      const formattedAmount = OneInchService.formatTokenAmount(
        intentQuoteResponse.dstAmount,
        toToken.decimals
      );
      setToAmount(formattedAmount);
    } catch (err) {
      setError(`Failed to get Intent quote: ${(err as Error).message}`);
      setToAmount("");
      setIntentQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount("");
    setQuote(null);
    setIntentQuote(null);
  };

  const handleSwap = async () => {
    if (swapMode === "classic") {
      await handleClassicSwap();
    } else {
      await handleIntentSwap();
    }
  };

  const handleClassicSwap = async () => {
    if (!oneInchService || !fromAmount || !quote || !fromToken || !toToken)
      return;

    setIsSwapping(true);
    setError("");
    setSuccess("");

    try {
      const amount = OneInchService.parseTokenAmount(
        fromAmount,
        fromToken.decimals
      );

      const result = await oneInchService.performSwap({
        src: fromToken.address,
        dst: toToken.address,
        amount,
        from: walletAddress!,
        slippage,
      });

      setTxHash(result.swapTxHash);
      setSuccess(
        `Classic swap successful! ${
          result.approvalTxHash ? "Approval and swap" : "Swap"
        } transaction${result.approvalTxHash ? "s" : ""} completed.`
      );

      // Reset form
      setFromAmount("");
      setToAmount("");
      setQuote(null);
    } catch (err) {
      setError(`Classic swap failed: ${(err as Error).message}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleIntentSwap = async () => {
    if (
      !oneInchService ||
      !fromAmount ||
      !intentQuote ||
      !fromToken ||
      !toToken
    )
      return;

    setIsSwapping(true);
    setError("");
    setSuccess("");

    try {
      const amount = OneInchService.parseTokenAmount(
        fromAmount,
        fromToken.decimals
      );

      const result = await oneInchService.performIntentSwap({
        srcToken: fromToken.address,
        dstToken: toToken.address,
        amount,
        walletAddress: walletAddress!,
        preset,
      });

      setOrderHash(result.orderHash);
      setSuccess(
        `Intent swap order created successfully! Order will be filled by resolvers. No gas fees required.`
      );

      // Start monitoring order status
      monitorOrderStatus(result.orderHash);

      // Reset form
      setFromAmount("");
      setToAmount("");
      setIntentQuote(null);
    } catch (err) {
      setError(`Intent swap failed: ${(err as Error).message}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const monitorOrderStatus = async (orderHash: string) => {
    try {
      const status = await oneInchService!.getOrderStatus(orderHash);
      setOrderStatus(status);

      // Continue monitoring if order is still pending
      if (status.status === "pending" || status.status === "partially-filled") {
        setTimeout(() => monitorOrderStatus(orderHash), 10000); // Check every 10 seconds
      }
    } catch (err) {
      console.error("Failed to get order status:", err);
    }
  };

  const getExplorerUrl = (hash: string) => {
    return `https://sepolia.basescan.org/tx/${hash}`;
  };

  if (!isConfigured) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowUpDown className="w-5 h-5" />
            <span>1inch Swap</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Swap interface requires wallet connection and API configuration.
              Please connect your wallet and configure the 1inch API key.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-5 h-5" />
            <span>1inch Swap</span>
          </div>
          <Badge variant="outline" className="text-xs">
            Base Sepolia
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Swap Mode Selector */}
        <div className="space-y-2">
          <Label>Swap Mode</Label>
          <div className="flex space-x-2">
            <Button
              variant={swapMode === "classic" ? "default" : "outline"}
              size="sm"
              onClick={() => setSwapMode("classic")}
              className="flex-1"
            >
              Classic Swap
            </Button>
            <Button
              variant={swapMode === "intent" ? "default" : "outline"}
              size="sm"
              onClick={() => setSwapMode("intent")}
              className="flex-1"
            >
              Intent Swap (Gasless)
            </Button>
          </div>
          {swapMode === "intent" && (
            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
              <strong>Intent Swap:</strong> Gasless swaps using Dutch auction.
              Orders are filled by resolvers with no upfront gas costs.
            </div>
          )}
        </div>

        {/* Preset selector for Intent swaps */}
        {swapMode === "intent" && (
          <div className="space-y-2">
            <Label>Execution Speed</Label>
            <Select
              value={preset}
              onValueChange={(value: "fast" | "fair" | "auction") =>
                setPreset(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast - Quick execution</SelectItem>
                <SelectItem value="fair">
                  Fair - Balanced speed/price
                </SelectItem>
                <SelectItem value="auction">Auction - Best price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {/* From Token */}
        <div className="space-y-2">
          <Label htmlFor="from-amount">From</Label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                id="from-amount"
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                disabled={isSwapping}
              />
            </div>
            <div className="w-32">
              <TokenSelector
                selectedToken={fromToken}
                onTokenSelect={setFromToken}
                placeholder="From"
                disabled={isSwapping}
                excludeTokens={toToken ? [toToken.address] : []}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapTokens}
            disabled={isSwapping || isLoadingQuote}
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <Label htmlFor="to-amount">To</Label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                id="to-amount"
                type="number"
                placeholder="0.0"
                value={toAmount}
                disabled
              />
            </div>
            <div className="w-32">
              <TokenSelector
                selectedToken={toToken}
                onTokenSelect={setToToken}
                placeholder="To"
                disabled={isSwapping}
                excludeTokens={fromToken ? [fromToken.address] : []}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Slippage */}
        <div className="space-y-2">
          <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
          <Select
            value={slippage.toString()}
            onValueChange={(value) => setSlippage(parseFloat(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5%</SelectItem>
              <SelectItem value="1">1%</SelectItem>
              <SelectItem value="2">2%</SelectItem>
              <SelectItem value="5">5%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quote Information */}
        {swapMode === "classic" && quote && fromToken && toToken && (
          <div className="p-3 bg-blue-50 rounded-lg space-y-2">
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Rate:</span>
                <span>
                  1 {fromToken.symbol} ≈{" "}
                  {(
                    parseFloat(
                      OneInchService.formatTokenAmount(
                        quote.dstAmount,
                        toToken.decimals
                      )
                    ) / parseFloat(fromAmount)
                  ).toFixed(6)}{" "}
                  {toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Est. Gas:</span>
                <span>{parseInt(quote.gas).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Intent Quote Information */}
        {swapMode === "intent" && intentQuote && fromToken && toToken && (
          <div className="p-3 bg-green-50 rounded-lg space-y-2">
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Starting Rate:</span>
                <span>
                  1 {fromToken.symbol} ≈{" "}
                  {(
                    parseFloat(
                      OneInchService.formatTokenAmount(
                        intentQuote.auctionStartAmount,
                        toToken.decimals
                      )
                    ) / parseFloat(fromAmount)
                  ).toFixed(6)}{" "}
                  {toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Minimum Rate:</span>
                <span>
                  1 {fromToken.symbol} ≈{" "}
                  {(
                    parseFloat(
                      OneInchService.formatTokenAmount(
                        intentQuote.auctionEndAmount,
                        toToken.decimals
                      )
                    ) / parseFloat(fromAmount)
                  ).toFixed(6)}{" "}
                  {toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Auction Duration:</span>
                <span>
                  {Math.floor(intentQuote.auctionDuration / 60)} minutes
                </span>
              </div>
              <div className="flex justify-between">
                <span>Gas Cost:</span>
                <span className="text-green-600 font-semibold">
                  Free (Gasless)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
              {txHash && (
                <div className="mt-2">
                  <a
                    href={getExplorerUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                  >
                    <span>View Transaction</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {orderHash && (
                <div className="mt-2 text-xs">
                  <div>
                    Order Hash:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      {orderHash.slice(0, 10)}...{orderHash.slice(-8)}
                    </code>
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Order Status for Intent Swaps */}
        {orderStatus && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-1">
                <div>
                  Order Status:{" "}
                  <Badge variant="outline">{orderStatus.status}</Badge>
                </div>
                <div className="text-xs">
                  Created:{" "}
                  {new Date(orderStatus.createdAt * 1000).toLocaleString()}
                </div>
                {orderStatus.fills.length > 0 && (
                  <div className="text-xs">
                    Fills: {orderStatus.fills.length}
                    {orderStatus.fills.map((fill, i) => (
                      <div key={i} className="ml-2">
                        <a
                          href={getExplorerUrl(fill.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Fill {i + 1}: {fill.txHash.slice(0, 10)}...
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={
            !fromToken ||
            !toToken ||
            !fromAmount ||
            !toAmount ||
            parseFloat(fromAmount) <= 0 ||
            isSwapping ||
            isLoadingQuote ||
            (swapMode === "classic" && !quote) ||
            (swapMode === "intent" && !intentQuote)
          }
          className="w-full"
        >
          {isSwapping ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {swapMode === "intent" ? "Creating Order..." : "Swapping..."}
            </>
          ) : isLoadingQuote ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Quote...
            </>
          ) : swapMode === "intent" ? (
            "Create Intent Order"
          ) : (
            "Swap Tokens"
          )}
        </Button>

        {/* Powered by 1inch */}
        <div className="text-center text-xs text-gray-500">
          Powered by{" "}
          <a
            href="https://1inch.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            1inch
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
