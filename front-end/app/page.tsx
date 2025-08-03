"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IndicesExplorer } from '@/components/IndicesExplorer';
import { CustomIndexDialog } from '@/components/CustomIndexDialog';
import { WalletConnect } from '@/components/WalletConnect';
import { useBlockchain } from '@/hooks/useBlockchain';
import { formatIndexValueForDisplay } from '@/lib/blockchain-utils';
import { TrendingUp, BarChart3, ArrowRight, Sparkles, Activity, Users, Zap, Crown, Star, DollarSign, Bitcoin, TrendingDown, Target, Globe, Layers, ShieldCheck, Plus } from 'lucide-react';


export default function Home() {
  const router = useRouter();
  const { indices: blockchainIndices, isConnected, refreshIndices } = useBlockchain();

  // Get blockchain indices 0-2 for featured section with appropriate icons
  const featuredBlockchainIndices = blockchainIndices.slice(0, 3);
  
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
    const categoryIcon = (() => {
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
    })();
    
    // DEBUG: Log icon selection for index 15
    if (index.id === 15) {
      console.log('🎯 DEBUG: Icon for index 15:', {
        indexId: index.id,
        category: index.category,
        iconMapHit: !!iconMap[index.id],
        selectedIcon: categoryIcon,
        hasAvatar: !!(index as any).avatar,
        avatar: (index as any).avatar
      });
    }
    
    return categoryIcon;
  };

  // Custom blockchain indices - exclude featured (0-2) and sort by most recent
  const customBlockchainIndices = blockchainIndices
    .filter(index => index.id > 2) // Exclude featured indices 0-2
    .sort((a, b) => b.id - a.id); // Sort by most recent (highest ID first)

  // DEBUG: Log index 15 data
  const index15 = blockchainIndices.find(idx => idx.id === 15);
  if (index15) {
    console.log('🌽 DEBUG: Index 15 data in main page:', {
      id: index15.id,
      name: index15.name,
      symbol: index15.symbol,
      category: index15.category,
      active: index15.active,
      avatar: (index15 as any).avatar,
      sourceUrl: (index15 as any).sourceUrl || 'NO_SOURCE_URL'
    });
  }

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
      
      {/* Hero Section - Premium Design */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Gradient Mesh */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20"></div>
          
          {/* Animated Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
          
          {/* Floating Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-7xl mx-auto">
            {/* Main Content */}
            <div className="text-center mb-16 pt-16">
              {/* Main Headline */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-tight">
                <span className="text-white">Trade When</span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                  Conditions
                </span>
                <br />
                <span className="text-white">Are Perfect</span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
                Revolutionary DeFi automation that executes trades based on{' '}
                <span className="text-blue-400 font-semibold">real-world data triggers.</span>{' '}
                Set intelligent conditions, optimize timing, and never miss the perfect trade again.
              </p>
            </div>

            {/* Animated Live Trading Example */}
            <div className="max-w-4xl mx-auto mt-20">
              <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur border border-gray-700/50 rounded-3xl p-8 overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
                {/* Animated Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-500"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                
                <div className="relative">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 text-sm font-medium mb-4 hover:scale-105 transition-transform duration-300">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      Live Trading Example
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors duration-300">VIX Volatility Strategy</h3>
                    <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Monitoring market fear index in real-time</p>
                  </div>

                  {/* Animated Trading Interface Mockup */}
                  <div className="bg-black/50 rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 hover:rotate-12">
                          <span className="text-2xl animate-pulse">⚡</span>
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg group-hover:text-blue-300 transition-colors duration-300">Market Fear Strategy</div>
                          <div className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors duration-300">Automated volatility hedge</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse hover:scale-125 transition-transform duration-300"></div>
                        <span className="text-green-300 font-medium hover:text-green-200 transition-colors duration-300">Active</span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800/70 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                          <div className="text-gray-400 text-sm mb-1">Condition</div>
                          <div className="text-white font-mono group-hover:text-blue-300 transition-colors duration-300">IF VIX Index &gt; 25.0</div>
                          <div className="text-blue-300 text-sm mt-1 flex items-center">
                            <span className="animate-pulse">Current: 22.57</span>
                            <span className="ml-2 animate-bounce">⬇</span>
                          </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800/70 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                          <div className="text-gray-400 text-sm mb-1">Position Size</div>
                          <div className="text-white group-hover:text-purple-300 transition-colors duration-300">0.5 ETH → USDC</div>
                          <div className="text-gray-400 text-sm mt-1 group-hover:text-gray-300 transition-colors duration-300">~$1,247.50</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800/70 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                          <div className="text-gray-400 text-sm mb-1">Expected Execution</div>
                          <div className="text-yellow-300 group-hover:text-yellow-200 transition-colors duration-300 flex items-center">
                            <span className="animate-pulse">Standby Mode</span>
                            <div className="ml-2 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                          </div>
                          <div className="text-gray-400 text-sm mt-1 group-hover:text-gray-300 transition-colors duration-300">Waiting for trigger</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800/70 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                          <div className="text-gray-400 text-sm mb-1">Profit Target</div>
                          <div className="text-green-400 group-hover:text-green-300 transition-colors duration-300 flex items-center">
                            <span>+12.5% when VIX spikes</span>
                            <span className="ml-2 animate-bounce">📈</span>
                          </div>
                          <div className="text-gray-400 text-sm mt-1 group-hover:text-gray-300 transition-colors duration-300">Historical avg</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
              
        <main className="container mx-auto px-4 py-6">
         {/* Featured Blockchain Indices Section */}
         <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
              Featured Indices
            </h2>

          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <span>Value: {formatIndexValueForDisplay(index.id, index.value)}</span>
                    <Badge variant="secondary" className="text-xs">{index.category || 'Index'}</Badge>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full text-center py-8">
                <div className="text-gray-500">Loading blockchain indices...</div>
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
            {isConnected && (
              <CustomIndexDialog 
                onIndexCreated={(indexId) => {
                  console.log(`🎉 New custom index created with ID: ${indexId}`);
                  // Refresh blockchain indices to show the new index
                  refreshIndices();
                }}
                trigger={
                  <Button variant="default" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Custom Index
                  </Button>
                }
              />
            )}
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
                      {formatIndexValueForDisplay(index.id, index.value)}
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
                    <div className="text-lg mb-2">📊</div>
                    <div className="text-sm">Loading custom indices...</div>
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