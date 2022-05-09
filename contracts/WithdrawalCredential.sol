//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract WithdrawalCredential is OwnableUpgradeable {

    fallback() payable external {
        require(false);
    }


}