// Inflation Rate Source Code for Chainlink Functions
// Fetches current US inflation rate from Bureau of Labor Statistics

const apiResponse = await Functions.makeHttpRequest({
  url: "https://api.bls.gov/publicAPI/v2/timeseries/CUUR0000SA0?latest=true",
  headers: {
    "Content-Type": "application/json"
  }
});

if (apiResponse.error) {
  throw Error("Request failed");
}

const { data } = apiResponse;

// Extract inflation rate from BLS response
// The API returns percentage values, we scale by 100 for precision
// Example: 3.2% becomes 320
const series = data.Results.series[0];
const latestData = series.data[0];
const inflationRate = Math.round(parseFloat(latestData.value) * 100);

// Return as encoded uint256
return Functions.encodeUint256(inflationRate);