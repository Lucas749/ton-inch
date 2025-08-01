// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./I1inch.sol";

/**
 * @title ILimitOrderProtocol
 * @notice Interface for the real 1inch Limit Order Protocol
 */
interface ILimitOrderProtocol {
    
    /**
     * @notice Posts a new limit order to the protocol
     * @param order The order struct
     * @param extension Extension data for the order
     * @return orderHash The hash of the posted order
     */
    function postOrder(
        IOrderMixin.Order calldata order,
        bytes calldata extension
    ) external returns (bytes32 orderHash);

    /**
     * @notice Fills a posted limit order
     * @param order The order to fill
     * @param extension Extension data 
     * @param signature Maker's signature
     * @param interaction Interaction data
     * @param makingAmount Amount of maker asset to take
     * @param takingAmount Amount of taker asset to give
     * @param skipPermitAndHooks Whether to skip permit and hooks
     * @return actualMakingAmount Actual amount of maker asset taken
     * @return actualTakingAmount Actual amount of taker asset given
     * @return orderHash Hash of the filled order
     */
    function fillOrder(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes calldata signature,
        bytes calldata interaction,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 skipPermitAndHooks
    ) external returns (uint256 actualMakingAmount, uint256 actualTakingAmount, bytes32 orderHash);

    /**
     * @notice Cancels a posted order
     * @param makerTraits The maker traits of the order to cancel
     * @param orderHash Hash of the order to cancel
     */
    function cancelOrder(MakerTraits makerTraits, bytes32 orderHash) external;

    /**
     * @notice Gets the hash of an order
     * @param order The order to hash
     * @return orderHash The order hash
     */
    function getOrderHash(IOrderMixin.Order calldata order) external view returns (bytes32 orderHash);

    /**
     * @notice Checks if an order is valid and fillable
     * @param order The order to check
     * @param extension Extension data
     * @param orderHash Hash of the order
     * @return isValid Whether the order is valid
     */
    function isValidOrder(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash
    ) external view returns (bool isValid);

    /**
     * @notice Gets the remaining fillable amount for an order
     * @param orderHash Hash of the order
     * @return remainingAmount Remaining fillable amount
     */
    function remainingAmount(bytes32 orderHash) external view returns (uint256 remainingAmount);

    // Events
    event OrderPosted(
        bytes32 indexed orderHash,
        address indexed maker,
        IOrderMixin.Order order,
        bytes extension
    );

    event OrderFilled(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed taker,
        uint256 makingAmount,
        uint256 takingAmount
    );

    event OrderCancelled(
        bytes32 indexed orderHash,
        address indexed maker
    );
}