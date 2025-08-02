"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowUpDown,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Repeat2,
} from "lucide-react";
import {
  OneInchService,
  TOKENS,
  SwapQuoteResponse,
  IntentSwapQuoteResponse,
  SwapMode,
} from "@/lib/1inch-service";
import { TokenSelector } from "@/components/TokenSelector";
import { Token, tokenService } from "@/lib/token-service";

interface SwapBoxProps {
  walletAddress?: string;
  apiKey?: string;
  rpcUrl?: string;
  indexName?: string;
  className?: string;
}

export function SwapBox({
  walletAddress,
  apiKey,
  rpcUrl,
  indexName = "this index",
  className = "",
}: SwapBoxProps) {
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(1);
  const [swapMode, setSwapMode] = useState<SwapMode>("classic");
  const [quote, setQuote] = useState<SwapQuoteResponse | null>(null);
  const [intentQuote, setIntentQuote] = useState<IntentSwapQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

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
      setFromToken(popularTokens[1]); // USDC
      setToToken(popularTokens[0]); // WETH
    }
  }, [fromToken, toToken]);

  // Get quote when parameters change
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
  }, [fromAmount, fromToken, toToken, slippage, swapMode, isConfigured]);

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
        preset: "fast",
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
      setSuccess(`Swap successful! 🎉`);

      // Reset form
      setFromAmount("");
      setToAmount("");
      setQuote(null);
    } catch (err) {
      setError(`Swap failed: ${(err as Error).message}`);
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
        preset: "fast",
      });

      setSuccess(`Intent swap order created! No gas fees required 🚀`);

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

  const getExplorerUrl = (hash: string) => {
    return `https://basescan.org/tx/${hash}`;
  };

  if (!isConfigured) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Repeat2 className="w-5 h-5 text-blue-600" />
            <span>Quick Swap</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Connect wallet to enable swaps</p>
            <p className="text-xs text-gray-500 mt-1">
              Swap tokens while tracking {indexName}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Repeat2 className="w-5 h-5 text-blue-600" />
            <span>Quick Swap</span>
          </CardTitle>
          <div className="flex space-x-1">
            <Button
              variant={swapMode === "classic" ? "default" : "outline"}
              size="sm"
              onClick={() => setSwapMode("classic")}
              className="text-xs px-2 py-1"
            >
              Classic
            </Button>
            <Button
              variant={swapMode === "intent" ? "default" : "outline"}
              size="sm"
              onClick={() => setSwapMode("intent")}
              className="text-xs px-2 py-1"
            >
              Gasless
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {swapMode === "classic" ? "Instant swap with gas" : "No gas fees, gasless swap"}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* From Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">From</span>
            {fromToken && (
              <span className="text-xs text-gray-500">
                Balance: 0.00 {fromToken.symbol}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <TokenSelector
              selectedToken={fromToken}
              onTokenSelect={setFromToken}
              className="flex-shrink-0"
            />
            <Input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="text-right"
            />
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapTokens}
            className="rounded-full p-2 h-8 w-8"
            disabled={isLoadingQuote}
          >
            <ArrowUpDown className="w-3 h-3" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">To</span>
            {toToken && (
              <span className="text-xs text-gray-500">
                Balance: 0.00 {toToken.symbol}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <TokenSelector
              selectedToken={toToken}
              onTokenSelect={setToToken}
              className="flex-shrink-0"
            />
            <Input
              type="text"
              placeholder="0.0"
              value={isLoadingQuote ? "..." : toAmount}
              readOnly
              className="text-right bg-gray-50"
            />
          </div>
        </div>

        {/* Quote Info */}
        {(quote || intentQuote) && (
          <div className="bg-blue-50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Rate</span>
              <span className="font-medium">
                1 {fromToken?.symbol} = {
                  quote 
                    ? (parseFloat(OneInchService.formatTokenAmount(quote.dstAmount, toToken?.decimals || 18)) / parseFloat(fromAmount || "1")).toFixed(6)
                    : (parseFloat(OneInchService.formatTokenAmount(intentQuote?.dstAmount || "0", toToken?.decimals || 18)) / parseFloat(fromAmount || "1")).toFixed(6)
                } {toToken?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Slippage</span>
              <span className="font-medium">{slippage}%</span>
            </div>
            {quote && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Gas Fee</span>
                <span className="font-medium">~${(parseInt(quote.gas) * 0.000000001 * 2000).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-700">
              {success}
              {txHash && (
                <a
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center ml-2 text-blue-600 hover:text-blue-800"
                >
                  View Tx <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={
            !fromAmount ||
            !fromToken ||
            !toToken ||
            parseFloat(fromAmount) <= 0 ||
            isLoadingQuote ||
            isSwapping ||
            (!quote && !intentQuote)
          }
          className="w-full"
        >
          {isSwapping ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Swapping...
            </>
          ) : isLoadingQuote ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Quote...
            </>
          ) : (
            `Swap ${fromToken?.symbol || 'Token'} → ${toToken?.symbol || 'Token'}`
          )}
        </Button>

        {/* Swap Mode Badge */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-xs">
            {swapMode === "classic" ? "🔥 Instant Swap" : "⚡ Gasless Intent"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}