//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IStakingPool.sol";

contract DummyStakingPool is IStakingPool {

    function slash(uint256 newSupply) external override {
        // 
    }

}