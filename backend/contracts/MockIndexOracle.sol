// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HybridIndexOracle
 * @notice Hybrid oracle that can read from mock data or Chainlink Functions
 * @dev Provides flexibility between testing (mock) and production (Chainlink) data sources
 */

// Interface for ChainlinkIndexOracle
interface IChainlinkIndexOracle {
    function getIndexValue(uint256 indexId) external view returns (
        uint256 value,
        uint256 timestamp,
        string memory sourceUrl,
        bool isActive
    );
}

contract MockIndexOracle {
    
    enum IndexType {
        INFLATION_RATE,     // 0
        ELON_FOLLOWERS,     // 1  
        BTC_PRICE,          // 2
        VIX_INDEX,          // 3
        UNEMPLOYMENT_RATE,  // 4
        TESLA_STOCK        // 5
    }
    
    enum OracleType {
        MOCK,               // Use local mock data
        CHAINLINK          // Use Chainlink Functions data
    }
    
    struct IndexData {
        uint256 value;
        uint256 timestamp;
        string sourceUrl;     // URL where this index data comes from
        bool isActive;
        OracleType oracleType; // Which oracle to use for this index
        address creator;      // Address that created this index
    }
    
    mapping(IndexType => IndexData) public indexData;
    mapping(uint256 => IndexData) public customIndexData;
    address public owner;
    uint256 public nextCustomIndexId = 6; // Start after predefined indices
    
    // Chainlink Functions integration - Per-index oracle addresses
    mapping(uint256 => address) public indexChainlinkOracles;
    address public defaultChainlinkOracleAddress;  // Fallback for backward compatibility
    
    event IndexUpdated(IndexType indexed indexType, uint256 value, uint256 timestamp, string sourceUrl);
    event CustomIndexCreated(uint256 indexed indexId, uint256 value, uint256 timestamp, string sourceUrl, address indexed creator);
    event SourceUrlUpdated(uint256 indexed indexId, string oldUrl, string newUrl);
    event OracleTypeUpdated(uint256 indexed indexId, OracleType oldType, OracleType newType);
    event ChainlinkOracleUpdated(address oldAddress, address newAddress);
    event IndexChainlinkOracleUpdated(uint256 indexed indexId, address oldAddress, address newAddress);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyOwnerOrCreator(uint256 indexId) {
        if (indexId <= 5) {
            // For predefined indices, check owner or predefined creator
            IndexType indexType;
            if (indexId == 0) indexType = IndexType.INFLATION_RATE;
            else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
            else if (indexId == 2) indexType = IndexType.BTC_PRICE;
            else if (indexId == 3) indexType = IndexType.VIX_INDEX;
            else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
            else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
            
            require(msg.sender == owner || msg.sender == indexData[indexType].creator, "Not owner or creator");
        } else {
            // For custom indices
            require(msg.sender == owner || msg.sender == customIndexData[indexId].creator, "Not owner or creator");
        }
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Initialize with mock data (scaled to avoid decimals)
        // Default to MOCK oracle type for all indices, deployer is creator
        indexData[IndexType.INFLATION_RATE] = IndexData({
            value: 320, // 3.20%
            timestamp: block.timestamp,
            sourceUrl: "https://api.bls.gov/publicAPI/v2/timeseries/CUUR0000SA0",
            isActive: true,
            oracleType: OracleType.MOCK,
            creator: msg.sender
        });
        
        indexData[IndexType.ELON_FOLLOWERS] = IndexData({
            value: 150000000, // 150M followers
            timestamp: block.timestamp,
            sourceUrl: "https://api.twitter.com/2/users/by/username/elonmusk",
            isActive: true,
            oracleType: OracleType.MOCK,
            creator: msg.sender
        });
        
        indexData[IndexType.BTC_PRICE] = IndexData({
            value: 43000 * 100, // $43,000 (scaled by 100)
            timestamp: block.timestamp,
            sourceUrl: "https://api.coindesk.com/v1/bpi/currentprice.json",
            isActive: true,
            oracleType: OracleType.MOCK,
            creator: msg.sender
        });
        
        indexData[IndexType.VIX_INDEX] = IndexData({
            value: 1850, // 18.50
            timestamp: block.timestamp,
            sourceUrl: "https://api.cboe.com/data/historical/VIX",
            isActive: true,
            oracleType: OracleType.MOCK,
            creator: msg.sender
        });
        
        indexData[IndexType.UNEMPLOYMENT_RATE] = IndexData({
            value: 370, // 3.70%
            timestamp: block.timestamp,
            sourceUrl: "https://api.bls.gov/publicAPI/v2/timeseries/LNS14000000",
            isActive: true,
            oracleType: OracleType.MOCK,
            creator: msg.sender
        });
        
        indexData[IndexType.TESLA_STOCK] = IndexData({
            value: 248 * 100, // $248 (scaled by 100)
            timestamp: block.timestamp,
            sourceUrl: "https://api.polygon.io/v2/last/trade/TSLA",
            isActive: true,
            oracleType: OracleType.MOCK,
            creator: msg.sender
        });
    }
    
    /**
     * @notice Get current value for an index
     * @param indexType Type of index to query
     * @return value Current index value
     * @return timestamp Last update timestamp
     */
    function getIndexValue(IndexType indexType) external view returns (uint256 value, uint256 timestamp) {
        IndexData memory data = indexData[indexType];
        require(data.isActive, "Index not active");
        
        // Check oracle type and route accordingly
        if (data.oracleType == OracleType.CHAINLINK) {
            return _getChainlinkValue(uint256(indexType));
        } else {
            return (data.value, data.timestamp);
        }
    }

    // Overloaded function that accepts uint256 indexId for generalized system
    function getIndexValue(uint256 indexId) external view returns (uint256 value, uint256 timestamp) {
        if (indexId <= 5) {
            // Handle predefined indices
            IndexType indexType;
            if (indexId == 0) indexType = IndexType.INFLATION_RATE;
            else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
            else if (indexId == 2) indexType = IndexType.BTC_PRICE;
            else if (indexId == 3) indexType = IndexType.VIX_INDEX;
            else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
            else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
            
            IndexData memory data = indexData[indexType];
            require(data.isActive, "Index not active");
            
            // Check oracle type and route accordingly
            if (data.oracleType == OracleType.CHAINLINK) {
                return _getChainlinkValue(indexId);
            } else {
                return (data.value, data.timestamp);
            }
        } else {
            // Handle custom indices
            IndexData memory data = customIndexData[indexId];
            require(data.isActive, "Index not active");
            
            // Check oracle type and route accordingly
            if (data.oracleType == OracleType.CHAINLINK) {
                return _getChainlinkValue(indexId);
            } else {
                return (data.value, data.timestamp);
            }
        }
    }
    
    /**
     * @notice Internal function to get value from Chainlink oracle (per-index)
     * @param indexId The index ID to query from Chainlink
     * @return value Current index value from Chainlink
     * @return timestamp Last update timestamp from Chainlink
     */
    function _getChainlinkValue(uint256 indexId) internal view returns (uint256 value, uint256 timestamp) {
        // Get the specific Chainlink oracle address for this index
        address chainlinkOracleAddress = indexChainlinkOracles[indexId];
        
        // Fallback to default if not set
        if (chainlinkOracleAddress == address(0)) {
            chainlinkOracleAddress = defaultChainlinkOracleAddress;
        }
        
        // Require a valid oracle address
        require(chainlinkOracleAddress != address(0), "No Chainlink oracle configured for this index");
        
        // Create interface instance for this specific oracle
        IChainlinkIndexOracle chainlinkOracle = IChainlinkIndexOracle(chainlinkOracleAddress);
        
        try chainlinkOracle.getIndexValue(indexId) returns (
            uint256 chainlinkValue,
            uint256 chainlinkTimestamp,
            string memory,
            bool chainlinkActive
        ) {
            require(chainlinkActive, "Chainlink index not active");
            return (chainlinkValue, chainlinkTimestamp);
        } catch {
            // Fallback to mock data if Chainlink call fails
            if (indexId <= 5) {
                IndexType indexType;
                if (indexId == 0) indexType = IndexType.INFLATION_RATE;
                else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
                else if (indexId == 2) indexType = IndexType.BTC_PRICE;
                else if (indexId == 3) indexType = IndexType.VIX_INDEX;
                else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
                else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
                
                IndexData memory fallbackData = indexData[indexType];
                return (fallbackData.value, fallbackData.timestamp);
            } else {
                IndexData memory fallbackData = customIndexData[indexId];
                return (fallbackData.value, fallbackData.timestamp);
            }
        }
    }
    
    /**
     * @notice Check if index is valid/active
     * @param indexType Type of index to check
     * @return isValid Whether index is active
     */
    function isValidIndex(IndexType indexType) external view returns (bool isValid) {
        return indexData[indexType].isActive;
    }

    // Overloaded function that accepts uint256 indexId for generalized system  
    function isValidIndex(uint256 indexId) external view returns (bool) {
        if (indexId <= 5) {
            // Handle predefined indices
            IndexType indexType;
            if (indexId == 0) indexType = IndexType.INFLATION_RATE;
            else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
            else if (indexId == 2) indexType = IndexType.BTC_PRICE;
            else if (indexId == 3) indexType = IndexType.VIX_INDEX;
            else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
            else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
            
            return indexData[indexType].isActive;
        } else {
            // Handle custom indices
            return customIndexData[indexId].isActive;
        }
    }
    
    /**
     * @notice Update index value (for testing/demo)
     * @param indexType Type of index to update
     * @param newValue New value for the index
     */
    function updateIndex(IndexType indexType, uint256 newValue) external onlyOwner {
        indexData[indexType].value = newValue;
        indexData[indexType].timestamp = block.timestamp;
        
        emit IndexUpdated(indexType, newValue, block.timestamp, "");
    }
    
    /**
     * @notice Batch update multiple indices
     * @param indexTypes Array of index types
     * @param newValues Array of new values
     */
    function updateIndices(IndexType[] calldata indexTypes, uint256[] calldata newValues) external onlyOwner {
        require(indexTypes.length == newValues.length, "Array length mismatch");
        
        for (uint i = 0; i < indexTypes.length; i++) {
            indexData[indexTypes[i]].value = newValues[i];
            indexData[indexTypes[i]].timestamp = block.timestamp;
            
            emit IndexUpdated(indexTypes[i], newValues[i], block.timestamp, "");
        }
    }
    
    /**
     * @notice Activate/deactivate an index
     * @param indexType Type of index
     * @param isActive Whether index should be active
     */
    function setIndexActive(IndexType indexType, bool isActive) external onlyOwner {
        indexData[indexType].isActive = isActive;
    }
    
    /**
     * @notice Simulate price movement for demo purposes
     * @param indexType Type of index
     * @param percentChange Percentage change (scaled by 100, e.g., 500 = 5%)
     * @param isIncrease Whether it's an increase or decrease
     */
    function simulatePriceMovement(IndexType indexType, uint256 percentChange, bool isIncrease) external onlyOwner {
        IndexData storage data = indexData[indexType];
        uint256 currentValue = data.value;
        uint256 changeAmount = (currentValue * percentChange) / 10000; // Scale by 10000 for percentage
        
        if (isIncrease) {
            data.value = currentValue + changeAmount;
        } else {
            if (changeAmount < currentValue) {
                data.value = currentValue - changeAmount;
            } else {
                data.value = 0; // Prevent underflow
            }
        }
        
        data.timestamp = block.timestamp;
        emit IndexUpdated(indexType, data.value, block.timestamp, data.sourceUrl);
    }
    
    /**
     * @notice Get what the next custom index ID will be
     * @return nextId The ID that will be assigned to the next custom index
     */
    function getNextCustomIndexId() external view returns (uint256 nextId) {
        return nextCustomIndexId;
    }
    
    /**
     * @notice Get all custom indices with their details
     * @return indexIds Array of all custom index IDs
     * @return values Array of current values for each index
     * @return timestamps Array of last update timestamps for each index
     * @return activeStates Array of active states for each index
     */
    function getAllCustomIndices() external view returns (
        uint256[] memory indexIds,
        uint256[] memory values,
        uint256[] memory timestamps,
        bool[] memory activeStates
    ) {
        uint256 totalIndices = nextCustomIndexId - 6; // Number of custom indices created
        
        indexIds = new uint256[](totalIndices);
        values = new uint256[](totalIndices);
        timestamps = new uint256[](totalIndices);
        activeStates = new bool[](totalIndices);
        
        for (uint256 i = 0; i < totalIndices; i++) {
            uint256 indexId = 6 + i; // Custom indices start at ID 6
            IndexData memory data = customIndexData[indexId];
            
            indexIds[i] = indexId;
            values[i] = data.value;
            timestamps[i] = data.timestamp;
            activeStates[i] = data.isActive;
        }
    }
    
    /**
     * @notice Create a new custom index with oracle type and optional Chainlink address
     * @param initialValue Initial value for the index
     * @param sourceUrl URL where this index data comes from
     * @param oracleType Whether to use MOCK or CHAINLINK oracle
     * @param chainlinkOracleAddress Address of Chainlink oracle (use 0x0 for none/default)
     * @return indexId The ID of the created index
     */
    function createCustomIndex(
        uint256 initialValue, 
        string calldata sourceUrl, 
        OracleType oracleType, 
        address chainlinkOracleAddress
    ) external returns (uint256 indexId) {
        indexId = nextCustomIndexId++;
        
        customIndexData[indexId] = IndexData({
            value: initialValue,
            timestamp: block.timestamp,
            sourceUrl: sourceUrl,
            isActive: true,
            oracleType: oracleType,
            creator: msg.sender
        });
        
        // Set per-index Chainlink oracle address if provided
        if (chainlinkOracleAddress != address(0)) {
            indexChainlinkOracles[indexId] = chainlinkOracleAddress;
            emit IndexChainlinkOracleUpdated(indexId, address(0), chainlinkOracleAddress);
        }
        
        emit CustomIndexCreated(indexId, initialValue, block.timestamp, sourceUrl, msg.sender);
    }
    

    

    
    /**
     * @notice Update custom index value
     * @param indexId ID of the custom index
     * @param newValue New value for the index
     */
    function updateCustomIndex(uint256 indexId, uint256 newValue) external onlyOwnerOrCreator(indexId) {
        if (indexId <= 5) {
            // Handle predefined indices
            IndexType indexType;
            if (indexId == 0) indexType = IndexType.INFLATION_RATE;
            else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
            else if (indexId == 2) indexType = IndexType.BTC_PRICE;
            else if (indexId == 3) indexType = IndexType.VIX_INDEX;
            else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
            else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
            
            indexData[indexType].value = newValue;
            indexData[indexType].timestamp = block.timestamp;
            emit IndexUpdated(indexType, newValue, block.timestamp, "");
        } else {
            // Handle custom indices
            require(customIndexData[indexId].isActive, "Index not active");
            customIndexData[indexId].value = newValue;
            customIndexData[indexId].timestamp = block.timestamp;
            
            emit IndexUpdated(IndexType(0), newValue, block.timestamp, ""); // Use dummy enum for event
        }
    }
    
    /**
     * @notice Set custom index active/inactive
     * @param indexId ID of the custom index
     * @param isActive Whether the index should be active
     */
    function setCustomIndexActive(uint256 indexId, bool isActive) external onlyOwnerOrCreator(indexId) {
        if (indexId <= 5) {
            // Handle predefined indices
            IndexType indexType;
            if (indexId == 0) indexType = IndexType.INFLATION_RATE;
            else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
            else if (indexId == 2) indexType = IndexType.BTC_PRICE;
            else if (indexId == 3) indexType = IndexType.VIX_INDEX;
            else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
            else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
            
            indexData[indexType].isActive = isActive;
        } else {
            // Handle custom indices
            customIndexData[indexId].isActive = isActive;
        }
    }
    
    /**
     * @notice Set the default Chainlink oracle address (fallback for all indices)
     * @param _chainlinkOracleAddress Address of the deployed ChainlinkIndexOracle contract
     */
    function setChainlinkOracle(address _chainlinkOracleAddress) external onlyOwner {
        address oldAddress = defaultChainlinkOracleAddress;
        defaultChainlinkOracleAddress = _chainlinkOracleAddress;
        
        emit ChainlinkOracleUpdated(oldAddress, _chainlinkOracleAddress);
    }
    
    /**
     * @notice Set specific Chainlink oracle address for an index
     * @param indexId ID of the index
     * @param _chainlinkOracleAddress Address of the Chainlink oracle for this specific index
     */
    function setIndexChainlinkOracle(uint256 indexId, address _chainlinkOracleAddress) external onlyOwnerOrCreator(indexId) {
        address oldAddress = indexChainlinkOracles[indexId];
        indexChainlinkOracles[indexId] = _chainlinkOracleAddress;
        
        emit IndexChainlinkOracleUpdated(indexId, oldAddress, _chainlinkOracleAddress);
    }
    
    /**
     * @notice Batch set Chainlink oracle addresses for multiple indices
     * @param indexIds Array of index IDs
     * @param chainlinkOracleAddresses Array of Chainlink oracle addresses
     */
    function batchSetIndexChainlinkOracles(
        uint256[] calldata indexIds, 
        address[] calldata chainlinkOracleAddresses
    ) external onlyOwner {
        require(indexIds.length == chainlinkOracleAddresses.length, "Array length mismatch");
        
        for (uint i = 0; i < indexIds.length; i++) {
            address oldAddress = indexChainlinkOracles[indexIds[i]];
            indexChainlinkOracles[indexIds[i]] = chainlinkOracleAddresses[i];
            emit IndexChainlinkOracleUpdated(indexIds[i], oldAddress, chainlinkOracleAddresses[i]);
        }
    }
    
    /**
     * @notice Get Chainlink oracle address for a specific index
     * @param indexId ID of the index
     * @return oracleAddress The Chainlink oracle address (specific or default)
     */
    function getIndexChainlinkOracle(uint256 indexId) external view returns (address oracleAddress) {
        oracleAddress = indexChainlinkOracles[indexId];
        if (oracleAddress == address(0)) {
            oracleAddress = defaultChainlinkOracleAddress;
        }
        return oracleAddress;
    }
    
    /**
     * @notice Get all per-index Chainlink oracle addresses
     * @param indexIds Array of index IDs to query
     * @return oracleAddresses Array of oracle addresses (specific or default)
     * @return isSpecific Array indicating if each address is index-specific (true) or default (false)
     */
    function getMultipleIndexChainlinkOracles(uint256[] calldata indexIds) external view returns (
        address[] memory oracleAddresses,
        bool[] memory isSpecific
    ) {
        oracleAddresses = new address[](indexIds.length);
        isSpecific = new bool[](indexIds.length);
        
        for (uint i = 0; i < indexIds.length; i++) {
            address specificAddress = indexChainlinkOracles[indexIds[i]];
            if (specificAddress != address(0)) {
                oracleAddresses[i] = specificAddress;
                isSpecific[i] = true;
            } else {
                oracleAddresses[i] = defaultChainlinkOracleAddress;
                isSpecific[i] = false;
            }
        }
    }
    
    /**
     * @notice Set oracle type for a predefined index
     * @param indexId ID of the index (0-5 for predefined indices)
     * @param oracleType New oracle type (MOCK or CHAINLINK)
     */
    function setIndexOracleType(uint256 indexId, OracleType oracleType) external onlyOwnerOrCreator(indexId) {
        require(indexId <= 5, "Use setCustomIndexOracleType for custom indices");
        
        IndexType indexType;
        if (indexId == 0) indexType = IndexType.INFLATION_RATE;
        else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
        else if (indexId == 2) indexType = IndexType.BTC_PRICE;
        else if (indexId == 3) indexType = IndexType.VIX_INDEX;
        else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
        else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
        
        OracleType oldType = indexData[indexType].oracleType;
        indexData[indexType].oracleType = oracleType;
        
        emit OracleTypeUpdated(indexId, oldType, oracleType);
    }
    
    /**
     * @notice Set oracle type for a custom index
     * @param indexId ID of the custom index (>5)
     * @param oracleType New oracle type (MOCK or CHAINLINK)
     */
    function setCustomIndexOracleType(uint256 indexId, OracleType oracleType) external onlyOwnerOrCreator(indexId) {
        require(indexId > 5, "Use setIndexOracleType for predefined indices");
        require(customIndexData[indexId].isActive, "Index not found");
        
        OracleType oldType = customIndexData[indexId].oracleType;
        customIndexData[indexId].oracleType = oracleType;
        
        emit OracleTypeUpdated(indexId, oldType, oracleType);
    }
    
    /**
     * @notice Batch set oracle type for multiple indices
     * @param indexIds Array of index IDs
     * @param oracleTypes Array of oracle types
     */
    function batchSetOracleType(uint256[] calldata indexIds, OracleType[] calldata oracleTypes) external onlyOwner {
        require(indexIds.length == oracleTypes.length, "Array length mismatch");
        
        for (uint i = 0; i < indexIds.length; i++) {
            if (indexIds[i] <= 5) {
                // Handle predefined indices
                IndexType indexType;
                if (indexIds[i] == 0) indexType = IndexType.INFLATION_RATE;
                else if (indexIds[i] == 1) indexType = IndexType.ELON_FOLLOWERS;
                else if (indexIds[i] == 2) indexType = IndexType.BTC_PRICE;
                else if (indexIds[i] == 3) indexType = IndexType.VIX_INDEX;
                else if (indexIds[i] == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
                else if (indexIds[i] == 5) indexType = IndexType.TESLA_STOCK;
                
                OracleType oldType = indexData[indexType].oracleType;
                indexData[indexType].oracleType = oracleTypes[i];
                emit OracleTypeUpdated(indexIds[i], oldType, oracleTypes[i]);
            } else {
                // Handle custom indices
                if (customIndexData[indexIds[i]].isActive) {
                    OracleType oldType = customIndexData[indexIds[i]].oracleType;
                    customIndexData[indexIds[i]].oracleType = oracleTypes[i];
                    emit OracleTypeUpdated(indexIds[i], oldType, oracleTypes[i]);
                }
            }
        }
    }
    
    /**
     * @notice Get oracle type for an index
     * @param indexId ID of the index
     * @return oracleType Current oracle type (MOCK or CHAINLINK)
     */
    function getIndexOracleType(uint256 indexId) external view returns (OracleType oracleType) {
        if (indexId <= 5) {
            IndexType indexType;
            if (indexId == 0) indexType = IndexType.INFLATION_RATE;
            else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
            else if (indexId == 2) indexType = IndexType.BTC_PRICE;
            else if (indexId == 3) indexType = IndexType.VIX_INDEX;
            else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
            else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
            
            return indexData[indexType].oracleType;
        } else {
            require(customIndexData[indexId].isActive, "Index not found");
            return customIndexData[indexId].oracleType;
        }
    }
    
    /**
     * @notice Get hybrid oracle status
     * @return chainlinkAddress Current default Chainlink oracle address
     * @return isChainlinkConfigured Whether default Chainlink oracle is configured
     * @return mockIndicesCount Number of indices using mock oracle
     * @return chainlinkIndicesCount Number of indices using Chainlink oracle
     */
    function getHybridOracleStatus() external view returns (
        address chainlinkAddress,
        bool isChainlinkConfigured,
        uint256 mockIndicesCount,
        uint256 chainlinkIndicesCount
    ) {
        chainlinkAddress = defaultChainlinkOracleAddress;
        isChainlinkConfigured = defaultChainlinkOracleAddress != address(0);
        
        // Count oracle types for predefined indices
        for (uint i = 0; i <= 5; i++) {
            IndexType indexType;
            if (i == 0) indexType = IndexType.INFLATION_RATE;
            else if (i == 1) indexType = IndexType.ELON_FOLLOWERS;
            else if (i == 2) indexType = IndexType.BTC_PRICE;
            else if (i == 3) indexType = IndexType.VIX_INDEX;
            else if (i == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
            else if (i == 5) indexType = IndexType.TESLA_STOCK;
            
            if (indexData[indexType].oracleType == OracleType.MOCK) {
                mockIndicesCount++;
            } else {
                chainlinkIndicesCount++;
            }
        }
        
        // Count oracle types for custom indices
        for (uint256 i = 6; i < nextCustomIndexId; i++) {
            if (customIndexData[i].isActive) {
                if (customIndexData[i].oracleType == OracleType.MOCK) {
                    mockIndicesCount++;
                } else {
                    chainlinkIndicesCount++;
                }
            }
        }
    }
    
    /**
     * @notice Get the creator of an index
     * @param indexId ID of the index
     * @return creator Address of the index creator
     */
    function getIndexCreator(uint256 indexId) external view returns (address creator) {
        if (indexId <= 5) {
            IndexType indexType;
            if (indexId == 0) indexType = IndexType.INFLATION_RATE;
            else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
            else if (indexId == 2) indexType = IndexType.BTC_PRICE;
            else if (indexId == 3) indexType = IndexType.VIX_INDEX;
            else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
            else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
            
            return indexData[indexType].creator;
        } else {
            require(customIndexData[indexId].isActive, "Index not found");
            return customIndexData[indexId].creator;
        }
    }
    
    /**
     * @notice Check if caller is the creator of an index
     * @param indexId ID of the index
     * @return isCreator Whether the caller is the creator
     */
    function isIndexCreator(uint256 indexId) external view returns (bool isCreator) {
        if (indexId <= 5) {
            IndexType indexType;
            if (indexId == 0) indexType = IndexType.INFLATION_RATE;
            else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
            else if (indexId == 2) indexType = IndexType.BTC_PRICE;
            else if (indexId == 3) indexType = IndexType.VIX_INDEX;
            else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
            else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
            
            return msg.sender == indexData[indexType].creator;
        } else {
            if (!customIndexData[indexId].isActive) return false;
            return msg.sender == customIndexData[indexId].creator;
        }
    }
    
    /**
     * @notice Get detailed index information including creator
     * @param indexId ID of the index
     * @return value Current value
     * @return timestamp Last update timestamp
     * @return sourceUrl Data source URL
     * @return isActive Whether index is active
     * @return oracleType Oracle type (MOCK or CHAINLINK)
     * @return creator Creator address
     */
    function getIndexDetails(uint256 indexId) external view returns (
        uint256 value,
        uint256 timestamp,
        string memory sourceUrl,
        bool isActive,
        OracleType oracleType,
        address creator
    ) {
        if (indexId <= 5) {
            IndexType indexType;
            if (indexId == 0) indexType = IndexType.INFLATION_RATE;
            else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
            else if (indexId == 2) indexType = IndexType.BTC_PRICE;
            else if (indexId == 3) indexType = IndexType.VIX_INDEX;
            else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
            else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
            
            IndexData memory data = indexData[indexType];
            return (data.value, data.timestamp, data.sourceUrl, data.isActive, data.oracleType, data.creator);
        } else {
            require(customIndexData[indexId].isActive, "Index not found");
            IndexData memory data = customIndexData[indexId];
            return (data.value, data.timestamp, data.sourceUrl, data.isActive, data.oracleType, data.creator);
        }
    }
    
    /**
     * @notice Get all custom indices with their details including creators
     * @return indexIds Array of all custom index IDs
     * @return values Array of current values for each index
     * @return timestamps Array of last update timestamps for each index
     * @return activeStates Array of active states for each index
     * @return creators Array of creator addresses for each index
     */
    function getAllCustomIndicesWithCreators() external view returns (
        uint256[] memory indexIds,
        uint256[] memory values,
        uint256[] memory timestamps,
        bool[] memory activeStates,
        address[] memory creators
    ) {
        uint256 totalIndices = nextCustomIndexId - 6; // Number of custom indices created
        
        indexIds = new uint256[](totalIndices);
        values = new uint256[](totalIndices);
        timestamps = new uint256[](totalIndices);
        activeStates = new bool[](totalIndices);
        creators = new address[](totalIndices);
        
        for (uint256 i = 0; i < totalIndices; i++) {
            uint256 indexId = 6 + i; // Custom indices start at ID 6
            IndexData memory data = customIndexData[indexId];
            
            indexIds[i] = indexId;
            values[i] = data.value;
            timestamps[i] = data.timestamp;
            activeStates[i] = data.isActive;
            creators[i] = data.creator;
        }
    }
    
    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}