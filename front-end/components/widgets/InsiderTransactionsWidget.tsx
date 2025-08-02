'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ShoppingCart, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface InsiderTransaction {
  symbol: string;
  company_name: string;
  insider_name: string;
  title: string;
  transaction_type: string;
  transaction_date: string;
  transaction_amount: string;
  price: string;
  shares: string;
}

interface InsiderData {
  symbol: string;
  data: InsiderTransaction[];
}

export default function InsiderTransactionsWidget() {
  const [data, setData] = useState<InsiderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');

  const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META'];

  useEffect(() => {
    fetchData(selectedSymbol);
  }, [selectedSymbol]);

  const fetchData = async (symbol: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/alphavantage?endpoint=insider_transactions&symbol=${symbol}`);
      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        setData({
          symbol,
          data: result.data
        });
        setError(null);
      } else {
        setError('No insider transaction data available');
      }
    } catch (err) {
      setError('Failed to fetch insider data');
      console.error('Insider transactions fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('purchase') || typeLower.includes('buy')) {
      return <ShoppingCart className="w-3 h-3 text-green-600" />;
    }
    if (typeLower.includes('sale') || typeLower.includes('sell')) {
      return <Wallet className="w-3 h-3 text-red-600" />;
    }
    return <TrendingUp className="w-3 h-3 text-gray-600" />;
  };

  const getTransactionColor = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('purchase') || typeLower.includes('buy')) {
      return 'text-green-600 bg-green-50';
    }
    if (typeLower.includes('sale') || typeLower.includes('sell')) {
      return 'text-red-600 bg-red-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return 'N/A';
    
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatShares = (shares: string) => {
    const num = parseInt(shares);
    if (isNaN(num)) return 'N/A';
    
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Insider Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-100 rounded w-32"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-12"></div>
                </div>
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
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Insider Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">{error || 'Unable to load insider data'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-900">Insider Activity</span>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {popularSymbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {data.data.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No recent insider transactions</p>
            <p className="text-xs text-gray-400 mt-1">Try selecting a different symbol</p>
          </div>
        ) : (
          data.data.slice(0, 8).map((transaction, index) => (
            <div 
              key={index}
              className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-start space-x-3">
                  <div className={`p-1 rounded ${getTransactionColor(transaction.transaction_type).includes('green') ? 'bg-green-100' : 
                    getTransactionColor(transaction.transaction_type).includes('red') ? 'bg-red-100' : 'bg-gray-100'}`}>
                    {getTransactionIcon(transaction.transaction_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {transaction.insider_name}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {transaction.title}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs px-2 py-0 ${getTransactionColor(transaction.transaction_type)}`}
                      >
                        {transaction.transaction_type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatDate(transaction.transaction_date)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right ml-2">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(transaction.transaction_amount)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatShares(transaction.shares)} shares
                  </div>
                  <div className="text-xs text-gray-500">
                    @ ${parseFloat(transaction.price).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing recent transactions for {selectedSymbol}
            </p>
            <Badge variant="outline" className="text-xs px-2 py-0">
              {data.data.length} total
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}