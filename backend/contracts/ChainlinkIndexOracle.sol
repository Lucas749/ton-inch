// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {FunctionsClient} from "@chainlink/contracts@1.4.0/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts@1.4.0/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts@1.4.0/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title ChainlinkIndexOracle
 * @notice Chainlink Functions-powered oracle for fetching real-world index data
 * @dev Integrates with the existing index trading system to provide decentralized data feeds
 */
contract ChainlinkIndexOracle is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // Network configuration for Base Mainnet
    address private constant ROUTER = 0xf9B8fc078197181C841c296C876945aaa425B278;
    bytes32 private constant DON_ID = 0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000;
    uint32 private constant GAS_LIMIT = 300000;

    // Index data structure
    struct IndexData {
        uint256 value;
        uint256 timestamp;
        string sourceUrl;
        bool isActive;
        bytes32 lastRequestId;
    }

    // State variables
    mapping(uint256 => IndexData) public indexData;
    mapping(bytes32 => uint256) public requestToIndex; // Maps request ID to index ID
    
    string public defaultSource;
    uint64 public subscriptionId;
    uint256 public nextIndexId;
    
    // Request tracking
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    // Custom errors
    error UnexpectedRequestID(bytes32 requestId);
    error IndexNotFound(uint256 indexId);
    error InvalidSubscription();

    // Events
    event IndexUpdated(uint256 indexed indexId, uint256 value, uint256 timestamp, string sourceUrl);
    event IndexCreated(uint256 indexed indexId, string sourceUrl, string description);
    event SourceUpdated(string oldSource, string newSource);
    event RequestSent(bytes32 indexed requestId, uint256 indexed indexId);
    event RequestFulfilled(bytes32 indexed requestId, uint256 indexed indexId, uint256 value);

    /**
     * @notice Initialize the contract with configurable source code
     * @param _subscriptionId Chainlink Functions subscription ID
     * @param _defaultSource Default JavaScript source code for data fetching
     */
    constructor(
        uint64 _subscriptionId,
        string memory _defaultSource
    ) FunctionsClient(ROUTER) ConfirmedOwner(msg.sender) {
        subscriptionId = _subscriptionId;
        defaultSource = _defaultSource;
        nextIndexId = 0;
        
        // Initialize some common indices
        _createPredefinedIndices();
    }

    /**
     * @notice Create a new index with custom source code
     * @param sourceCode JavaScript source code for fetching this index
     * @param sourceUrl URL/description of the data source
     * @param description Human-readable description of the index
     * @return indexId The ID of the created index
     */
    function createIndex(
        string memory sourceCode,
        string memory sourceUrl,
        string memory description
    ) external onlyOwner returns (uint256 indexId) {
        indexId = nextIndexId++;
        
        indexData[indexId] = IndexData({
            value: 0,
            timestamp: 0,
            sourceUrl: sourceUrl,
            isActive: true,
            lastRequestId: bytes32(0)
        });
        
        emit IndexCreated(indexId, sourceUrl, description);
        
        // Immediately fetch initial data
        updateIndex(indexId, sourceCode, new string[](0));
        
        return indexId;
    }

    /**
     * @notice Update an index value by making a Chainlink Functions request
     * @param indexId The ID of the index to update
     * @param sourceCode JavaScript source code for the request (optional, uses default if empty)
     * @param args Arguments to pass to the JavaScript function
     * @return requestId The ID of the Chainlink Functions request
     */
    function updateIndex(
        uint256 indexId,
        string memory sourceCode,
        string[] memory args
    ) public onlyOwner returns (bytes32 requestId) {
        if (!indexData[indexId].isActive && indexId != 0) {
            revert IndexNotFound(indexId);
        }

        // Use provided source code or default
        string memory source = bytes(sourceCode).length > 0 ? sourceCode : defaultSource;
        
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        if (args.length > 0) req.setArgs(args);

        // Send the request
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            GAS_LIMIT,
            DON_ID
        );

        // Track the request
        s_lastRequestId = requestId;
        requestToIndex[requestId] = indexId;
        indexData[indexId].lastRequestId = requestId;

        emit RequestSent(requestId, indexId);
        return requestId;
    }

    /**
     * @notice Batch update multiple indices
     * @param indexIds Array of index IDs to update
     * @param sourceCode JavaScript source code (same for all indices)
     * @param args Array of arguments for each index
     */
    function updateMultipleIndices(
        uint256[] memory indexIds,
        string memory sourceCode,
        string[][] memory args
    ) external onlyOwner {
        require(indexIds.length == args.length, "Arrays length mismatch");
        
        for (uint i = 0; i < indexIds.length; i++) {
            updateIndex(indexIds[i], sourceCode, args[i]);
        }
    }

    /**
     * @notice Callback function for fulfilling a Chainlink Functions request
     * @param requestId The ID of the request to fulfill
     * @param response The HTTP response data
     * @param err Any errors from the Functions request
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        uint256 indexId = requestToIndex[requestId];
        
        // Update state variables
        s_lastResponse = response;
        s_lastError = err;

        if (err.length == 0 && response.length > 0) {
            // Parse response as uint256 (assuming the JS returns a number)
            uint256 value = abi.decode(response, (uint256));
            
            // Update index data
            indexData[indexId].value = value;
            indexData[indexId].timestamp = block.timestamp;
            
            emit IndexUpdated(indexId, value, block.timestamp, indexData[indexId].sourceUrl);
            emit RequestFulfilled(requestId, indexId, value);
        }

        // Clean up request mapping
        delete requestToIndex[requestId];
    }

    /**
     * @notice Get index value and metadata
     * @param indexId The ID of the index
     * @return value Current value
     * @return timestamp Last update timestamp
     * @return sourceUrl Data source URL
     * @return isActive Whether the index is active
     */
    function getIndexValue(uint256 indexId) external view returns (
        uint256 value,
        uint256 timestamp,
        string memory sourceUrl,
        bool isActive
    ) {
        IndexData memory data = indexData[indexId];
        return (data.value, data.timestamp, data.sourceUrl, data.isActive);
    }

    /**
     * @notice Update the default source code
     * @param newSource New JavaScript source code
     */
    function updateDefaultSource(string memory newSource) external onlyOwner {
        string memory oldSource = defaultSource;
        defaultSource = newSource;
        emit SourceUpdated(oldSource, newSource);
    }

    /**
     * @notice Update subscription ID
     * @param newSubscriptionId New Chainlink Functions subscription ID
     */
    function updateSubscriptionId(uint64 newSubscriptionId) external onlyOwner {
        require(newSubscriptionId > 0, "Invalid subscription ID");
        subscriptionId = newSubscriptionId;
    }

    /**
     * @notice Set index active/inactive status
     * @param indexId The ID of the index
     * @param isActive Whether the index should be active
     */
    function setIndexActive(uint256 indexId, bool isActive) external onlyOwner {
        indexData[indexId].isActive = isActive;
    }

    /**
     * @notice Get the total number of indices
     * @return Total number of created indices
     */
    function getTotalIndices() external view returns (uint256) {
        return nextIndexId;
    }

    /**
     * @notice Emergency function to manually set index value
     * @param indexId The ID of the index
     * @param value The value to set
     */
    function emergencySetValue(uint256 indexId, uint256 value) external onlyOwner {
        indexData[indexId].value = value;
        indexData[indexId].timestamp = block.timestamp;
        emit IndexUpdated(indexId, value, block.timestamp, indexData[indexId].sourceUrl);
    }

    /**
     * @notice Create predefined indices for common use cases
     */
    function _createPredefinedIndices() private {
        // VIX Index
        indexData[0] = IndexData({
            value: 2000, // 20.00
            timestamp: block.timestamp,
            sourceUrl: "https://api.cboe.com/data/historical/VIX",
            isActive: true,
            lastRequestId: bytes32(0)
        });

        // BTC Price Index
        indexData[1] = IndexData({
            value: 4300000, // $43,000 (scaled by 100)
            timestamp: block.timestamp,
            sourceUrl: "https://api.coindesk.com/v1/bpi/currentprice.json",
            isActive: true,
            lastRequestId: bytes32(0)
        });

        // Inflation Rate Index
        indexData[2] = IndexData({
            value: 320, // 3.20%
            timestamp: block.timestamp,
            sourceUrl: "https://api.bls.gov/publicAPI/v2/timeseries/CUUR0000SA0",
            isActive: true,
            lastRequestId: bytes32(0)
        });

        nextIndexId = 3; // Start custom indices from ID 3
    }
}