// Generic API Source Code Template for Chainlink Functions
// Customizable template for fetching data from any REST API
// 
// Arguments:
// args[0] = API URL
// args[1] = JSON path to the value (e.g., "data.price" or "results.0.value")
// args[2] = Scale factor (optional, defaults to 100)

const apiUrl = args[0];
const jsonPath = args[1];
const scaleFactor = args[2] ? parseInt(args[2]) : 100;

if (!apiUrl || !jsonPath) {
  throw Error("API URL and JSON path are required");
}

const apiResponse = await Functions.makeHttpRequest({
  url: apiUrl,
  headers: {
    "Accept": "application/json",
    "User-Agent": "ChainlinkFunctions/1.0"
  }
});

if (apiResponse.error) {
  throw Error("Request failed");
}

const { data } = apiResponse;

// Navigate through nested JSON using the path
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      // Handle array indices (e.g., "results.0.value")
      if (!isNaN(parseInt(key))) {
        return current[parseInt(key)];
      }
      return current[key];
    }
    return undefined;
  }, obj);
}

const rawValue = getNestedValue(data, jsonPath);

if (rawValue === undefined || rawValue === null) {
  throw Error(`Value not found at path: ${jsonPath}`);
}

// Convert to number and scale
const numericValue = parseFloat(rawValue);
if (isNaN(numericValue)) {
  throw Error(`Value is not numeric: ${rawValue}`);
}

const scaledValue = Math.round(numericValue * scaleFactor);

// Return as encoded uint256
return Functions.encodeUint256(scaledValue);