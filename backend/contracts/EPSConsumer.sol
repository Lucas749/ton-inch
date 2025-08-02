// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title EPSConsumer
 * @notice Simple Chainlink Functions consumer for Alpha Vantage EPS estimates
 * @dev Fetches and stores EPS estimates for stock symbols
 */
contract EPSConsumer is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // State variables to store the last request ID, response, and error
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    // EPS data storage
    uint256 public latestEPS;
    string public lastSymbol;
    uint256 public lastUpdateTime;

    // Custom error type
    error UnexpectedRequestID(bytes32 requestId);

    // Event to log EPS responses
    event EPSUpdated(
        bytes32 indexed requestId,
        string symbol,
        uint256 epsValue,
        uint256 timestamp
    );

    // Base network router address (correct)
    address router = 0xf9B8fc078197181C841c296C876945aaa425B278;

    // Alpha Vantage EPS source code
    string source =
        "const symbol = (args[0] || 'MSTR').toUpperCase();"
        "if (!secrets.apiKey) {"
        "throw Error('Missing secret: apiKey, for this example try using API key: 123');"
        "}"
        "const url = 'https://www.alphavantage.co/query';"
        "console.log(`HTTP GET Request to ${url}?function=EARNINGS_ESTIMATES&symbol=${symbol}`);"
        "const alphavantageRequest = Functions.makeHttpRequest({"
        "url: url,"
        "params: {"
        "function: 'EARNINGS_ESTIMATES',"
        "symbol: symbol,"
        "apikey: secrets.apiKey"
        "}"
        "});"
        "const alphavantageResponse = await alphavantageRequest;"
        "if (alphavantageResponse.error) {"
        "console.error(alphavantageResponse.error);"
        "throw Error('Request failed');"
        "}"
        "const data = alphavantageResponse['data'] || {};"
        "const softError = data.Note || data.Information || data['Error Message'];"
        "if (softError) {"
        "console.error(softError);"
        "throw Error(`Functional error. Read message: ${softError}`);"
        "}"
        "if (!Array.isArray(data.estimates) || data.estimates.length === 0) {"
        "throw Error('Response missing estimates array.');"
        "}"
        "const epsAvgRaw = data.estimates[0]?.eps_estimate_average;"
        "const epsAvg = parseFloat(epsAvgRaw);"
        "if (!isFinite(epsAvg)) {"
        "throw Error('Missing or non-numeric eps_estimate_average on the first element.');"
        "}"
        "if (epsAvg < 0) {"
        "throw Error('eps_estimate_average is negative; cannot encode as uint256.');"
        "}"
        "return Functions.encodeUint256(Math.round(epsAvg * 10000));";

    // Callback gas limit
    uint32 gasLimit = 300000;

    // Base network donID  
    bytes32 donID = 0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000;

    // Subscription ID (loaded from environment)
    uint64 public subscriptionId;

    /**
     * @notice Initializes the contract with the Chainlink router and subscription ID
     */
    constructor(uint64 _subscriptionId) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        subscriptionId = _subscriptionId;
    }

    /**
     * @notice Sends an HTTP request for EPS information
     * @param symbol The stock symbol to get EPS for (e.g., "MSTR")
     * @return requestId The ID of the request
     */
    function requestEPS(string calldata symbol) external onlyOwner returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        
        // Set the stock symbol as argument
        string[] memory args = new string[](1);
        args[0] = symbol;
        req.setArgs(args);

        // Send the request and store the request ID
        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donID
        );

        lastSymbol = symbol;
        return s_lastRequestId;
    }

    /**
     * @notice Callback function for fulfilling a request
     * @param requestId The ID of the request to fulfill
     * @param response The HTTP response data
     * @param err Any errors from the Functions request
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }
        
        // Update the contract's state variables with the response and any errors
        s_lastResponse = response;
        s_lastError = err;
        lastUpdateTime = block.timestamp;

        // Decode the EPS value if response is valid
        if (response.length > 0 && err.length == 0) {
            latestEPS = abi.decode(response, (uint256));
        }

        // Emit an event to log the response
        emit EPSUpdated(requestId, lastSymbol, latestEPS, lastUpdateTime);
    }

    /**
     * @notice Get the latest EPS value
     * @return eps The latest EPS estimate (scaled by 10000)
     * @return symbol The stock symbol
     * @return timestamp When the data was last updated
     */
    function getLatestEPS() external view returns (uint256 eps, string memory symbol, uint256 timestamp) {
        return (latestEPS, lastSymbol, lastUpdateTime);
    }

    /**
     * @notice Get EPS value in human readable format
     * @return Formatted EPS value as a decimal
     */
    function getFormattedEPS() external view returns (string memory) {
        if (latestEPS == 0) return "0.0000";
        
        uint256 wholePart = latestEPS / 10000;
        uint256 decimalPart = latestEPS % 10000;
        
        return string(abi.encodePacked(
            uintToString(wholePart),
            ".",
            padDecimals(decimalPart)
        ));
    }

    // Helper functions for formatting
    function uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
    
    function padDecimals(uint256 value) internal pure returns (string memory) {
        if (value >= 1000) return uintToString(value);
        if (value >= 100) return string(abi.encodePacked("0", uintToString(value)));
        if (value >= 10) return string(abi.encodePacked("00", uintToString(value)));
        return string(abi.encodePacked("000", uintToString(value)));
    }
}