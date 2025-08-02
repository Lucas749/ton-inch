// BTC Price Source Code for Chainlink Functions  
// Fetches current Bitcoin price from CoinGecko API

const apiResponse = await Functions.makeHttpRequest({
  url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
  headers: {
    "Accept": "application/json"
  }
});

if (apiResponse.error) {
  throw Error("Request failed");
}

const { data } = apiResponse;

// Extract BTC price and scale it (multiply by 100 to avoid decimals)
// Example: $43,256.78 becomes 4325678
const btcPrice = Math.round(data.bitcoin.usd * 100);

// Return as encoded uint256
return Functions.encodeUint256(btcPrice);