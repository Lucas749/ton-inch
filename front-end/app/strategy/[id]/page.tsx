'use client';

import { useParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Zap, Target, Clock, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data for the chart
const priceData = [
  { time: '00:00', price: 2850, sentiment: 45 },
  { time: '04:00', price: 2867, sentiment: 52 },
  { time: '08:00', price: 2834, sentiment: 41 },
  { time: '12:00', price: 2891, sentiment: 67 },
  { time: '16:00', price: 2876, sentiment: 59 },
  { time: '20:00', price: 2903, sentiment: 72 },
  { time: '24:00', price: 2919, sentiment: 78 },
];

export default function StrategyDetail() {
  const params = useParams();
  const strategyId = params.id;

  // Mock strategy data
  const strategy = {
    id: strategyId,
    name: 'ETH Whale Watch',
    tokenPair: 'ETH/USDC',
    trigger: 'Large Transfer',
    status: 'active',
    totalValue: '$50,000',
    currentPrice: '$2,919',
    targetPrice: '$3,100',
    orders: 3,
    filled: 1,
    pnl: '+$2,340',
    icon: '🐋',
    description: 'Automatically execute limit orders when large ETH transfers (>10k ETH) are detected from major exchanges.',
    createdAt: '2024-01-15',
    lastTriggered: '2 hours ago'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{strategy.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{strategy.name}</h1>
              <p className="text-gray-600">{strategy.tokenPair}</p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-800 ml-auto">
            {strategy.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Price & Sentiment (24h)</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-gray-900">{strategy.currentPrice}</span>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sentiment" 
                        stroke="#34d399" 
                        strokeWidth={2}
                        dot={{ fill: '#34d399', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Strategy Description */}
            <Card>
              <CardHeader>
                <CardTitle>Strategy Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{strategy.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 block">Created</span>
                    <span className="font-semibold">{strategy.createdAt}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Last Triggered</span>
                    <span className="font-semibold">{strategy.lastTriggered}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Strategy Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strategy Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Total Value</span>
                  </div>
                  <span className="font-semibold">{strategy.totalValue}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">P&L</span>
                  </div>
                  <span className="font-semibold text-green-600">{strategy.pnl}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Target Price</span>
                  </div>
                  <span className="font-semibold">{strategy.targetPrice}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Orders</span>
                  </div>
                  <span className="font-semibold">{strategy.filled}/{strategy.orders}</span>
                </div>
              </CardContent>
            </Card>

            {/* Trigger Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trigger Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{strategy.trigger}</span>
                </div>
                <p className="text-sm text-gray-600">
                  Monitors whale wallets and exchange outflows for transfers exceeding 10,000 ETH.
                </p>
                <div className="pt-3 border-t border-gray-100">
                  <Button variant="outline" size="sm" className="w-full">
                    Edit Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full gradient-primary text-white">
                  Add Funds
                </Button>
                <Button variant="outline" className="w-full">
                  Pause Strategy
                </Button>
                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                  Cancel All Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}