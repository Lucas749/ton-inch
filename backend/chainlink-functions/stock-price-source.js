// Stock Price Source Code for Chainlink Functions
// Fetches stock price for a given symbol (passed as argument)
// Usage: args[0] should be the stock symbol (e.g., "AAPL", "TSLA")

const symbol = args[0];
if (!symbol) {
  throw Error("Stock symbol is required as first argument");
}

const apiResponse = await Functions.makeHttpRequest({
  url: `https://api.polygon.io/v2/last/trade/${symbol}?apikey=YOUR_POLYGON_API_KEY`,
  headers: {
    "Authorization": "Bearer YOUR_API_KEY"
  }
});

if (apiResponse.error) {
  throw Error("Request failed");
}

const { data } = apiResponse;

// Extract stock price and scale it (multiply by 100 to avoid decimals)
// Example: $248.50 becomes 24850
const stockPrice = Math.round(data.results.p * 100);

// Return as encoded uint256
return Functions.encodeUint256(stockPrice);