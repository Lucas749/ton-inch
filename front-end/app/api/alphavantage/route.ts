import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const functionType = searchParams.get('function');
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market') || 'USD';
    const interval = searchParams.get('interval') || '1min';
    const outputsize = searchParams.get('outputsize') || 'compact';
    const datatype = searchParams.get('datatype') || 'json';
    
    // Get API key from environment
    const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE || process.env.ALPHAVANTAGE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Alpha Vantage API key not configured' },
        { status: 500 }
      );
    }

    if (!functionType) {
      return NextResponse.json(
        { error: 'Missing required parameter: function' },
        { status: 400 }
      );
    }

    // Build Alpha Vantage API URL
    const alphaVantageUrl = new URL('https://www.alphavantage.co/query');
    alphaVantageUrl.searchParams.set('function', functionType);
    alphaVantageUrl.searchParams.set('apikey', apiKey);
    
    // Add parameters based on function type
    if (symbol) {
      alphaVantageUrl.searchParams.set('symbol', symbol);
    }
    
    if (market && (functionType === 'DIGITAL_CURRENCY_DAILY' || functionType === 'DIGITAL_CURRENCY_WEEKLY' || functionType === 'DIGITAL_CURRENCY_MONTHLY')) {
      alphaVantageUrl.searchParams.set('market', market);
    }
    
    if (interval && functionType === 'TIME_SERIES_INTRADAY') {
      alphaVantageUrl.searchParams.set('interval', interval);
    }
    
    if (outputsize && (functionType.includes('TIME_SERIES') || functionType.includes('DAILY') || functionType.includes('WEEKLY') || functionType.includes('MONTHLY'))) {
      alphaVantageUrl.searchParams.set('outputsize', outputsize);
    }
    
    if (datatype) {
      alphaVantageUrl.searchParams.set('datatype', datatype);
    }

    // Handle FX functions
    if (functionType.startsWith('FX_')) {
      const fromSymbol = searchParams.get('from_symbol');
      const toSymbol = searchParams.get('to_symbol');
      if (fromSymbol) alphaVantageUrl.searchParams.set('from_symbol', fromSymbol);
      if (toSymbol) alphaVantageUrl.searchParams.set('to_symbol', toSymbol);
    }

    // Handle technical indicators
    if (functionType === 'SMA' || functionType === 'EMA' || functionType === 'RSI' || functionType === 'MACD') {
      const timePeriod = searchParams.get('time_period');
      const seriesType = searchParams.get('series_type');
      if (timePeriod) alphaVantageUrl.searchParams.set('time_period', timePeriod);
      if (seriesType) alphaVantageUrl.searchParams.set('series_type', seriesType);
    }

    console.log(`📡 Alpha Vantage API call: ${alphaVantageUrl.toString()}`);

    // Make request to Alpha Vantage
    const response = await fetch(alphaVantageUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AlphaVantageProxy/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Alpha Vantage API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Check for Alpha Vantage API errors
    if (data['Error Message']) {
      return NextResponse.json(
        { error: data['Error Message'] },
        { status: 400 }
      );
    }

    if (data['Information']) {
      return NextResponse.json(
        { error: 'API call frequency limit reached. Please try again later.' },
        { status: 429 }
      );
    }

    // Return the data
    return NextResponse.json(data);

  } catch (error) {
    console.error('Alpha Vantage API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE || process.env.ALPHAVANTAGE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Alpha Vantage API key not configured' },
        { status: 500 }
      );
    }

    // Handle different action types
    switch (action) {
      case 'NEWS_SENTIMENT':
        const newsUrl = new URL('https://www.alphavantage.co/query');
        newsUrl.searchParams.set('function', 'NEWS_SENTIMENT');
        newsUrl.searchParams.set('apikey', apiKey);
        if (params.topics) newsUrl.searchParams.set('topics', params.topics);
        if (params.time_from) newsUrl.searchParams.set('time_from', params.time_from);
        if (params.time_to) newsUrl.searchParams.set('time_to', params.time_to);
        if (params.limit) newsUrl.searchParams.set('limit', params.limit.toString());

        const newsResponse = await fetch(newsUrl.toString());
        const newsData = await newsResponse.json();
        return NextResponse.json(newsData);

      case 'TOP_GAINERS_LOSERS':
        const topUrl = new URL('https://www.alphavantage.co/query');
        topUrl.searchParams.set('function', 'TOP_GAINERS_LOSERS');
        topUrl.searchParams.set('apikey', apiKey);

        const topResponse = await fetch(topUrl.toString());
        const topData = await topResponse.json();
        return NextResponse.json(topData);

      case 'MARKET_STATUS':
        const statusUrl = new URL('https://www.alphavantage.co/query');
        statusUrl.searchParams.set('function', 'MARKET_STATUS');
        statusUrl.searchParams.set('apikey', apiKey);

        const statusResponse = await fetch(statusUrl.toString());
        const statusData = await statusResponse.json();
        return NextResponse.json(statusData);

      case 'INSIDER_TRANSACTIONS':
        const insiderUrl = new URL('https://www.alphavantage.co/query');
        insiderUrl.searchParams.set('function', 'INSIDER_TRANSACTIONS');
        insiderUrl.searchParams.set('apikey', apiKey);
        if (params.symbol) insiderUrl.searchParams.set('symbol', params.symbol);

        const insiderResponse = await fetch(insiderUrl.toString());
        const insiderData = await insiderResponse.json();
        return NextResponse.json(insiderData);

      case 'TIME_SERIES':
        const tsUrl = new URL('https://www.alphavantage.co/query');
        tsUrl.searchParams.set('function', params.function || 'TIME_SERIES_DAILY');
        tsUrl.searchParams.set('apikey', apiKey);
        if (params.symbol) tsUrl.searchParams.set('symbol', params.symbol);
        if (params.interval) tsUrl.searchParams.set('interval', params.interval);
        if (params.outputsize) tsUrl.searchParams.set('outputsize', params.outputsize);

        const tsResponse = await fetch(tsUrl.toString());
        const tsData = await tsResponse.json();
        return NextResponse.json(tsData);

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Alpha Vantage API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}