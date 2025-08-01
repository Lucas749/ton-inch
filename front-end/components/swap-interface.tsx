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
} from "lucide-react";
import { OneInchService, TOKENS, SwapQuoteResponse } from "@/lib/1inch-service";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

const AVAILABLE_TOKENS: Token[] = [
  { address: TOKENS.ETH, symbol: "ETH", name: "Ethereum", decimals: 18 },
  { address: TOKENS.USDC, symbol: "USDC", name: "USD Coin", decimals: 6 },
  {
    address: TOKENS.WETH,
    symbol: "WETH",
    name: "Wrapped Ethereum",
    decimals: 18,
  },
];

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
  const [fromToken, setFromToken] = useState<Token>(AVAILABLE_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(AVAILABLE_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(1);
  const [quote, setQuote] = useState<SwapQuoteResponse | null>(null);
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

  // Get quote when amount or tokens change
  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0 && isConfigured) {
      getQuote();
    } else {
      setToAmount("");
      setQuote(null);
    }
  }, [fromAmount, fromToken, toToken, slippage, isConfigured]);

  const getQuote = async () => {
    if (!oneInchService || !fromAmount || parseFloat(fromAmount) <= 0) return;

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

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount("");
    setQuote(null);
  };

  const handleSwap = async () => {
    if (!oneInchService || !fromAmount || !quote) return;

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
        `Swap successful! ${
          result.approvalTxHash ? "Approval and swap" : "Swap"
        } transaction${result.approvalTxHash ? "s" : ""} completed.`
      );

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
            <Select
              value={fromToken.address}
              onValueChange={(value) => {
                const token = AVAILABLE_TOKENS.find((t) => t.address === value);
                if (token) setFromToken(token);
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_TOKENS.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select
              value={toToken.address}
              onValueChange={(value) => {
                const token = AVAILABLE_TOKENS.find((t) => t.address === value);
                if (token) setToToken(token);
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_TOKENS.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        {quote && (
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
            </AlertDescription>
          </Alert>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={
            !fromAmount ||
            !toAmount ||
            parseFloat(fromAmount) <= 0 ||
            isSwapping ||
            isLoadingQuote ||
            !quote
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
