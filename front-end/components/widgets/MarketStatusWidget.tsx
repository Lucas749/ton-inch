'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Market {
  market_type: string;
  region: string;
  primary_exchanges: string;
  local_open: string;
  local_close: string;
  current_status: 'open' | 'closed';
  notes: string;
}

interface MarketStatusData {
  endpoint: string;
  markets: Market[];
}

export default function MarketStatusWidget() {
  const [data, setData] = useState<MarketStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/alphavantage?endpoint=market_status');
      const result = await response.json();
      
      if (result.markets) {
        setData(result);
        setError(null);
      } else {
        setError('No market status data available');
      }
    } catch (err) {
      setError('Failed to fetch market status');
      console.error('Market status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMarketIcon = (region: string) => {
    const regionLower = region.toLowerCase();
    if (regionLower.includes('united states')) return '🇺🇸';
    if (regionLower.includes('europe')) return '🇪🇺';
    if (regionLower.includes('united kingdom')) return '🇬🇧';
    if (regionLower.includes('japan')) return '🇯🇵';
    if (regionLower.includes('china')) return '🇨🇳';
    if (regionLower.includes('india')) return '🇮🇳';
    if (regionLower.includes('australia')) return '🇦🇺';
    if (regionLower.includes('canada')) return '🇨🇦';
    if (regionLower.includes('brazil')) return '🇧🇷';
    return '🌍';
  };

  const getPriorityMarkets = (markets: Market[]) => {
    const priority = ['United States', 'Europe', 'United Kingdom', 'Japan', 'China', 'India'];
    const priorityMarkets: Market[] = [];
    const otherMarkets: Market[] = [];

    markets.forEach(market => {
      const foundPriority = priority.find(p => market.region.includes(p));
      if (foundPriority) {
        priorityMarkets.push(market);
      } else {
        otherMarkets.push(market);
      }
    });

    // Sort priority markets by the priority order
    priorityMarkets.sort((a, b) => {
      const aIndex = priority.findIndex(p => a.region.includes(p));
      const bIndex = priority.findIndex(p => b.region.includes(p));
      return aIndex - bIndex;
    });

    return [...priorityMarkets, ...otherMarkets];
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Market Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-32"></div>
                </div>
              </div>
              <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
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
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Market Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">{error || 'Unable to load market status'}</p>
        </CardContent>
      </Card>
    );
  }

  const sortedMarkets = getPriorityMarkets(data.markets);
  const openMarkets = sortedMarkets.filter(m => m.current_status === 'open').length;
  const totalMarkets = sortedMarkets.length;

  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-gray-900">Market Status</span>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-0">
            {openMarkets}/{totalMarkets} Open
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-96 overflow-y-auto">
        {sortedMarkets.slice(0, 10).map((market, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getMarketIcon(market.region)}</span>
              <div>
                <div className="font-medium text-sm text-gray-900">
                  {market.region}
                </div>
                <div className="text-xs text-gray-600">
                  {market.market_type} • {market.local_open} - {market.local_close}
                </div>
                {market.primary_exchanges && (
                  <div className="text-xs text-gray-500 mt-1">
                    {market.primary_exchanges.split(', ').slice(0, 2).join(', ')}
                    {market.primary_exchanges.split(', ').length > 2 && '...'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge 
                variant={market.current_status === 'open' ? 'default' : 'secondary'}
                className={`text-xs px-3 py-1 ${
                  market.current_status === 'open' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center space-x-1">
                  {market.current_status === 'open' ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  <span className="capitalize">{market.current_status}</span>
                </span>
              </Badge>
            </div>
          </div>
        ))}
        
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Updated every 5 minutes • {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}