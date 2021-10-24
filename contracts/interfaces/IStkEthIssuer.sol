//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICoreRef.sol";

/// @title StkEthIssuer interface
/// @author Ankit Parashar
interface IStkEthIssuer is ICoreRef{

    function stake() payable external returns(uint256 amount);

}