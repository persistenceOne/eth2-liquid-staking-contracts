//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CoreRef.sol";

contract Issuer is CoreRef {

    uint256 public constant VALIDATOR_DEPOSIT = 32 ether;

    uint256 public pendingValidators;
    uint256 public minActivatingDeposit;
    uint256 public pendingValidatorsLimit;
    
    mapping(address => mapping(uint256 => uint256)) public override activations;

    constructor(address core) 
        CoreRef(core) 
    {


    }

    function mintStkEthForEth(uint256 amount, address user) internal {
        uint256 stkEthToMint = (amount * 1e18)/stkEth().pricePerShare();
        stkEth().mint(user, stkEthToMint);
    }

    function stake() payable public whenNotPaused {
        require(msg.value > 0, "Issuer: can't stake zero");


        if (msg.value <= minActivatingDeposit) {
            mintStkEthForEth(msg.value, msg.sender);
            return;
        }

        // mint tokens if current pending validators limit is not exceed
        uint256 _pendingValidators = pendingValidators.add((address(this).balance).div(VALIDATOR_DEPOSIT));
        uint256 _activatedValidators = activatedValidators; // gas savings
        uint256 validatorIndex = _activatedValidators.add(_pendingValidators);
        if (validatorIndex.mul(1e4) <= _activatedValidators.mul(pendingValidatorsLimit.add(1e4))) {
            mintStkEthForEth(msg.value, msg.sender);
        } else {
            // lock deposit amount until validator activated
            activations[msg.sender][validatorIndex] = activations[msg.sender][validatorIndex].add(msg.value);
        }


    }

}
