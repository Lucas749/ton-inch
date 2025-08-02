// VIX Index Source Code for Chainlink Functions
// Fetches current VIX volatility index value

const apiResponse = await Functions.makeHttpRequest({
  url: "https://api.cboe.com/data/historical/VIX/current",
  headers: {
    "User-Agent": "ChainlinkFunctions/1.0"
  }
});

if (apiResponse.error) {
  throw Error("Request failed");
}

const { data } = apiResponse;

// Extract VIX value and scale it (multiply by 100 to avoid decimals)
// Example: 21.50 becomes 2150
const vixValue = Math.round(data.current_price * 100);

// Return as encoded uint256
return Functions.encodeUint256(vixValue);