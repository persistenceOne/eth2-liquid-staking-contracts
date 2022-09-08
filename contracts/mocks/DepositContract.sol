//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IDepositContract.sol";

contract DummyDepositContract{

    function deposit(
        bytes calldata pubkey,
        bytes calldata withdrawal_credentials,
        bytes calldata signature,
        bytes32 deposit_data_root
    ) external payable{
        //
    }

    function balance() public view returns(uint256) {
        return address(this).balance;
    }
}