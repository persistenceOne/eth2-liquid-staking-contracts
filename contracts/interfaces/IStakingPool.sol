//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICoreRef.sol";

/// @title Staking Pool interface
/// @author Ankit Parashar
interface IStakingPool is ICoreRef {
    
    function slash(uint256 amount) external;

}