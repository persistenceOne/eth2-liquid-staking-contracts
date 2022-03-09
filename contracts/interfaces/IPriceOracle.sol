//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPriceOracle {

    // returns price of pstake tokens in terms of stkEth
    function price() external returns (uint256);

}