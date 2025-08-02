"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IndicesExplorer } from '@/components/IndicesExplorer';
import { TrendingUp, BarChart3, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">c1nch</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Create custom indices and set up conditional trading orders that execute automatically when your conditions are met.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              onClick={() => router.push('/dashboard')}
              size="lg"
              className="px-8 py-3"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              onClick={() => router.push('/alpha-vantage')}
              variant="outline"
              size="lg"
              className="px-8 py-3"
            >
              Explore Market Data
            </Button>
          </div>
        </div>

        {/* Quick Available Indices Preview */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Contract Indices</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              These indices are live on the blockchain with oracle data. Start trading with them immediately.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">🍎</div>
                <h3 className="font-semibold mb-1">Apple Stock</h3>
                <p className="text-sm text-gray-600 mb-3">Real-time AAPL price data</p>
                <Button 
                  size="sm" 
                  onClick={() => router.push('/create-index?indexId=0')}
                  className="w-full"
                >
                  Add to Portfolio
                </Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">🚗</div>
                <h3 className="font-semibold mb-1">Tesla Stock</h3>
                <p className="text-sm text-gray-600 mb-3">Real-time TSLA price data</p>
                <Button 
                  size="sm" 
                  onClick={() => router.push('/create-index?indexId=1')}
                  className="w-full"
                >
                  Add to Portfolio
                </Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">📈</div>
                <h3 className="font-semibold mb-1">VIX Index</h3>
                <p className="text-sm text-gray-600 mb-3">Market volatility indicator</p>
                <Button 
                  size="sm" 
                  onClick={() => router.push('/create-index?indexId=2')}
                  className="w-full"
                >
                  Add to Portfolio
                </Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">₿</div>
                <h3 className="font-semibold mb-1">Bitcoin</h3>
                <p className="text-sm text-gray-600 mb-3">Real-time BTC price data</p>
                <Button 
                  size="sm" 
                  onClick={() => router.push('/create-index?indexId=3')}
                  className="w-full"
                >
                  Add to Portfolio
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Full Indices Explorer */}
        <IndicesExplorer />

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-24">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Custom Indices</h3>
              <p className="text-gray-600 text-sm">
                Create and track custom data indices with real-time updates from various sources.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Conditional Orders</h3>
              <p className="text-gray-600 text-sm">
                Set up trading orders that execute automatically when your index conditions are met.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Automated Trading</h3>
              <p className="text-gray-600 text-sm">
                Let your strategies run automatically while you focus on research and analysis.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}