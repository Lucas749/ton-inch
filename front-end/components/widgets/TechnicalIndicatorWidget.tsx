'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, BarChart3, TrendingUp, Zap } from 'lucide-react';
import { Sparkline } from '@/components/Sparkline';

interface TechnicalData {
  symbol: string;
  indicator: string;
  data: Array<{
    date: string;
    value: number;
  }>;
  lastValue: number;
  lastDate: string;
}

export default function TechnicalIndicatorWidget() {
  const [rsiData, setRsiData] = useState<TechnicalData | null>(null);
  const [smaData, setSmaData] = useState<TechnicalData | null>(null);
  const [priceData, setPriceData] = useState<TechnicalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
    // Refresh every 30 minutes
    const interval = setInterval(fetchAllData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch RSI, SMA, and price data for SPY
      const [rsiResponse, smaResponse, priceResponse] = await Promise.all([
        fetch('/api/alphavantage?endpoint=rsi&symbol=SPY&interval=daily&time_period=14'),
        fetch('/api/alphavantage?endpoint=sma&symbol=SPY&interval=daily&time_period=20'),
        fetch('/api/alphavantage?endpoint=intraday&symbol=SPY&interval=5min')
      ]);

      const [rsiResult, smaResult, priceResult] = await Promise.all([
        rsiResponse.json(),
        smaResponse.json(),
        priceResponse.json()
      ]);

      // Process RSI data
      if (rsiResult['Technical Analysis: RSI']) {
        const rsiEntries = Object.entries(rsiResult['Technical Analysis: RSI']);
        const rsiProcessed = rsiEntries.slice(0, 30).reverse().map(([date, values]: [string, any]) => ({
          date,
          value: parseFloat(values.RSI)
        }));
        
        setRsiData({
          symbol: 'SPY',
          indicator: 'RSI',
          data: rsiProcessed,
          lastValue: rsiProcessed[rsiProcessed.length - 1]?.value || 0,
          lastDate: rsiProcessed[rsiProcessed.length - 1]?.date || ''
        });
      }

      // Process SMA data
      if (smaResult['Technical Analysis: SMA']) {
        const smaEntries = Object.entries(smaResult['Technical Analysis: SMA']);
        const smaProcessed = smaEntries.slice(0, 30).reverse().map(([date, values]: [string, any]) => ({
          date,
          value: parseFloat(values.SMA)
        }));
        
        setSmaData({
          symbol: 'SPY',
          indicator: 'SMA(20)',
          data: smaProcessed,
          lastValue: smaProcessed[smaProcessed.length - 1]?.value || 0,
          lastDate: smaProcessed[smaProcessed.length - 1]?.date || ''
        });
      }

      // Process price data
      if (priceResult['Time Series (5min)']) {
        const priceEntries = Object.entries(priceResult['Time Series (5min)']);
        const priceProcessed = priceEntries.slice(0, 50).reverse().map(([date, values]: [string, any]) => ({
          date,
          value: parseFloat(values['4. close'])
        }));
        
        setPriceData({
          symbol: 'SPY',
          indicator: 'Price',
          data: priceProcessed,
          lastValue: priceProcessed[priceProcessed.length - 1]?.value || 0,
          lastDate: priceProcessed[priceProcessed.length - 1]?.date || ''
        });
      }

      setError(null);
    } catch (err) {
      setError('Failed to fetch technical data');
      console.error('Technical data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRSISignal = (value: number) => {
    if (value > 70) return { label: 'Overbought', color: 'text-red-600 bg-red-50' };
    if (value < 30) return { label: 'Oversold', color: 'text-green-600 bg-green-50' };
    return { label: 'Neutral', color: 'text-gray-600 bg-gray-50' };
  };

  const getTrendSignal = (data: Array<{date: string; value: number}>) => {
    if (data.length < 5) return { label: 'Neutral', color: 'text-gray-600 bg-gray-50' };
    
    const recent = data.slice(-5);
    const trend = recent[recent.length - 1].value - recent[0].value;
    
    if (trend > 0) return { label: 'Bullish', color: 'text-green-600 bg-green-50' };
    if (trend < 0) return { label: 'Bearish', color: 'text-red-600 bg-red-50' };
    return { label: 'Neutral', color: 'text-gray-600 bg-gray-50' };
  };

  const IndicatorCard = ({ 
    data, 
    icon: Icon, 
    iconColor, 
    title 
  }: { 
    data: TechnicalData | null; 
    icon: any; 
    iconColor: string; 
    title: string;
  }) => {
    if (!data) {
      return (
        <div className="p-4 border border-gray-100 rounded-lg">
          <div className="animate-pulse">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-20"></div>
          </div>
        </div>
      );
    }

    const signal = data.indicator === 'RSI' ? 
      getRSISignal(data.lastValue) : 
      getTrendSignal(data.data);

    return (
      <div className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 hover:bg-gray-50 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <span className="text-sm font-medium text-gray-900">{title}</span>
          </div>
          <Badge variant="secondary" className={`text-xs px-2 py-0 ${signal.color}`}>
            {signal.label}
          </Badge>
        </div>
        
        <div className="mb-3">
          <Sparkline 
            data={data.data.map(d => d.value)} 
            width={200} 
            height={40}
            color={signal.label === 'Bullish' ? '#16a34a' : signal.label === 'Bearish' ? '#dc2626' : '#6b7280'}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {data.indicator === 'RSI' ? 
                data.lastValue.toFixed(1) : 
                data.indicator === 'Price' ?
                `$${data.lastValue.toFixed(2)}` :
                `$${data.lastValue.toFixed(2)}`
              }
            </div>
            <div className="text-xs text-gray-500">
              {data.indicator}
            </div>
          </div>
          <div className="text-xs text-gray-500 text-right">
            Latest: {new Date(data.lastDate).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span>Technical Indicators</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <IndicatorCard 
              data={null} 
              icon={Zap} 
              iconColor="text-orange-500" 
              title="RSI (14)"
            />
            <IndicatorCard 
              data={null} 
              icon={TrendingUp} 
              iconColor="text-blue-500" 
              title="SMA (20)"
            />
            <IndicatorCard
              data={null}
              icon={LineChart}
              iconColor="text-green-500"
              title="Price Action"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span>Technical Indicators</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-gray-900">Technical Indicators</span>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-0">
            SPY
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <IndicatorCard 
            data={rsiData} 
            icon={Zap} 
            iconColor="text-orange-500" 
            title="RSI (14)"
          />
          <IndicatorCard 
            data={smaData} 
            icon={TrendingUp} 
            iconColor="text-blue-500" 
            title="SMA (20)"
          />
          <IndicatorCard 
            data={priceData} 
            icon={LineChart} 
            iconColor="text-green-500" 
            title="Price Action"
          />
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Technical analysis for educational purposes only
          </p>
        </div>
      </CardContent>
    </Card>
  );
}