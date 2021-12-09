//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICoreRef.sol";

/// @title KeysManager interface
/// @author Ankit Parashar
interface IKeysManager {

    enum State { INVALID, VALID, ACTIVATED }

    struct Validator {
        State state;
        bytes signature;
        address nodeOperator;
        bytes32 deposit_root;
    }

    function validators(bytes calldata publicKey) external view returns (Validator memory);

    function addValidator(bytes calldata publicKey, bytes calldata signature) external;

    function activateValidator(bytes calldata publicKey) external;
}