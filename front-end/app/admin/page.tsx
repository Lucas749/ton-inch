"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { WalletConnect } from "@/components/WalletConnect";
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Settings,
  Database,
  TrendingUp
} from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { blockchainService } from "@/lib/blockchain-service";

interface IndexUpdateForm {
  indexId: number;
  newValue: string;
  isLoading: boolean;
}

export default function AdminPage() {
  const [indices, setIndices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updateForms, setUpdateForms] = useState<Map<number, IndexUpdateForm>>(new Map());
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { isConnected, walletAddress, indices: blockchainIndices, refreshIndices } = useBlockchain();

  // Load indices with current values
  const loadIndices = async () => {
    if (!isConnected) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get all indices from blockchain
      const indicesData = [];
      for (const index of blockchainIndices) {
        try {
          const { value, timestamp } = await blockchainService.getIndexValue(index.id);
          indicesData.push({
            ...index,
            currentValue: value,
            lastUpdate: new Date(timestamp * 1000).toLocaleString(),
            timestamp
          });
        } catch (err) {
          console.warn(`Failed to get value for index ${index.id}:`, err);
          indicesData.push({
            ...index,
            currentValue: 0,
            lastUpdate: "Never",
            timestamp: 0
          });
        }
      }
      
      setIndices(indicesData);
      setLastUpdated(new Date().toLocaleString());
      
      // Initialize update forms
      const forms = new Map();
      indicesData.forEach(index => {
        forms.set(index.id, {
          indexId: index.id,
          newValue: index.currentValue.toString(),
          isLoading: false
        });
      });
      setUpdateForms(forms);
      
    } catch (err: any) {
      setError(`Failed to load indices: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Update an index value
  const updateIndexValue = async (indexId: number) => {
    const form = updateForms.get(indexId);
    if (!form) return;
    
    try {
      // Update form loading state
      const newForms = new Map(updateForms);
      newForms.set(indexId, { ...form, isLoading: true });
      setUpdateForms(newForms);
      
      setError(null);
      setSuccessMessage(null);
      
      const newValue = parseFloat(form.newValue);
      if (isNaN(newValue)) {
        throw new Error("Invalid number format");
      }
      
      await blockchainService.updateIndex(indexId, Math.floor(newValue));
      
      setSuccessMessage(`Successfully updated index ${indexId} to ${newValue}`);
      
      // Reload data to show updated values
      await loadIndices();
      
    } catch (err: any) {
      setError(`Failed to update index ${indexId}: ${err.message}`);
      
      // Reset form loading state
      const newForms = new Map(updateForms);
      newForms.set(indexId, { ...form, isLoading: false });
      setUpdateForms(newForms);
    }
  };

  // Update form value
  const updateFormValue = (indexId: number, newValue: string) => {
    const form = updateForms.get(indexId);
    if (!form) return;
    
    const newForms = new Map(updateForms);
    newForms.set(indexId, { ...form, newValue });
    setUpdateForms(newForms);
  };

  // Load data on mount and when wallet connects
  useEffect(() => {
    if (isConnected) {
      loadIndices();
    } else {
      setIndices([]);
      setUpdateForms(new Map());
    }
  }, [isConnected, blockchainIndices]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            <Settings className="inline w-8 h-8 mr-2" />
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Manage and update index values in the oracle system. Only authorized wallets can update index values.
          </p>
        </div>

        {/* Wallet Connection */}
        {!isConnected && (
          <Card className="max-w-md mx-auto mb-8">
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Connect your wallet to access admin functions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletConnect />
            </CardContent>
          </Card>
        )}

        {/* Connected Content */}
        {isConnected && (
          <div className="space-y-6">
            {/* Status Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Connected as Admin</span>
                    </div>
                    <Badge variant="secondary">{walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      Last updated: {lastUpdated || "Never"}
                    </span>
                    <Button
                      onClick={loadIndices}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error/Success Messages */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {successMessage && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800">{successMessage}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Indices Management */}
            <div className="grid gap-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <TrendingUp className="w-6 h-6 mr-2" />
                Index Values Management
              </h2>

              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-6 bg-gray-200 rounded mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-10 bg-gray-200 rounded mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!isLoading && indices.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No indices found</h3>
                    <p className="text-gray-600">
                      No blockchain indices are available for management.
                    </p>
                  </CardContent>
                </Card>
              )}

              {!isLoading && indices.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {indices.map((index) => {
                    const form = updateForms.get(index.id);
                    return (
                      <Card key={index.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{index.name}</span>
                            <Badge variant="outline">ID: {index.id}</Badge>
                          </CardTitle>
                          <CardDescription>{index.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label className="text-gray-600">Current Value</Label>
                              <div className="font-bold text-lg">
                                {index.currentValue.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <Label className="text-gray-600">Last Update</Label>
                              <div className="text-sm text-gray-700">
                                {index.lastUpdate}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`value-${index.id}`}>New Value</Label>
                            <Input
                              id={`value-${index.id}`}
                              type="number"
                              value={form?.newValue || ""}
                              onChange={(e) => updateFormValue(index.id, e.target.value)}
                              placeholder="Enter new value"
                              disabled={form?.isLoading}
                            />
                          </div>

                          <Button
                            onClick={() => updateIndexValue(index.id)}
                            disabled={form?.isLoading || !form?.newValue}
                            className="w-full"
                          >
                            {form?.isLoading ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              "Update Value"
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}