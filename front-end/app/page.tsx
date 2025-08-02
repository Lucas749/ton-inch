"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IndicesExplorer } from '@/components/IndicesExplorer';
import { useBlockchain } from '@/hooks/useBlockchain';
import { TrendingUp, BarChart3, ArrowRight, Sparkles, Activity, Users, Zap, Crown, Star, DollarSign, Bitcoin, TrendingDown } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { indices: blockchainIndices } = useBlockchain();

  // Get blockchain indices 0-4 for featured section with appropriate icons
  const featuredBlockchainIndices = blockchainIndices.slice(0, 5);
  
  // Icon mapping for blockchain indices based on what they represent
  const getIconForIndex = (index: any) => {
    const iconMap: { [key: number]: string } = {
      0: "📈", // Inflation Rate
      1: "🐦", // Elon Followers (Twitter)
      2: "₿",  // BTC Price
      3: "⚡", // VIX Index (Volatility)
      4: "👥", // Unemployment
      5: "🚗"  // Tesla Stock
    };
    
    // Use category-based fallbacks for unknown indices
    if (iconMap[index.id]) {
      return iconMap[index.id];
    }
    
    // Category-based icon fallbacks
    switch (index.category?.toLowerCase()) {
      case 'crypto': return "🪙";
      case 'stocks': return "📊";
      case 'economics': return "🏛️";
      case 'intelligence': return "🧠";
      case 'indices': return "📈";
      case 'commodities': return "🥇";
      case 'forex': return "💱";
      default: return "🔵";
    }
  };

  // All blockchain indices for custom section (instead of mock data)
  const customBlockchainIndices = blockchainIndices;

  // Top AlphaVantage categories
  const topStocks = [
    { name: "Apple Inc.", symbol: "AAPL", avatar: "🍎", change: "+2.1%", price: "$150.25", isPositive: true },
    { name: "Tesla Inc.", symbol: "TSLA", avatar: "🚗", change: "+5.7%", price: "$238.50", isPositive: true },
    { name: "Microsoft", symbol: "MSFT", avatar: "🖥️", change: "+1.8%", price: "$378.85", isPositive: true }
  ];

  const cryptoDefi = [
    { name: "Bitcoin", symbol: "BTC", avatar: "₿", change: "+0.17%", price: "$113.4K", isPositive: true },
    { name: "Ethereum", symbol: "ETH", avatar: "Ξ", change: "+3.2%", price: "$2,845", isPositive: true }
  ];

  const commoditiesForex = [
    { name: "WTI Crude Oil", symbol: "WTI", avatar: "🛢️", change: "+1.5%", price: "$72.45", isPositive: true },
    { name: "Gold", symbol: "GLD", avatar: "🥇", change: "-0.8%", price: "$2,045", isPositive: false },
    { name: "EUR/USD", symbol: "EURUSD", avatar: "💱", change: "-0.3%", price: "1.0845", isPositive: false }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6">
        {/* Featured Blockchain Indices Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
              Featured Indices
            </h2>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {featuredBlockchainIndices.length > 0 ? featuredBlockchainIndices.map((index) => (
              <Card 
                key={index.id} 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200"
                onClick={() => router.push(`/index/blockchain_${index.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">
                        {getIconForIndex(index)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{index.name || `Index ${index.id}`}</div>
                        <div className="text-sm text-gray-500">{index.symbol || `#${index.id}`}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Value: {(index.value / 100).toFixed(2)}</span>
                    <Badge variant="secondary" className="text-xs">{index.category || 'Index'}</Badge>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full text-center py-8">
                <div className="text-gray-500">Connect wallet to view blockchain indices</div>
              </div>
            )}
          </div>
        </div>

        {/* Custom Indices Section - All Blockchain Indices */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-500" />
              Custom Indices
            </h2>
            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
              Create custom <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {customBlockchainIndices.length > 0 ? customBlockchainIndices.map((index) => (
              <Card 
                key={index.id} 
                className="min-w-[280px] hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200"
                onClick={() => router.push(`/index/blockchain_${index.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getIconForIndex(index)}</span>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{index.name || `Index ${index.id}`}</div>
                        <div className="text-xs text-gray-500">#{index.id} • {index.symbol || 'IDX'}</div>
                      </div>
                    </div>
                    <div className="text-xs font-medium px-2 py-1 rounded text-blue-600 bg-blue-50">
                      {(index.value / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{index.category || 'Custom'}</span>
                    <div className="flex space-x-1">
                      <Badge variant="outline" className="text-xs px-2 py-0">
                        Live
                      </Badge>
                      {index.active && (
                        <Badge variant="secondary" className="text-xs px-2 py-0 bg-green-100 text-green-800">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card className="min-w-[280px] border border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="text-gray-500">
                    <div className="text-lg mb-2">🔗</div>
                    <div className="text-sm">Connect wallet to view custom indices</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Top Stocks Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
              Top Stocks
            </h2>
            <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
              View all stocks <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topStocks.map((stock) => (
              <Card key={stock.symbol} className="hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{stock.avatar}</span>
                      <div>
                        <div className="font-medium text-gray-900">{stock.name}</div>
                        <div className="text-sm text-gray-500">{stock.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{stock.price}</div>
                      <div className={`text-sm ${stock.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {stock.change}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Crypto & DeFi Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Bitcoin className="w-5 h-5 mr-2 text-orange-500" />
              Crypto & DeFi
            </h2>
            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
              View all crypto <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cryptoDefi.map((crypto) => (
              <Card key={crypto.symbol} className="hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{crypto.avatar}</span>
                      <div>
                        <div className="font-medium text-gray-900">{crypto.name}</div>
                        <div className="text-sm text-gray-500">{crypto.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{crypto.price}</div>
                      <div className={`text-sm ${crypto.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {crypto.change}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Commodities & Forex Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-yellow-500" />
              Commodities & Forex
            </h2>
            <Button variant="ghost" size="sm" className="text-yellow-600 hover:text-yellow-700">
              View all markets <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {commoditiesForex.map((item) => (
              <Card key={item.symbol} className="hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{item.avatar}</span>
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{item.price}</div>
                      <div className={`text-sm ${item.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {item.change}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Indices Table - Cookie.fun style (filtered) */}
        <IndicesExplorer 
          excludeSymbols={[
            'AAPL', 'TSLA', 'MSFT',  // Shown in Top Stocks
            'BTC', 'ETH',            // Shown in Crypto & DeFi
            'WTI', 'GLD', 'EURUSD'   // Shown in Commodities & Forex
          ]}
        />

        {/* Bottom Stats Section */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">24.7K</div>
            <div className="text-sm text-gray-500">Active Traders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">$12.4M</div>
            <div className="text-sm text-gray-500">Volume 24h</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">156</div>
            <div className="text-sm text-gray-500">Live Indices</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">99.9%</div>
            <div className="text-sm text-gray-500">Uptime</div>
          </div>
        </div>
      </main>
    </div>
  );
}