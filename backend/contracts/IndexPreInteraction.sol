// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/I1inch.sol";

/**
 * @title IndexPreInteraction
 * @notice PreInteraction contract for 1inch limit orders based on external index conditions
 * @dev This contract validates index-based conditions before allowing order execution
 * @dev Generalized to allow users to register custom indices and oracles
 */

interface IIndexOracle {
    function getIndexValue(uint256 indexId) external view returns (uint256 value, uint256 timestamp);
    function isValidIndex(uint256 indexId) external view returns (bool);
}

contract IndexPreInteraction is IPreInteraction {
    using AddressLib for uint256;
    using AddressLib for address;

    // Comparison operators for conditions
    enum ComparisonOperator {
        GREATER_THAN,
        LESS_THAN,
        GREATER_EQUAL,
        LESS_EQUAL,
        EQUAL
    }

    // Structure to store index metadata
    struct IndexInfo {
        string name;
        string description;
        string sourceUrl;     // URL or API endpoint where this index data comes from
        address oracle;
        address creator;
        bool isActive;
        uint256 createdAt;
    }

    // Structure to store order conditions
    struct OrderCondition {
        uint256 indexId;
        ComparisonOperator operator;
        uint256 thresholdValue;
        uint256 registeredAt;
        bool isActive;
    }

    // State variables
    mapping(bytes32 => OrderCondition) public orderConditions;
    mapping(uint256 => IndexInfo) public indexRegistry;
    mapping(address => uint256[]) public userIndices;
    address public owner;
    address public defaultOracle;
    uint256 public nextIndexId;

    // Predefined index IDs for backward compatibility
    uint256 public constant INFLATION_RATE = 0;
    uint256 public constant ELON_FOLLOWERS = 1;
    uint256 public constant BTC_PRICE = 2;
    uint256 public constant VIX_INDEX = 3;
    uint256 public constant UNEMPLOYMENT_RATE = 4;
    uint256 public constant TESLA_STOCK = 5;

    // Events
    event OrderConditionRegistered(bytes32 indexed orderHash, uint256 indexed indexId, ComparisonOperator operator, uint256 thresholdValue);
    event OrderConditionValidated(bytes32 indexed orderHash, bool isValid, uint256 currentValue);
    event IndexRegistered(uint256 indexed indexId, string name, address indexed creator, address indexed oracle, string sourceUrl);
    event OracleUpdated(uint256 indexed indexId, address indexed oldOracle, address indexed newOracle);
    event IndexDeactivated(uint256 indexed indexId, address indexed creator);
    event SourceUrlUpdated(uint256 indexed indexId, string oldUrl, string newUrl, address indexed updater);

    // Errors
    error Unauthorized();
    error InvalidCondition();
    error ConditionNotMet(uint256 currentValue, uint256 thresholdValue);
    error InvalidOracle();
    error IndexNotFound(uint256 indexId);
    error IndexNotActive(uint256 indexId);
    error EmptyIndexName();
    error IndexAlreadyExists(uint256 indexId);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _defaultOracle) {
        owner = msg.sender;
        defaultOracle = _defaultOracle;
        nextIndexId = 6; // Start after predefined indices
        
        // Register predefined indices for backward compatibility
        _registerPredefinedIndices();
    }
    
    /**
     * @dev Register predefined indices for backward compatibility
     */
    function _registerPredefinedIndices() internal {
        indexRegistry[INFLATION_RATE] = IndexInfo({
            name: "Inflation Rate",
            description: "Consumer Price Index inflation rate",
            sourceUrl: "https://api.bls.gov/publicAPI/v2/timeseries/CUUR0000SA0",
            oracle: defaultOracle,
            creator: owner,
            isActive: true,
            createdAt: block.timestamp
        });
        
        indexRegistry[ELON_FOLLOWERS] = IndexInfo({
            name: "Elon Musk Followers",
            description: "Twitter/X follower count for @elonmusk",
            sourceUrl: "https://api.twitter.com/2/users/by/username/elonmusk",
            oracle: defaultOracle,
            creator: owner,
            isActive: true,
            createdAt: block.timestamp
        });
        
        indexRegistry[BTC_PRICE] = IndexInfo({
            name: "Bitcoin Price",
            description: "Bitcoin USD price",
            sourceUrl: "https://api.coindesk.com/v1/bpi/currentprice.json",
            oracle: defaultOracle,
            creator: owner,
            isActive: true,
            createdAt: block.timestamp
        });
        
        indexRegistry[VIX_INDEX] = IndexInfo({
            name: "VIX Volatility Index",
            description: "CBOE Volatility Index",
            sourceUrl: "https://api.cboe.com/data/historical/VIX",
            oracle: defaultOracle,
            creator: owner,
            isActive: true,
            createdAt: block.timestamp
        });
        
        indexRegistry[UNEMPLOYMENT_RATE] = IndexInfo({
            name: "Unemployment Rate",
            description: "US unemployment rate",
            sourceUrl: "https://api.bls.gov/publicAPI/v2/timeseries/LNS14000000",
            oracle: defaultOracle,
            creator: owner,
            isActive: true,
            createdAt: block.timestamp
        });
        
        indexRegistry[TESLA_STOCK] = IndexInfo({
            name: "Tesla Stock Price",
            description: "Tesla Inc. stock price",
            sourceUrl: "https://api.polygon.io/v2/last/trade/TSLA",
            oracle: defaultOracle,
            creator: owner,
            isActive: true,
            createdAt: block.timestamp
        });
    }

    /**
     * @dev Implementation of IPreInteraction interface
     * Called by 1inch before order execution to validate conditions
     */
    function preInteraction(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external override {
        // Register condition from extraData if provided
        if (extraData.length > 0) {
            _registerConditionFromData(orderHash, extraData);
        }

        // Get the order condition
        OrderCondition memory condition = orderConditions[orderHash];
        if (!condition.isActive) revert InvalidCondition();

        // Validate the condition
        bool isValid = _validateCondition(orderHash);
        if (!isValid) {
            (uint256 currentValue,) = _getOracleValue(condition.indexId);
            emit OrderConditionValidated(orderHash, false, currentValue);
            revert ConditionNotMet(currentValue, condition.thresholdValue);
        }

        emit OrderConditionValidated(orderHash, true, 0);
    }

    /**
     * @dev Register a new custom index
     */
    function registerIndex(
        string calldata name,
        string calldata description,
        string calldata sourceUrl,
        address oracle
    ) external returns (uint256 indexId) {
        if (bytes(name).length == 0) revert EmptyIndexName();
        if (oracle == address(0)) revert InvalidOracle();
        
        indexId = nextIndexId++;
        
        indexRegistry[indexId] = IndexInfo({
            name: name,
            description: description,
            sourceUrl: sourceUrl,
            oracle: oracle,
            creator: msg.sender,
            isActive: true,
            createdAt: block.timestamp
        });
        
        userIndices[msg.sender].push(indexId);
        
        emit IndexRegistered(indexId, name, msg.sender, oracle, sourceUrl);
    }
    
    /**
     * @dev Update oracle for an index (only creator or owner)
     */
    function updateIndexOracle(uint256 indexId, address newOracle) external {
        IndexInfo storage index = indexRegistry[indexId];
        if (!index.isActive) revert IndexNotActive(indexId);
        if (msg.sender != index.creator && msg.sender != owner) revert Unauthorized();
        if (newOracle == address(0)) revert InvalidOracle();
        
        address oldOracle = index.oracle;
        index.oracle = newOracle;
        
        emit OracleUpdated(indexId, oldOracle, newOracle);
    }
    
    /**
     * @dev Deactivate an index (only creator or owner)
     */
    function deactivateIndex(uint256 indexId) external {
        IndexInfo storage index = indexRegistry[indexId];
        if (!index.isActive) revert IndexNotActive(indexId);
        if (msg.sender != index.creator && msg.sender != owner) revert Unauthorized();
        
        index.isActive = false;
        
        emit IndexDeactivated(indexId, index.creator);
    }
    
    /**
     * @dev Update source URL for an index (only creator or owner)
     */
    function updateSourceUrl(uint256 indexId, string calldata newSourceUrl) external {
        IndexInfo storage index = indexRegistry[indexId];
        if (!index.isActive) revert IndexNotActive(indexId);
        if (msg.sender != index.creator && msg.sender != owner) revert Unauthorized();
        
        string memory oldUrl = index.sourceUrl;
        index.sourceUrl = newSourceUrl;
        
        emit SourceUrlUpdated(indexId, oldUrl, newSourceUrl, msg.sender);
    }
    
    /**
     * @dev Get index information including source URL
     */
    function getIndexInfo(uint256 indexId) external view returns (IndexInfo memory) {
        if (!indexRegistry[indexId].isActive) revert IndexNotActive(indexId);
        return indexRegistry[indexId];
    }
    
    /**
     * @dev Get source URL for an index
     */
    function getSourceUrl(uint256 indexId) external view returns (string memory) {
        if (!indexRegistry[indexId].isActive) revert IndexNotActive(indexId);
        return indexRegistry[indexId].sourceUrl;
    }

    /**
     * @dev Register an order condition manually
     */
    function registerOrderCondition(
        bytes32 orderHash,
        uint256 indexId,
        ComparisonOperator operator,
        uint256 thresholdValue
    ) external {
        if (!indexRegistry[indexId].isActive) revert IndexNotActive(indexId);
        
        orderConditions[orderHash] = OrderCondition({
            indexId: indexId,
            operator: operator,
            thresholdValue: thresholdValue,
            registeredAt: block.timestamp,
            isActive: true
        });

        emit OrderConditionRegistered(orderHash, indexId, operator, thresholdValue);
    }

    /**
     * @dev Validate if an order condition is currently met
     */
    function validateOrderCondition(bytes32 orderHash) external view returns (bool) {
        return _validateCondition(orderHash);
    }

    /**
     * @dev Get order condition details
     */
    function getOrderCondition(bytes32 orderHash) external view returns (
        uint256 indexId,
        ComparisonOperator operator,
        uint256 thresholdValue
    ) {
        OrderCondition memory condition = orderConditions[orderHash];
        return (condition.indexId, condition.operator, condition.thresholdValue);
    }
    
    /**
     * @dev Get index information (tuple version for backward compatibility)
     */
    function getIndexInfoTuple(uint256 indexId) external view returns (
        string memory name,
        string memory description,
        address oracle,
        address creator,
        bool isActive,
        uint256 createdAt
    ) {
        IndexInfo memory index = indexRegistry[indexId];
        return (index.name, index.description, index.oracle, index.creator, index.isActive, index.createdAt);
    }
    
    /**
     * @dev Get all indices created by a user
     */
    function getUserIndices(address user) external view returns (uint256[] memory) {
        return userIndices[user];
    }
    
    /**
     * @dev Get current value from index oracle
     */
    function getIndexValue(uint256 indexId) external view returns (uint256 value, uint256 timestamp) {
        return _getOracleValue(indexId);
    }

    /**
     * @dev Set default oracle
     */
    function setDefaultOracle(address oracle) external onlyOwner {
        defaultOracle = oracle;
    }

    /**
     * @dev Internal function to validate condition
     */
    function _validateCondition(bytes32 orderHash) internal view returns (bool) {
        OrderCondition memory condition = orderConditions[orderHash];
        if (!condition.isActive) return false;

        (uint256 currentValue,) = _getOracleValue(condition.indexId);
        return _compareValues(currentValue, condition.operator, condition.thresholdValue);
    }

    /**
     * @dev Internal function to get oracle value
     */
    function _getOracleValue(uint256 indexId) internal view returns (uint256, uint256) {
        IndexInfo memory index = indexRegistry[indexId];
        if (!index.isActive) revert IndexNotActive(indexId);
        
        address oracle = index.oracle;
        if (oracle == address(0)) {
            oracle = defaultOracle;
        }
        
        if (oracle == address(0)) revert InvalidOracle();
        
        return IIndexOracle(oracle).getIndexValue(indexId);
    }

    /**
     * @dev Internal function to compare values based on operator
     */
    function _compareValues(uint256 currentValue, ComparisonOperator operator, uint256 thresholdValue) internal pure returns (bool) {
        if (operator == ComparisonOperator.GREATER_THAN) {
            return currentValue > thresholdValue;
        } else if (operator == ComparisonOperator.LESS_THAN) {
            return currentValue < thresholdValue;
        } else if (operator == ComparisonOperator.GREATER_EQUAL) {
            return currentValue >= thresholdValue;
        } else if (operator == ComparisonOperator.LESS_EQUAL) {
            return currentValue <= thresholdValue;
        } else if (operator == ComparisonOperator.EQUAL) {
            // Allow 0.1% tolerance for equality
            uint256 tolerance = thresholdValue / 1000;
            return currentValue >= thresholdValue - tolerance && currentValue <= thresholdValue + tolerance;
        }
        return false;
    }

    /**
     * @dev Internal function to register condition from extraData
     */
    function _registerConditionFromData(bytes32 orderHash, bytes calldata extraData) internal {
        // Decode extraData: indexId (32 bytes) + operator (1 byte) + thresholdValue (32 bytes)
        require(extraData.length >= 65, "Invalid extraData length");
        
        uint256 indexId = abi.decode(extraData[0:32], (uint256));
        uint8 operator = uint8(extraData[32]);
        uint256 thresholdValue = abi.decode(extraData[33:65], (uint256));
        
        if (!indexRegistry[indexId].isActive) revert IndexNotActive(indexId);

        orderConditions[orderHash] = OrderCondition({
            indexId: indexId,
            operator: ComparisonOperator(operator),
            thresholdValue: thresholdValue,
            registeredAt: block.timestamp,
            isActive: true
        });

        emit OrderConditionRegistered(orderHash, indexId, ComparisonOperator(operator), thresholdValue);
    }
}