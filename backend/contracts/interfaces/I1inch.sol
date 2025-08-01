// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title I1inch
 * @dev Minimal interfaces needed from 1inch protocol for our integration
 */

library AddressLib {
    function get(uint256 a) internal pure returns (address) {
        return address(uint160(a));
    }
    
    function toAddress(address a) internal pure returns (uint256) {
        return uint256(uint160(a));
    }
}

type MakerTraits is uint256;

library MakerTraitsLib {
    function hasFlag(MakerTraits makerTraits, uint256 flag) internal pure returns (bool) {
        return (MakerTraits.unwrap(makerTraits) >> flag) & 1 == 1;
    }
}

interface IOrderMixin {
    struct Order {
        uint256 salt;
        uint256 maker;
        uint256 receiver;
        uint256 makerAsset;
        uint256 takerAsset;
        uint256 makingAmount;
        uint256 takingAmount;
        MakerTraits makerTraits;
    }
}

interface IPreInteraction {
    function preInteraction(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external;
}