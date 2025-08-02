import { Navbar } from "@/components/navbar";
import { AlphaVantageExplorer } from "@/components/AlphaVantageExplorer";

export default function AlphaVantagePage() {
  const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE_API_KEY || "123";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <AlphaVantageExplorer apiKey={apiKey} />

        {/* Setup Instructions */}
        {apiKey === "123" && (
          <div className="mt-8 max-w-4xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">
                🔑 Setup Your Alpha Vantage API Key
              </h3>
              <div className="space-y-4 text-sm text-yellow-700">
                <p>
                  You are currently using the demo API key with limited
                  functionality. To unlock full access to real-time and
                  historical data:
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li>
                    Get your free API key at{" "}
                    <a
                      href="https://www.alphavantage.co/support/#api-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Alpha Vantage
                    </a>
                  </li>
                  <li>
                    Create a{" "}
                    <code className="bg-yellow-100 px-1 rounded">
                      .env.local
                    </code>{" "}
                    file in the front-end directory
                  </li>
                  <li>Add your API key to the environment file:</li>
                </ol>
                <div className="bg-yellow-100 rounded p-3 font-mono text-sm text-yellow-800">
                  <div>NEXT_PUBLIC_ALPHAVANTAGE_API_KEY=your_api_key_here</div>
                </div>
                <p>
                  <strong>Note:</strong> The demo API key provides cached data
                  and has rate limits. A personal API key gives you access to
                  real-time data and higher rate limits.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Features Overview */}
        <div className="mt-8 max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              📈 Alpha Vantage Data Explorer Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-600">Core Stock APIs</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    • Intraday time series (1min, 5min, 15min, 30min, 60min)
                  </li>
                  <li>• Daily, weekly, monthly historical data</li>
                  <li>• Real-time quotes and symbol search</li>
                  <li>• Adjusted and split-adjusted data</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-green-600">
                  Technical Indicators
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Moving Averages (SMA, EMA, WMA)</li>
                  <li>• Momentum indicators (RSI, MACD, Stochastic)</li>
                  <li>• Volatility bands (Bollinger Bands)</li>
                  <li>• Trend indicators (ADX, Aroon)</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-purple-600">
                  Fundamental Data
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Company overview and profile</li>
                  <li>• Financial statements (Income, Balance, Cash Flow)</li>
                  <li>• Earnings history and estimates</li>
                  <li>• Key financial ratios and metrics</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-orange-600">Forex Markets</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Real-time exchange rates</li>
                  <li>• Historical forex time series</li>
                  <li>• Major and minor currency pairs</li>
                  <li>• Intraday and daily intervals</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-600">
                  Cryptocurrencies
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Digital currency exchange rates</li>
                  <li>• Historical crypto time series</li>
                  <li>• Market cap and volume data</li>
                  <li>• Daily, weekly, monthly intervals</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">News & Sentiment</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Market news with sentiment analysis</li>
                  <li>• Ticker-specific news filtering</li>
                  <li>• Bullish/Bearish sentiment scores</li>
                  <li>• Article summaries and sources</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-6 max-w-4xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              💡 Usage Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <h4 className="font-semibold mb-2">Getting Started:</h4>
                <ul className="space-y-1">
                  <li>• Start with popular symbols like AAPL, MSFT, GOOGL</li>
                  <li>• Try different time intervals for various analysis</li>
                  <li>• Use symbol search to find specific companies</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Advanced Features:</h4>
                <ul className="space-y-1">
                  <li>• Combine technical indicators for analysis</li>
                  <li>• Check news sentiment before trading decisions</li>
                  <li>• Use forex data for currency analysis</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
