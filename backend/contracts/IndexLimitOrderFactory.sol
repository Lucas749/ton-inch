// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./interfaces/I1inch.sol";
import "./IndexPreInteraction.sol";

/**
 * @title IndexLimitOrderFactory
 * @notice Factory contract for creating index-based limit orders compatible with 1inch protocol
 * @dev This contract helps create properly formatted orders with PreInteraction flags and extension data
 */
contract IndexLimitOrderFactory {
    using MakerTraitsLib for MakerTraits;
    using AddressLib for address;

    IndexPreInteraction public immutable preInteractionContract;
    
    event IndexOrderCreated(
        bytes32 indexed orderHash,
        address indexed maker,
        uint256 indexed indexId,
        IndexPreInteraction.ComparisonOperator operator,
        uint256 thresholdValue
    );
    
    constructor(IndexPreInteraction _preInteractionContract) {
        preInteractionContract = _preInteractionContract;
    }
    
    /**
     * @dev Get the hash of an order (for testing/verification)
     */
    function getOrderHash(IOrderMixin.Order memory order) public pure returns (bytes32) {
        return keccak256(abi.encode(order));
    }
    
    /**
     * @notice Create a properly formatted 1inch order with index condition
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
     * @return order The formatted 1inch order
     * @return extension The extension data for preInteraction
     */
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
    ) external returns (IOrderMixin.Order memory order, bytes memory extension) {
        
        // Create makerTraits with PreInteraction flag and expiry
        uint256 traits = 0;
        
        // Set PRE_INTERACTION_CALL_FLAG (bit 252)
        traits |= (1 << 252);
        
        // Set HAS_EXTENSION_FLAG (bit 249) 
        traits |= (1 << 249);
        
        // Set expiry if provided (bits 80-119)
        if (expiry > 0) {
            traits |= (uint256(expiry) << 80);
        }
        
        MakerTraits makerTraits = MakerTraits.wrap(traits);
        
        // Create the order
        order = IOrderMixin.Order({
            salt: salt,
            maker: maker.toAddress(),
            receiver: receiver.toAddress(),
            makerAsset: makerAsset.toAddress(),
            takerAsset: takerAsset.toAddress(),
            makingAmount: makingAmount,
            takingAmount: takingAmount,
            makerTraits: makerTraits
        });
        
        // Create extension data with preInteraction target and data
        bytes memory preInteractionData = abi.encodePacked(
            address(preInteractionContract),  // 20 bytes: target contract
            indexId,                         // 32 bytes: index ID
            uint8(operator),                 // 1 byte: operator  
            thresholdValue                   // 32 bytes: threshold
        );
        
        // Create extension with proper offsets
        // Extension format: [offsets (32 bytes)][data]
        // We only have PreInteractionData (field index 6)
        uint256 offsets = uint256(preInteractionData.length) << (8 * (31 - 6)); // Offset for field 6
        
        extension = abi.encodePacked(
            offsets,                // 32 bytes: offsets
            preInteractionData      // Variable: preInteraction data
        );
        
        // Pre-register the condition for efficiency
        preInteractionContract.registerOrderCondition(
            _getOrderHash(order),
            indexId,
            operator,
            thresholdValue
        );
        
        emit IndexOrderCreated(
            _getOrderHash(order),
            maker,
            indexId,
            operator,
            thresholdValue
        );
    }
    
    /**
     * @notice Helper to encode just the preInteraction data for existing orders
     * @param indexId ID of index to monitor
     * @param operator Comparison operator
     * @param thresholdValue Threshold value for condition
     * @return preInteractionData Encoded data for preInteraction
     */
    function encodePreInteractionData(
        uint256 indexId,
        IndexPreInteraction.ComparisonOperator operator,
        uint256 thresholdValue
    ) external view returns (bytes memory preInteractionData) {
        return abi.encodePacked(
            address(preInteractionContract),  // 20 bytes: target contract
            indexId,                         // 32 bytes: index ID
            uint8(operator),                 // 1 byte: operator
            thresholdValue                   // 32 bytes: threshold
        );
    }
    
    /**
     * @notice Helper to create MakerTraits with PreInteraction flags
     * @param expiry Expiration timestamp (0 = no expiry)
     * @param allowPartialFills Whether to allow partial fills
     * @param allowMultipleFills Whether to allow multiple fills
     * @return makerTraits Formatted MakerTraits
     */
    function createMakerTraits(
        uint40 expiry,
        bool allowPartialFills,
        bool allowMultipleFills
    ) external pure returns (MakerTraits makerTraits) {
        uint256 traits = 0;
        
        // Set PRE_INTERACTION_CALL_FLAG (bit 252)
        traits |= (1 << 252);
        
        // Set HAS_EXTENSION_FLAG (bit 249)
        traits |= (1 << 249);
        
        // Set partial fills flag (bit 255) - inverted logic
        if (!allowPartialFills) {
            traits |= (1 << 255);
        }
        
        // Set multiple fills flag (bit 254)
        if (allowMultipleFills) {
            traits |= (1 << 254);
        }
        
        // Set expiry if provided (bits 80-119)
        if (expiry > 0) {
            traits |= (uint256(expiry) << 80);
        }
        
        return MakerTraits.wrap(traits);
    }
    
    /**
     * @notice Get order hash for pre-registration (simplified version)
     * @param order The order to hash
     * @return orderHash Simple hash of order data
     */
    function _getOrderHash(IOrderMixin.Order memory order) internal pure returns (bytes32 orderHash) {
        // Simplified hash - in production would use proper EIP-712 with domain separator
        return keccak256(abi.encode(
            order.salt,
            order.maker,
            order.receiver,
            order.makerAsset,
            order.takerAsset,
            order.makingAmount,
            order.takingAmount,
            order.makerTraits
        ));
    }
}