// Alpha Vantage EPS Estimates Chainlink Functions Source Code
// This function retrieves the latest EPS estimate average from Alpha Vantage's EARNINGS_ESTIMATES endpoint.
// Args:
//   args[0] = symbol (e.g., "MSTR")
// Returns: eps_estimate_average * 10000 as uint256 (rounded)
//
// NOTE: Alpha Vantage requires an API key.

const symbol = (args[0] || "MSTR").toUpperCase();

// To run this example provide apiKey secret with a value of: 123
if (!secrets.apiKey) {
  throw Error("Missing secret: apiKey, for this example try using API key: 123");
}

// make HTTP request
const url = "https://www.alphavantage.co/query";
console.log(`HTTP GET Request to ${url}?function=EARNINGS_ESTIMATES&symbol=${symbol}\n`);

// construct the HTTP Request object
const alphavantageRequest = Functions.makeHttpRequest({
  url: url,
  params: {
    function: "EARNINGS_ESTIMATES",
    symbol: symbol,
    apikey: secrets.apiKey,
  },
});

// Execute the API request (Promise)
const alphavantageResponse = await alphavantageRequest;
if (alphavantageResponse.error) {
  console.error(alphavantageResponse.error);
  throw Error("Request failed");
}

const data = alphavantageResponse["data"] || {};
console.log(JSON.stringify(data, null, 2));

// Soft errors sometimes returned with HTTP 200
const softError = data.Note || data.Information || data["Error Message"];
if (softError) {
  console.error(softError);
  throw Error(`Functional error. Read message: ${softError}`);
}

// Extract the first eps_estimate_average
if (!Array.isArray(data.estimates) || data.estimates.length === 0) {
  throw Error("Response missing 'estimates' array.");
}

const epsAvgRaw = data.estimates[0]?.eps_estimate_average;
const epsAvg = parseFloat(epsAvgRaw);
if (!isFinite(epsAvg)) {
  throw Error("Missing or non-numeric 'eps_estimate_average' on the first element.");
}

// uint256 cannot encode negatives; fail if negative
if (epsAvg < 0) {
  throw Error("eps_estimate_average is negative; cannot encode as uint256.");
}

// Solidity doesn't support decimals so multiply by 10000 and round to the nearest integer
return Functions.encodeUint256(Math.round(epsAvg * 10000));