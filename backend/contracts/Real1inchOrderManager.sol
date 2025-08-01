// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IndexPreInteraction.sol";

// Import types from our existing contracts to avoid conflicts
import "./interfaces/I1inch.sol";

// Additional 1inch types we need
type TakerTraits is uint256;

// Interface for the real 1inch protocol
interface IRealLimitOrderProtocol {
    function fillOrderArgs(
        IOrderMixin.Order calldata order,
        bytes32 r,
        bytes32 vs,
        uint256 amount,
        TakerTraits takerTraits,
        bytes calldata args
    ) external payable returns(uint256 makingAmount, uint256 takingAmount, bytes32 orderHash);

    function cancelOrder(MakerTraits makerTraits, bytes32 orderHash) external;
    function hashOrder(IOrderMixin.Order calldata order) external view returns(bytes32 orderHash);
    function remainingInvalidatorForOrder(address maker, bytes32 orderHash) external view returns(uint256 remaining);
    function DOMAIN_SEPARATOR() external view returns(bytes32);
}

/**
 * @title Real1inchOrderManager
 * @notice Manages index-based limit orders using the REAL 1inch protocol
 * @dev Integrates with 1inch protocol at 0xE53136D9De56672e8D2665C98653AC7b8A60Dc44
 */
contract Real1inchOrderManager {
    using AddressLib for address;

    IRealLimitOrderProtocol public immutable limitOrderProtocol;
    IndexPreInteraction public immutable preInteractionContract;
    
    // MakerTraits flags (from 1inch MakerTraitsLib)
    uint256 private constant _PRE_INTERACTION_CALL_FLAG = 1 << 252;
    uint256 private constant _HAS_EXTENSION_FLAG = 1 << 249;
    uint256 private constant _NO_PARTIAL_FILLS_FLAG = 1 << 255;
    
    event IndexOrderCreated(
        bytes32 indexed orderHash,
        address indexed maker,
        uint256 indexed indexId,
        IndexPreInteraction.ComparisonOperator operator,
        uint256 thresholdValue,
        IOrderMixin.Order order
    );
    
    event OrderFilledOnRealProtocol(
        bytes32 indexed orderHash,
        uint256 makingAmount,
        uint256 takingAmount
    );

    constructor(
        address _limitOrderProtocol,
        address _preInteractionContract
    ) {
        limitOrderProtocol = IRealLimitOrderProtocol(_limitOrderProtocol);
        preInteractionContract = IndexPreInteraction(_preInteractionContract);
    }

    /**
     * @notice Creates a real 1inch order with index condition
     * @param salt Unique salt for the order
     * @param maker Address of order maker
     * @param receiver Address to receive maker asset (0x0 = maker)
     * @param makerAsset Token maker is providing
     * @param takerAsset Token maker wants
     * @param makingAmount Amount of maker asset
     * @param takingAmount Amount of taker asset
     * @param indexId ID of index to monitor
     * @param operator Comparison operator
     * @param thresholdValue Threshold value for condition
     * @param expiry Expiration timestamp (0 = no expiry)
     * @return order The 1inch order struct
     * @return orderHash Hash of the created order
     */
    function createRealIndexOrder(
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
    ) external returns (IOrderMixin.Order memory order, bytes32 orderHash) {
        
        // Create MakerTraits with PreInteraction flag and expiry
        uint256 traits = _PRE_INTERACTION_CALL_FLAG | _HAS_EXTENSION_FLAG;
        
        // Disable partial fills for simplicity
        traits |= _NO_PARTIAL_FILLS_FLAG;
        
        // Set expiry if provided (bits 80-119)
        if (expiry > 0) {
            traits |= (uint256(expiry) << 80);
        }
        
        MakerTraits makerTraits = MakerTraits.wrap(traits);
        
        // Create the order using 1inch format
        order = IOrderMixin.Order({
            salt: salt,
            maker: maker.toAddress(),
            receiver: receiver != address(0) ? receiver.toAddress() : maker.toAddress(),
            makerAsset: makerAsset.toAddress(),
            takerAsset: takerAsset.toAddress(),
            makingAmount: makingAmount,
            takingAmount: takingAmount,
            makerTraits: makerTraits
        });
        
        // Get order hash from the real protocol
        orderHash = limitOrderProtocol.hashOrder(order);
        
        // Pre-register the condition in our PreInteraction contract
        preInteractionContract.registerOrderCondition(
            orderHash,
            indexId,
            operator,
            thresholdValue
        );
        
        emit IndexOrderCreated(
            orderHash,
            maker,
            indexId,
            operator,
            thresholdValue,
            order
        );
        
        return (order, orderHash);
    }

    /**
     * @notice Fills a real 1inch order
     * @param order The order to fill
     * @param r R component of maker's signature
     * @param vs VS component of maker's signature
     * @param amount Amount to fill (0 = fill completely)
     * @param args Extension arguments (target, extension, interaction)
     * @return makingAmount Actual amount of maker asset transferred
     * @return takingAmount Actual amount of taker asset transferred
     * @return orderHash Hash of the filled order
     */
    function fillRealOrder(
        IOrderMixin.Order calldata order,
        bytes32 r,
        bytes32 vs,
        uint256 amount,
        bytes calldata args
    ) external payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash) {
        
        // Create TakerTraits (0 = default behavior)
        TakerTraits takerTraits = TakerTraits.wrap(0);
        
        // Fill the order on the real 1inch protocol
        (makingAmount, takingAmount, orderHash) = limitOrderProtocol.fillOrderArgs{value: msg.value}(
            order,
            r,
            vs,
            amount,
            takerTraits,
            args
        );
        
        emit OrderFilledOnRealProtocol(orderHash, makingAmount, takingAmount);
        
        return (makingAmount, takingAmount, orderHash);
    }

    /**
     * @notice Cancels a real 1inch order
     * @param makerTraits Order maker traits
     * @param orderHash Hash of the order to cancel
     */
    function cancelRealOrder(MakerTraits makerTraits, bytes32 orderHash) external {
        limitOrderProtocol.cancelOrder(makerTraits, orderHash);
    }

    /**
     * @notice Gets the hash of an order from the real protocol
     * @param order The order to hash
     * @return orderHash The order hash
     */
    function getRealOrderHash(IOrderMixin.Order calldata order) external view returns (bytes32 orderHash) {
        return limitOrderProtocol.hashOrder(order);
    }

    /**
     * @notice Checks remaining amount for an order
     * @param maker Maker address
     * @param orderHash Order hash
     * @return remaining Remaining fillable amount
     */
    function getRemainingAmount(address maker, bytes32 orderHash) external view returns (uint256 remaining) {
        return limitOrderProtocol.remainingInvalidatorForOrder(maker, orderHash);
    }

    /**
     * @notice Helper to create extension data for preInteraction
     * @param indexId ID of index to monitor
     * @param operator Comparison operator
     * @param thresholdValue Threshold value for condition
     * @return extensionData Encoded extension data
     */
    function createExtensionData(
        uint256 indexId,
        IndexPreInteraction.ComparisonOperator operator,
        uint256 thresholdValue
    ) external view returns (bytes memory extensionData) {
        // Create preInteraction data
        bytes memory preInteractionData = abi.encodePacked(
            address(preInteractionContract),  // 20 bytes: target contract
            indexId,                         // 32 bytes: index ID
            uint8(operator),                 // 1 byte: operator  
            thresholdValue                   // 32 bytes: threshold
        );
        
        // Create extension with proper offsets for 1inch protocol
        // Extension format: [offsets (32 bytes)][data]
        // We only have PreInteractionData (field index 6)
        uint256 offsets = uint256(preInteractionData.length) << (8 * (31 - 6));
        
        extensionData = abi.encodePacked(
            offsets,                // 32 bytes: offsets
            preInteractionData      // Variable: preInteraction data
        );
        
        return extensionData;
    }

    /**
     * @notice Helper to create maker traits with proper flags
     * @param expiry Expiration timestamp (0 = no expiry)
     * @param allowPartialFills Whether to allow partial fills
     * @return makerTraits Formatted MakerTraits
     */
    function createMakerTraits(
        uint40 expiry,
        bool allowPartialFills
    ) external pure returns (MakerTraits makerTraits) {
        uint256 traits = _PRE_INTERACTION_CALL_FLAG | _HAS_EXTENSION_FLAG;
        
        // Set NO_PARTIAL_FILLS_FLAG if partial fills are not allowed (inverted logic)
        if (!allowPartialFills) {
            traits |= _NO_PARTIAL_FILLS_FLAG;
        }
        
        // Set expiry if provided (bits 80-119)
        if (expiry > 0) {
            traits |= (uint256(expiry) << 80);
        }
        
        return MakerTraits.wrap(traits);
    }
}