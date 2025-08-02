'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Newspaper, TrendingUp, TrendingDown, Clock, ExternalLink } from 'lucide-react';

interface NewsArticle {
  title: string;
  url: string;
  time_published: string;
  authors: string[];
  summary: string;
  overall_sentiment_score: number;
  overall_sentiment_label: 'Bullish' | 'Bearish' | 'Neutral' | 'Somewhat-Bullish' | 'Somewhat-Bearish';
  ticker_sentiment: Array<{
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
  }>;
}

interface NewsData {
  feed: NewsArticle[];
  sentiment_score_definition: string;
}

export default function MarketNewsWidget() {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
    // Refresh every 10 minutes
    const interval = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/alphavantage?endpoint=news_sentiment&topics=technology,financial_markets&limit=8');
      const data = await response.json();
      
      if (data.feed) {
        setNewsData(data);
        setError(null);
      } else {
        setError('No news data available');
      }
    } catch (err) {
      setError('Failed to fetch news');
      console.error('News fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string, score: number) => {
    if (sentiment.includes('Bullish')) {
      return score > 0.3 ? 'text-green-600 bg-green-50' : 'text-green-500 bg-green-50';
    } else if (sentiment.includes('Bearish')) {
      return score < -0.3 ? 'text-red-600 bg-red-50' : 'text-red-500 bg-red-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment.includes('Bullish')) return <TrendingUp className="w-3 h-3" />;
    if (sentiment.includes('Bearish')) return <TrendingDown className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const formatTimeAgo = (timeString: string) => {
    try {
      // Parse YYYYMMDDTHHMMSS format
      const year = parseInt(timeString.substring(0, 4));
      const month = parseInt(timeString.substring(4, 6)) - 1;
      const day = parseInt(timeString.substring(6, 8));
      const hour = parseInt(timeString.substring(9, 11));
      const minute = parseInt(timeString.substring(11, 13));
      
      const articleTime = new Date(year, month, day, hour, minute);
      const now = new Date();
      const diffMs = now.getTime() - articleTime.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffHours >= 24) {
        return `${Math.floor(diffHours / 24)}d ago`;
      } else if (diffHours >= 1) {
        return `${diffHours}h ago`;
      } else {
        return `${Math.max(1, diffMins)}m ago`;
      }
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
            <Newspaper className="w-4 h-4 text-blue-500" />
            <span>Market News</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !newsData) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
            <Newspaper className="w-4 h-4 text-blue-500" />
            <span>Market News</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">{error || 'Unable to load news'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Newspaper className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-gray-900">Market News</span>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-0">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {newsData.feed.slice(0, 6).map((article, index) => (
          <div 
            key={index} 
            className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
            onClick={() => window.open(article.url, '_blank')}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2 flex-1">
                {article.title}
              </h4>
              <ExternalLink className="w-3 h-3 text-gray-400 ml-2 flex-shrink-0" />
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-2 py-0 ${getSentimentColor(article.overall_sentiment_label, article.overall_sentiment_score)}`}
                >
                  <span className="flex items-center space-x-1">
                    {getSentimentIcon(article.overall_sentiment_label)}
                    <span>
                      {article.overall_sentiment_label.replace('-', ' ')}
                    </span>
                  </span>
                </Badge>
                
                {article.ticker_sentiment.length > 0 && (
                  <div className="flex space-x-1">
                    {article.ticker_sentiment.slice(0, 2).map((ticker, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs px-2 py-0">
                        {ticker.ticker}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <span className="text-xs text-gray-500">
                {formatTimeAgo(article.time_published)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}