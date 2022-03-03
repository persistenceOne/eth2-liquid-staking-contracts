//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Issuer interface
/// @author Ankit Parashar
interface IIssuer {

    event SetMinActivationDeposit(uint256 _minActivatingDeposit);
    event SetPendingValidatorsLimit(uint256 _pendingValidatorsLimit);
    event UpdatePendingValidators(uint256 _pendingValidators);

    function updatePendingValidator(uint256 newActiveValidators) external;

    function pendingValidators() external view returns (uint256);

}