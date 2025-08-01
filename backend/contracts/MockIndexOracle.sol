// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockIndexOracle
 * @notice Mock oracle contract for testing index-based limit orders
 * @dev Provides mock data for various indices - replace with real oracles in production
 */
contract MockIndexOracle {
    
    enum IndexType {
        INFLATION_RATE,     // 0
        ELON_FOLLOWERS,     // 1  
        BTC_PRICE,          // 2
        VIX_INDEX,          // 3
        UNEMPLOYMENT_RATE,  // 4
        TESLA_STOCK        // 5
    }
    
    struct IndexData {
        uint256 value;
        uint256 timestamp;
        bool isActive;
    }
    
    mapping(IndexType => IndexData) public indexData;
    address public owner;
    
    event IndexUpdated(IndexType indexed indexType, uint256 value, uint256 timestamp);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Initialize with mock data (scaled to avoid decimals)
        indexData[IndexType.INFLATION_RATE] = IndexData({
            value: 320, // 3.20%
            timestamp: block.timestamp,
            isActive: true
        });
        
        indexData[IndexType.ELON_FOLLOWERS] = IndexData({
            value: 150000000, // 150M followers
            timestamp: block.timestamp,
            isActive: true
        });
        
        indexData[IndexType.BTC_PRICE] = IndexData({
            value: 43000 * 100, // $43,000 (scaled by 100)
            timestamp: block.timestamp,
            isActive: true
        });
        
        indexData[IndexType.VIX_INDEX] = IndexData({
            value: 1850, // 18.50
            timestamp: block.timestamp,
            isActive: true
        });
        
        indexData[IndexType.UNEMPLOYMENT_RATE] = IndexData({
            value: 370, // 3.70%
            timestamp: block.timestamp,
            isActive: true
        });
        
        indexData[IndexType.TESLA_STOCK] = IndexData({
            value: 248 * 100, // $248 (scaled by 100)
            timestamp: block.timestamp,
            isActive: true
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
        return (data.value, data.timestamp);
    }

    // Overloaded function that accepts uint256 indexId for generalized system
    function getIndexValue(uint256 indexId) external view returns (uint256 value, uint256 timestamp) {
        // Map new indexId system to legacy enum for backward compatibility
        IndexType indexType;
        if (indexId == 0) indexType = IndexType.INFLATION_RATE;
        else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
        else if (indexId == 2) indexType = IndexType.BTC_PRICE;
        else if (indexId == 3) indexType = IndexType.VIX_INDEX;
        else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
        else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
        else revert("Index not supported");
        
        IndexData memory data = indexData[indexType];
        require(data.isActive, "Index not active");
        return (data.value, data.timestamp);
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
        if (indexId > 5) return false; // Only support predefined indices for now
        
        IndexType indexType;
        if (indexId == 0) indexType = IndexType.INFLATION_RATE;
        else if (indexId == 1) indexType = IndexType.ELON_FOLLOWERS;
        else if (indexId == 2) indexType = IndexType.BTC_PRICE;
        else if (indexId == 3) indexType = IndexType.VIX_INDEX;
        else if (indexId == 4) indexType = IndexType.UNEMPLOYMENT_RATE;
        else if (indexId == 5) indexType = IndexType.TESLA_STOCK;
        
        return indexData[indexType].isActive;
    }
    
    /**
     * @notice Update index value (for testing/demo)
     * @param indexType Type of index to update
     * @param newValue New value for the index
     */
    function updateIndex(IndexType indexType, uint256 newValue) external onlyOwner {
        indexData[indexType].value = newValue;
        indexData[indexType].timestamp = block.timestamp;
        
        emit IndexUpdated(indexType, newValue, block.timestamp);
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
            
            emit IndexUpdated(indexTypes[i], newValues[i], block.timestamp);
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
        emit IndexUpdated(indexType, data.value, block.timestamp);
    }
    
    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}