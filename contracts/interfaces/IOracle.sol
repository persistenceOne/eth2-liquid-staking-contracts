//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICoreRef.sol";

/// @title Oracle interface
/// @author Ankit Parashar
interface IOracle is ICoreRef {

    // To do
    struct NodeData {
        uint256 price;
    }

    function pricePerShare() external view returns (uint256);

    function addOracleNode(address node) external;

    function oracleNodes() external returns (address[] memory);

    function pushData(NodeData memory data) external;
}