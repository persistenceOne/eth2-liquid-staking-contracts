//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/// @title Oracle interface
/// @author Ankit Parashar
interface IOracle{

    // To do
    struct NodeData {
        uint256 price;
    }

    function pricePerShare() external view returns (uint256);

    function activatedValidators() external view returns (uint256);

    function addOracleNode(address node) external;

    function oracleNodes() external returns (address[] memory);

    function pushData(uint64 latestEthBalance, uint256 latestNonce) external;
}