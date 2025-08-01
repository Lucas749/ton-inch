# 🚀 Smart Contract API Reference

This document provides a complete reference for all public functions available in the `IndexPreInteraction` and `IndexLimitOrderFactory` smart contracts.

---

## 📋 `IndexPreInteraction.sol` - The Conditions Contract

This contract manages the creation of custom indices and the validation of order conditions.

### ✍️ **Write Functions (State-Changing)**

#### `registerIndex`
Registers a new custom index in the system.
```solidity
function registerIndex(string calldata name, string calldata description, address oracle) external returns (uint256 indexId)
```
- **`name`**: A short name for the index (e.g., "APPLE_STOCK").
- **`description`**: A longer description of what the index tracks.
- **`oracle`**: The address of the oracle contract that will provide data for this index.
- **Returns**: The unique `indexId` for your new index.
- **`cast` Example:**
  ```bash
  cast send <PREINTERACTION_ADDRESS> "registerIndex(string,string,address)" "My Index" "Tracks my data" <ORACLE_ADDRESS> --private-key $PRIVATE_KEY
  ```

#### `updateIndexOracle`
Updates the oracle for an existing index. Only the index creator or contract owner can call this.
```solidity
function updateIndexOracle(uint256 indexId, address newOracle) external
```
- **`indexId`**: The ID of the index to update.
- **`newOracle`**: The address of the new oracle contract.
- **`cast` Example:**
  ```bash
  cast send <PREINTERACTION_ADDRESS> "updateIndexOracle(uint256,address)" 6 "0x...newOracleAddress" --private-key $PRIVATE_KEY
  ```

#### `deactivateIndex`
Deactivates an index, preventing it from being used in new orders.
```solidity
function deactivateIndex(uint256 indexId) external
```
- **`indexId`**: The ID of the index to deactivate.
- **`cast` Example:**
  ```bash
  cast send <PREINTERACTION_ADDRESS> "deactivateIndex(uint256)" 6 --private-key $PRIVATE_KEY
  ```

#### `registerOrderCondition`
Manually links an order hash to a condition. `IndexLimitOrderFactory` does this automatically.
```solidity
function registerOrderCondition(bytes32 orderHash, uint256 indexId, ComparisonOperator operator, uint256 thresholdValue) external
```
- **`orderHash`**: The hash of the 1inch order.
- **`indexId`**: The ID of the index to check.
- **`operator`**: The comparison operator enum (0=GT, 1=LT, 2=GTE, 3=LTE, 4=EQ).
- **`thresholdValue`**: The value to compare against.

---

### 🧐 **Read Functions (View)**

#### `getIndexInfo`
Retrieves all metadata for a specific index.
```solidity
function getIndexInfo(uint256 indexId) external view returns (string name, string description, address oracle, address creator, bool isActive, uint256 createdAt)
```
- **`cast` Example:**
  ```bash
  cast call <PREINTERACTION_ADDRESS> "getIndexInfo(uint256)(string,string,address,address,bool,uint256)" 6
  ```

#### `getOrderCondition`
Retrieves the condition details for a given order hash.
```solidity
function getOrderCondition(bytes32 orderHash) external view returns (uint256 indexId, ComparisonOperator operator, uint256 thresholdValue)
```
- **`cast` Example:**
  ```bash
  cast call <PREINTERACTION_ADDRESS> "getOrderCondition(bytes32)(uint256,uint8,uint256)" <ORDER_HASH>
  ```

#### `getIndexValue`
Gets the current value and timestamp for an index from its oracle.
```solidity
function getIndexValue(uint256 indexId) external view returns (uint256 value, uint256 timestamp)
```
- **`cast` Example:**
  ```bash
  cast call <PREINTERACTION_ADDRESS> "getIndexValue(uint256)(uint256,uint256)" 2
  ```

#### `validateOrderCondition`
Checks if an order's condition is currently met. Returns `true` or `false`.
```solidity
function validateOrderCondition(bytes32 orderHash) external view returns (bool)
```
- **`cast` Example:**
  ```bash
  cast call <PREINTERACTION_ADDRESS> "validateOrderCondition(bytes32)" <ORDER_HASH>
  ```

#### `getUserIndices`
Returns an array of all index IDs created by a specific user.
```solidity
function getUserIndices(address user) external view returns (uint256[] memory)
```
- **`cast` Example:**
  ```bash
  cast call <PREINTERACTION_ADDRESS> "getUserIndices(address)" <USER_ADDRESS>
  ```

---

## 🏭 `IndexLimitOrderFactory.sol` - The Trading Contract

This contract is a helper to easily create 1inch-compatible limit orders with index-based conditions.

### ✍️ **Write Functions (State-Changing)**

#### `createIndexOrder`
The main function to create a conditional limit order.
```solidity
function createIndexOrder(
    uint256 salt,
    address maker,
    address receiver,
    address makerAsset,
    address takerAsset,
    uint256 makingAmount,
    uint256 takingAmount,
    uint256 indexId,
    IndexPreInteraction.ComparisonOperator operator,
    uint256 thresholdValue,
    uint40 expiry
) external returns (IOrderMixin.Order memory order, bytes memory extension)
```
- **Parameters**: Standard 1inch order parameters plus the condition details (`indexId`, `operator`, `thresholdValue`).
- **Returns**: The formatted 1inch `order` and the `extension` data needed for the preInteraction call.
- **Note**: This function handles everything: creating the 1inch order structure, setting the preInteraction flag, encoding the condition data, and registering the condition with `IndexPreInteraction`.

---

### 🧐 **Read Functions (View/Pure)**

#### `getOrderHash`
Calculates the EIP-712 hash for a given order structure.
```solidity
function getOrderHash(IOrderMixin.Order memory order) public pure returns (bytes32)
```
- **Note**: This is a utility function. The true order hash is emitted in the `IndexOrderCreated` event when you call `createIndexOrder`.

#### `encodePreInteractionData`
A helper to encode just the preInteraction data part of the order extension.
```solidity
function encodePreInteractionData(uint256 indexId, IndexPreInteraction.ComparisonOperator operator, uint256 thresholdValue) external view returns (bytes memory preInteractionData)
```

---

### 📊 **Enums & Constants**

#### `ComparisonOperator`
- `GREATER_THAN` = 0
- `LESS_THAN` = 1
- `GREATER_EQUAL` = 2
- `LESS_EQUAL` = 3
- `EQUAL` = 4

#### Predefined Index IDs (Constants in `IndexPreInteraction`)
- `INFLATION_RATE` = 0
- `ELON_FOLLOWERS` = 1
- `BTC_PRICE` = 2
- `VIX_INDEX` = 3
- `UNEMPLOYMENT_RATE` = 4
- `TESLA_STOCK` = 5