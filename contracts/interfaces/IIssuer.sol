//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Issuer interface
/// @author Ankit Parashar
interface IIssuer {

    function updatePendingValidator(uint256 newActiveValidators) external;

}