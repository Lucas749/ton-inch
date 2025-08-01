// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./interfaces/I1inch.sol";

/**
 * @title IndexPreInteraction
 * @notice PreInteraction contract for 1inch limit orders based on external index conditions
 * @dev This contract validates index-based conditions before allowing order execution
 */

interface IIndexOracle {
    function getIndexValue(uint8 indexType) external view returns (uint256 value, uint256 timestamp);
    function isValidIndex(uint8 indexType) external view returns (bool);
}

contract IndexPreInteraction is IPreInteraction {
    using AddressLib for uint256;
    using AddressLib for address;

    // Index types supported by the system
    enum IndexType {
        INFLATION_RATE,
        ELON_FOLLOWERS,
        BTC_PRICE,
        VIX_INDEX,
        UNEMPLOYMENT_RATE,
        TESLA_STOCK
    }

    // Comparison operators for conditions
    enum ComparisonOperator {
        GREATER_THAN,
        LESS_THAN,
        GREATER_EQUAL,
        LESS_EQUAL,
        EQUAL
    }

    // Structure to store order conditions
    struct OrderCondition {
        IndexType indexType;
        ComparisonOperator operator;
        uint256 thresholdValue;
        uint256 registeredAt;
        bool isActive;
    }

    // State variables
    mapping(bytes32 => OrderCondition) public orderConditions;
    mapping(IndexType => address) public indexOracles;
    address public owner;
    address public defaultOracle;

    // Events
    event OrderConditionRegistered(bytes32 indexed orderHash, IndexType indexType, ComparisonOperator operator, uint256 thresholdValue);
    event OrderConditionValidated(bytes32 indexed orderHash, bool isValid, uint256 currentValue);
    event OracleUpdated(IndexType indexType, address newOracle);

    // Errors
    error Unauthorized();
    error InvalidCondition();
    error ConditionNotMet(uint256 currentValue, uint256 thresholdValue);
    error InvalidOracle();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _defaultOracle) {
        owner = msg.sender;
        defaultOracle = _defaultOracle;
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
            (uint256 currentValue,) = _getOracleValue(condition.indexType);
            emit OrderConditionValidated(orderHash, false, currentValue);
            revert ConditionNotMet(currentValue, condition.thresholdValue);
        }

        emit OrderConditionValidated(orderHash, true, 0);
    }

    /**
     * @dev Register an order condition manually
     */
    function registerOrderCondition(
        bytes32 orderHash,
        IndexType indexType,
        ComparisonOperator operator,
        uint256 thresholdValue
    ) external {
        orderConditions[orderHash] = OrderCondition({
            indexType: indexType,
            operator: operator,
            thresholdValue: thresholdValue,
            registeredAt: block.timestamp,
            isActive: true
        });

        emit OrderConditionRegistered(orderHash, indexType, operator, thresholdValue);
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
        IndexType indexType,
        ComparisonOperator operator,
        uint256 thresholdValue
    ) {
        OrderCondition memory condition = orderConditions[orderHash];
        return (condition.indexType, condition.operator, condition.thresholdValue);
    }

    /**
     * @dev Set oracle for specific index type
     */
    function setOracle(IndexType indexType, address oracle) external onlyOwner {
        indexOracles[indexType] = oracle;
        emit OracleUpdated(indexType, oracle);
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

        (uint256 currentValue,) = _getOracleValue(condition.indexType);
        return _compareValues(currentValue, condition.operator, condition.thresholdValue);
    }

    /**
     * @dev Internal function to get oracle value
     */
    function _getOracleValue(IndexType indexType) internal view returns (uint256, uint256) {
        address oracle = indexOracles[indexType];
        if (oracle == address(0)) {
            oracle = defaultOracle;
        }
        
        if (oracle == address(0)) revert InvalidOracle();
        
        return IIndexOracle(oracle).getIndexValue(uint8(indexType));
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
        // Decode extraData: indexType (1 byte) + operator (1 byte) + thresholdValue (32 bytes)
        require(extraData.length >= 34, "Invalid extraData length");
        
        uint8 indexType = uint8(extraData[0]);
        uint8 operator = uint8(extraData[1]);
        uint256 thresholdValue = abi.decode(extraData[2:34], (uint256));

        orderConditions[orderHash] = OrderCondition({
            indexType: IndexType(indexType),
            operator: ComparisonOperator(operator),
            thresholdValue: thresholdValue,
            registeredAt: block.timestamp,
            isActive: true
        });

        emit OrderConditionRegistered(orderHash, IndexType(indexType), ComparisonOperator(operator), thresholdValue);
    }
}