'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Activity, ArrowUp, ArrowDown } from 'lucide-react';

interface Stock {
  ticker: string;
  price: string;
  change_amount: string;
  change_percentage: string;
  volume: string;
}

interface TopMoversData {
  top_gainers: Stock[];
  top_losers: Stock[];
  most_actively_traded: Stock[];
  last_updated: string;
}

export default function TopMoversWidget() {
  const [data, setData] = useState<TopMoversData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // Refresh every 15 minutes
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/alphavantage?endpoint=top_gainers_losers');
      const result = await response.json();
      
      if (result.top_gainers) {
        setData(result);
        setError(null);
      } else {
        setError('No market data available');
      }
    } catch (err) {
      setError('Failed to fetch market data');
      console.error('Top movers fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return num < 1 ? `$${num.toFixed(3)}` : `$${num.toFixed(2)}`;
  };

  const formatVolume = (volume: string) => {
    const num = parseInt(volume);
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatChange = (change: string) => {
    const num = parseFloat(change);
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  const StockRow = ({ stock, showVolume = false }: { stock: Stock; showVolume?: boolean }) => {
    const isPositive = parseFloat(stock.change_percentage) >= 0;
    
    return (
      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-3">
          <div className={`p-1 rounded ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
            {isPositive ? 
              <ArrowUp className="w-3 h-3 text-green-600" /> : 
              <ArrowDown className="w-3 h-3 text-red-600" />
            }
          </div>
          <div>
            <div className="font-medium text-sm text-gray-900">{stock.ticker}</div>
            <div className="text-xs text-gray-600">{formatPrice(stock.price)}</div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {formatChange(stock.change_percentage)}
          </div>
          {showVolume && (
            <div className="text-xs text-gray-500">
              Vol: {formatVolume(stock.volume)}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span>Top Movers</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-12 mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-16"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-100 rounded w-12"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span>Top Movers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">{error || 'Unable to load market data'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-gray-900">Top Movers</span>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-0">
            US Market
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gainers" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="gainers" className="text-xs flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              Gainers
            </TabsTrigger>
            <TabsTrigger value="losers" className="text-xs flex items-center">
              <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
              Losers
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs flex items-center">
              <Activity className="w-3 h-3 mr-1 text-blue-500" />
              Active
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="gainers" className="mt-4 space-y-1 max-h-80 overflow-y-auto">
            {data.top_gainers.slice(0, 8).map((stock, index) => (
              <StockRow key={index} stock={stock} />
            ))}
          </TabsContent>
          
          <TabsContent value="losers" className="mt-4 space-y-1 max-h-80 overflow-y-auto">
            {data.top_losers.slice(0, 8).map((stock, index) => (
              <StockRow key={index} stock={stock} />
            ))}
          </TabsContent>
          
          <TabsContent value="active" className="mt-4 space-y-1 max-h-80 overflow-y-auto">
            {data.most_actively_traded.slice(0, 8).map((stock, index) => (
              <StockRow key={index} stock={stock} showVolume={true} />
            ))}
          </TabsContent>
        </Tabs>
        
        {data.last_updated && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Last updated: {new Date(data.last_updated).toLocaleTimeString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}