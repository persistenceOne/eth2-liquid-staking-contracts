//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICoreRef.sol";

/// @title Oracle interface
/// @author Ankit Parashar
interface IKeysManager {

    enum State { INVALID, VALID, ACTIVATED }

    struct Validator {
        State state;
        bytes signature;
        bool used;
        address nodeOperator;
    }

    function validators(bytes calldata publicKey) external returns (Validator memory);

    function addValidator(Validator calldata validator) external;


}