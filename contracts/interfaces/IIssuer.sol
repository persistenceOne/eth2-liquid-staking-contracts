//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Issuer interface
/// @author Ankit Parashar
interface IIssuer {

    event SetMinActivationDeposit(uint256 _minActivatingDeposit);
    event SetPendingValidatorsLimit(uint256 _pendingValidatorsLimit);
    event UpdatePendingValidators(uint256 _pendingValidators);
    event ActivatePendingDeposit(address indexed user, uint256 validatorIndex, uint256 amount,uint256 block_time);
    event AddPendingDeposit(address indexed user, uint256 validatorIndex, uint256 amount,uint256 block_time);
    event Stake(address indexed user,uint256 amount,uint256 block_time);
    function updatePendingValidator(uint256 newActiveValidators) external;

    function pendingValidators() external view returns (uint256);

}