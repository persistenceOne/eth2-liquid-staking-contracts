//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract pStake is ERC20 {

    constructor () public 
    ERC20("pStake", "pStake"){
        _mint(msg.sender, 1000000e18);
    }


}