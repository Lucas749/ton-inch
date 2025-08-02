import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHAVANTAGE;

// Cache for API responses (5 minute TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchAlphaVantageData(functionName: string, params: Record<string, string> = {}) {
  const cacheKey = `${functionName}_${JSON.stringify(params)}`;
  
  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', functionName);
  url.searchParams.set('apikey', ALPHA_VANTAGE_API_KEY || 'demo');
  
  // Add additional parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    // Cache the response
    setCachedData(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error('Alpha Vantage API error:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint');

  try {
    switch (endpoint) {
      case 'news_sentiment': {
        const tickers = searchParams.get('tickers') || '';
        const topics = searchParams.get('topics') || 'technology,financial_markets';
        const limit = searchParams.get('limit') || '20';
        
        const data = await fetchAlphaVantageData('NEWS_SENTIMENT', {
          tickers,
          topics,
          limit,
          sort: 'LATEST'
        });
        
        return NextResponse.json(data);
      }

      case 'top_gainers_losers': {
        const data = await fetchAlphaVantageData('TOP_GAINERS_LOSERS');
        return NextResponse.json(data);
      }

      case 'market_status': {
        const data = await fetchAlphaVantageData('MARKET_STATUS');
        return NextResponse.json(data);
      }

      case 'insider_transactions': {
        const symbol = searchParams.get('symbol') || 'AAPL';
        const data = await fetchAlphaVantageData('INSIDER_TRANSACTIONS', { symbol });
        return NextResponse.json(data);
      }

      case 'global_quote': {
        const symbol = searchParams.get('symbol') || 'SPY';
        const data = await fetchAlphaVantageData('GLOBAL_QUOTE', { symbol });
        return NextResponse.json(data);
      }

      case 'rsi': {
        const symbol = searchParams.get('symbol') || 'SPY';
        const interval = searchParams.get('interval') || 'daily';
        const time_period = searchParams.get('time_period') || '14';
        
        const data = await fetchAlphaVantageData('RSI', {
          symbol,
          interval,
          time_period,
          series_type: 'close'
        });
        
        return NextResponse.json(data);
      }

      case 'sma': {
        const symbol = searchParams.get('symbol') || 'SPY';
        const interval = searchParams.get('interval') || 'daily';
        const time_period = searchParams.get('time_period') || '20';
        
        const data = await fetchAlphaVantageData('SMA', {
          symbol,
          interval,
          time_period,
          series_type: 'close'
        });
        
        return NextResponse.json(data);
      }

      case 'intraday': {
        const symbol = searchParams.get('symbol') || 'SPY';
        const interval = searchParams.get('interval') || '5min';
        
        const data = await fetchAlphaVantageData('TIME_SERIES_INTRADAY', {
          symbol,
          interval,
          outputsize: 'compact'
        });
        
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Alpha Vantage' },
      { status: 500 }
    );
  }
}