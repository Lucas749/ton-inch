"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Settings,
  Database,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Zap
} from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { blockchainService } from "@/lib/blockchain-service";

interface AdminBoxProps {
  indexId: number;
  indexName: string;
  className?: string;
}

export function AdminBox({ indexId, indexName, className = "" }: AdminBoxProps) {
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [newValue, setNewValue] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const { isConnected, walletAddress, refreshIndices } = useBlockchain();

  // Load current index value
  const loadIndexValue = async () => {
    if (!isConnected) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { value, timestamp } = await blockchainService.getIndexValue(indexId);
      setCurrentValue(value);
      setNewValue(value.toString());
      setLastUpdated(new Date(timestamp * 1000).toLocaleString());
      
    } catch (err: any) {
      setError(`Failed to load current value: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Update index value
  const updateIndexValue = async () => {
    if (!newValue.trim()) return;
    
    try {
      setIsUpdating(true);
      setError(null);
      setSuccessMessage(null);
      
      const numValue = parseFloat(newValue);
      if (isNaN(numValue)) {
        throw new Error("Invalid number format");
      }
      
      await blockchainService.updateIndex(indexId, Math.floor(numValue));
      
      setSuccessMessage(`Successfully updated ${indexName} to ${numValue}`);
      
      // Refresh indices to show updated values everywhere
      await refreshIndices();
      
      // Reload the current value
      await loadIndexValue();
      
    } catch (err: any) {
      setError(`Failed to update index: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Simulate price movement by percentage
  const simulatePriceMovement = async (percentage: number) => {
    if (!currentValue) return;
    
    try {
      setIsSimulating(true);
      setError(null);
      setSuccessMessage(null);
      
      const newSimulatedValue = Math.floor(currentValue * (1 + percentage / 100));
      
      await blockchainService.updateIndex(indexId, newSimulatedValue);
      
      const direction = percentage > 0 ? "increased" : "decreased";
      setSuccessMessage(`🎯 Simulated ${Math.abs(percentage)}% price ${direction}: ${currentValue.toLocaleString()} → ${newSimulatedValue.toLocaleString()}`);
      
      // Refresh indices to show updated values everywhere
      await refreshIndices();
      
      // Reload the current value
      await loadIndexValue();
      
    } catch (err: any) {
      setError(`Failed to simulate price movement: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Simulate random price movement
  const simulateRandomMovement = async () => {
    // Random percentage between -10% and +10%
    const randomPercentage = (Math.random() - 0.5) * 20;
    await simulatePriceMovement(randomPercentage);
  };

  // Load data on mount and when wallet connects
  useEffect(() => {
    if (isConnected) {
      loadIndexValue();
    }
  }, [isConnected, indexId]);

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Don't render if not connected
  if (!isConnected) {
    return null;
  }

  return (
    <Card className={`border-2 border-orange-200 bg-orange-50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <Settings className="w-5 h-5 text-orange-600" />
          <span>Admin Controls</span>
          <Badge variant="secondary" className="ml-2">
            {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Update oracle values for {indexName} (Index #{indexId})
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Value Display */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="font-medium">Current Value:</span>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-bold">{currentValue.toLocaleString()}</div>
            <div className="text-xs text-gray-500">
              {lastUpdated || "Never updated"}
            </div>
          </div>
        </div>

        {/* Update Form */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`admin-value-${indexId}`}>New Value</Label>
            <div className="flex space-x-2">
              <Input
                id={`admin-value-${indexId}`}
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter new value..."
                disabled={isUpdating || isLoading}
                className="font-mono"
              />
              <Button
                onClick={updateIndexValue}
                disabled={isUpdating || isLoading || !newValue.trim()}
                className="min-w-[100px]"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Update
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button
              onClick={loadIndexValue}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Price Simulation Section */}
        <div className="space-y-3 pt-4 border-t border-orange-200">
          <div className="flex items-center space-x-2 mb-3">
            <Zap className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-orange-900">Price Simulation</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {/* Quick percentage buttons */}
            <Button
              onClick={() => simulatePriceMovement(5)}
              disabled={isSimulating || isLoading || !currentValue}
              variant="outline"
              size="sm"
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              +5%
            </Button>
            
            <Button
              onClick={() => simulatePriceMovement(-5)}
              disabled={isSimulating || isLoading || !currentValue}
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              <TrendingDown className="w-3 h-3 mr-1" />
              -5%
            </Button>
            
            <Button
              onClick={() => simulatePriceMovement(10)}
              disabled={isSimulating || isLoading || !currentValue}
              variant="outline"
              size="sm"
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              +10%
            </Button>
            
            <Button
              onClick={() => simulatePriceMovement(-10)}
              disabled={isSimulating || isLoading || !currentValue}
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              <TrendingDown className="w-3 h-3 mr-1" />
              -10%
            </Button>
          </div>
          
          <Button
            onClick={simulateRandomMovement}
            disabled={isSimulating || isLoading || !currentValue}
            variant="outline"
            size="sm"
            className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <BarChart3 className="w-3 h-3 mr-2" />
                Random Movement
              </>
            )}
          </Button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-green-800 text-sm">{successMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}