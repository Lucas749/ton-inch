import { NextRequest, NextResponse } from 'next/server';
import { ServerCSVCacheService } from '@/lib/server-csv-cache';

// Mark this route as dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

// Initialize the cache service
const cacheService = new ServerCSVCacheService();

// Validation function to check if AlphaVantage response is valid
function validateResponseData(data: any, functionName: string): void {
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid response: Expected object, got ${typeof data}`);
  }

  // Handle different API function types
  switch (functionName) {
    case 'GLOBAL_QUOTE':
      if (!data["Global Quote"] || typeof data["Global Quote"] !== 'object') {
        throw new Error('Invalid Global Quote response: Missing or invalid "Global Quote" object');
      }
      const quote = data["Global Quote"];
      const requiredFields = ["01. symbol", "05. price", "09. change", "10. change percent"];
      for (const field of requiredFields) {
        if (!quote[field] || quote[field] === "" || quote[field] === "N/A") {
          throw new Error(`Invalid Global Quote response: Missing or invalid field "${field}"`);
        }
      }
      break;

    case 'CURRENCY_EXCHANGE_RATE':
      if (!data["Realtime Currency Exchange Rate"] || typeof data["Realtime Currency Exchange Rate"] !== 'object') {
        throw new Error('Invalid Currency Exchange response: Missing or invalid "Realtime Currency Exchange Rate" object');
      }
      const exchangeRate = data["Realtime Currency Exchange Rate"];
      const requiredExchangeFields = ["5. Exchange Rate", "1. From_Currency Code", "3. To_Currency Code"];
      for (const field of requiredExchangeFields) {
        if (!exchangeRate[field] || exchangeRate[field] === "" || exchangeRate[field] === "N/A") {
          throw new Error(`Invalid Currency Exchange response: Missing or invalid field "${field}"`);
        }
      }
      break;

    case 'TOP_GAINERS_LOSERS':
      if (!data["top_gainers"] || !Array.isArray(data["top_gainers"]) || data["top_gainers"].length === 0) {
        throw new Error('Invalid Top Gainers/Losers response: Missing or empty "top_gainers" array');
      }
      const topGainer = data["top_gainers"][0];
      const requiredTopGainerFields = ["ticker", "price", "change_amount", "change_percentage"];
      for (const field of requiredTopGainerFields) {
        if (!topGainer[field] || topGainer[field] === "" || topGainer[field] === "N/A") {
          throw new Error(`Invalid Top Gainers response: Missing or invalid field "${field}" in top gainer`);
        }
      }
      break;

    case 'WTI':
    case 'BRENT':
    case 'NATURAL_GAS':
      if (!data["data"] || !Array.isArray(data["data"]) || data["data"].length === 0) {
        throw new Error(`Invalid ${functionName} response: Missing or empty "data" array`);
      }
      const commodityData = data["data"][0];
      const requiredCommodityFields = ["value", "date"];
      for (const field of requiredCommodityFields) {
        if (commodityData[field] === undefined || commodityData[field] === "" || commodityData[field] === "N/A") {
          throw new Error(`Invalid ${functionName} response: Missing or invalid field "${field}"`);
        }
      }
      break;

    case 'REAL_GDP':
    case 'INFLATION':
    case 'UNEMPLOYMENT':
    case 'FEDERAL_FUNDS_RATE':
      if (!data["data"] || !Array.isArray(data["data"]) || data["data"].length === 0) {
        throw new Error(`Invalid ${functionName} response: Missing or empty "data" array`);
      }
      const economicData = data["data"][0];
      const requiredEconomicFields = ["value", "date"];
      for (const field of requiredEconomicFields) {
        if (economicData[field] === undefined || economicData[field] === "" || economicData[field] === "N/A") {
          throw new Error(`Invalid ${functionName} response: Missing or invalid field "${field}"`);
        }
      }
      break;

          case 'TIME_SERIES_INTRADAY':
      case 'TIME_SERIES_DAILY':
      case 'TIME_SERIES_WEEKLY':
      case 'TIME_SERIES_MONTHLY':
        // For time series, just check that we have metadata and at least one data point
        if (!data["Meta Data"]) {
          throw new Error(`Invalid Time Series response: Missing "Meta Data"`);
        }
        const timeSeriesKeys = Object.keys(data).filter(key => key.includes('Time Series'));
        if (timeSeriesKeys.length === 0) {
          throw new Error('Invalid Time Series response: No time series data found');
        }
        const timeSeriesData = data[timeSeriesKeys[0]];
        if (!timeSeriesData || typeof timeSeriesData !== 'object' || Object.keys(timeSeriesData).length === 0) {
          throw new Error('Invalid Time Series response: Empty or invalid time series data');
        }
        break;

      case 'DIGITAL_CURRENCY_DAILY':
      case 'DIGITAL_CURRENCY_WEEKLY':
      case 'DIGITAL_CURRENCY_MONTHLY':
        // For crypto time series, check that we have metadata and crypto data
        if (!data["Meta Data"]) {
          throw new Error(`Invalid Crypto Time Series response: Missing "Meta Data"`);
        }
        const cryptoTimeSeriesKeys = Object.keys(data).filter(key => key.includes('Time Series (Digital Currency'));
        if (cryptoTimeSeriesKeys.length === 0) {
          throw new Error('Invalid Crypto Time Series response: No crypto time series data found');
        }
        const cryptoTimeSeriesData = data[cryptoTimeSeriesKeys[0]];
        if (!cryptoTimeSeriesData || typeof cryptoTimeSeriesData !== 'object' || Object.keys(cryptoTimeSeriesData).length === 0) {
          throw new Error('Invalid Crypto Time Series response: Empty or invalid crypto time series data');
        }
        break;

    default:
      // For unknown functions, just do basic validation
      if (Object.keys(data).length === 0) {
        throw new Error(`Invalid response for ${functionName}: Empty data object`);
      }
      break;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Extract all query parameters
  const function_ = searchParams.get('function');
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval');
  const outputsize = searchParams.get('outputsize');
  const datatype = searchParams.get('datatype');
  
  // Use server-side API key from environment
  const apikey = process.env.NEXT_ALPHAVANTAGE;
  
  if (!function_ || !apikey) {
    return NextResponse.json({ error: 'Missing required parameters or API key not configured' }, { status: 400 });
  }

  // Check if we should use cached data
  if (symbol && cacheService.shouldUseCache(symbol, function_, interval || undefined)) {
    const cachedData = cacheService.getCachedData(symbol, function_, interval || undefined);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache-Status': 'HIT',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
  }

  try {
    // Build the Alpha Vantage API URL
    const alphaVantageUrl = new URL('https://www.alphavantage.co/query');
    
    // Add all parameters to the Alpha Vantage request
    alphaVantageUrl.searchParams.set('function', function_);
    alphaVantageUrl.searchParams.set('apikey', apikey);
    
    if (symbol) alphaVantageUrl.searchParams.set('symbol', symbol);
    if (interval) alphaVantageUrl.searchParams.set('interval', interval);
    if (outputsize) alphaVantageUrl.searchParams.set('outputsize', outputsize);
    if (datatype) alphaVantageUrl.searchParams.set('datatype', datatype);

    console.log('🌐 Fetching fresh AlphaVantage data:', function_, symbol || '', interval || '');

    const response = await fetch(alphaVantageUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'c1nch/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Check for API error messages
    if (data["Error Message"]) {
      throw new Error(`Alpha Vantage API Error: ${data["Error Message"]}`);
    }
    
    if (data["Note"]) {
      throw new Error(`Alpha Vantage API Note: ${data["Note"]}`);
    }

    // Validate data structure
    validateResponseData(data, function_);

    // Cache the successful response
    if (symbol) {
      cacheService.cacheData(symbol, function_, interval || undefined, data);
    }
    
    return NextResponse.json(data, {
      headers: {
        'X-Cache-Status': 'MISS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Alpha Vantage API proxy error:', error);
    
    // Mark failed request for retry logic
    if (symbol) {
      cacheService.markFailedRequest(symbol, function_, interval || undefined);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch from Alpha Vantage API', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}