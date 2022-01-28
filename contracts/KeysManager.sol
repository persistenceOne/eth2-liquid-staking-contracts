//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CoreRef.sol";
import "./interfaces/IKeysManager.sol";
import { IStakingPool } from "./interfaces/IStakingPool.sol";

/// @title Keys manager contract
/// @author ...
/// @notice Contract for on managing public keys, signatures
contract KeysManager is IKeysManager, CoreRef {
    mapping(bytes => Validator) public _validators;

    uint256 public constant PUBKEY_LENGTH = 48;
    uint256 public constant SIGNATURE_LENGTH = 96;
    uint256 public constant VALIDATOR_DEPOSIT = 32 ether;
    bytes32 depositRoot;
    bytes32 withdrawal_credentials;

    event AddValidator(bytes publicKey, bytes signature, address nodeOperator);
    event ActivateValidator(bytes[] publicKey);
    event DepositValidator(bytes publicKey);

    mapping (address => uint256) public nodeOperatorValidatorCount;



    /// @notice constructor to initialize Core
    /// @param _core address of the core
    constructor(address _core) public CoreRef(_core) {}



    /// @notice function that returns public key of a particular validator.
    /// @param publicKey public key of the validator.
    function validators(bytes calldata publicKey)
        external
        view
        override
        returns (Validator memory)
    {
        return _validators[publicKey];
    }


    /// @notice function to add a new validator
    /// @param publicKey public key of the validator
    /// @param signature ...
    /// @param nodeOperator address of the node operator
    function addValidator(
        bytes calldata publicKey,
        bytes calldata signature,
        address nodeOperator
    ) external override onlyKeyAdmin {
        Validator memory _validator = _validators[publicKey];
        require(
            _validator.state == State.INVALID,
            "KeysManager: validator already exist"
        );
        // require(_isEmptySigningKey(publicKey), "KeysManager: empty signing key");
        // _validator = validator;

        bytes32 depositRoot = verifyDepositDataRoot(publicKey, signature);
        _validator.state = State.VALID;
        _validator.signature = signature;
        _validator.nodeOperator = nodeOperator;
        _validator.deposit_root = depositRoot;

        _validators[publicKey] = _validator;
        emit AddValidator(publicKey, signature, nodeOperator);
    }




    /// @notice function for activating the status of an array of validator public keys
    /// @param publicKeys public keys array of validators.

    function activateValidator(bytes[] memory publicKeys) external override {
        require(
            msg.sender == core().oracle(),
            "KeysManager: Only issuer can activate"
        );
        for (uint256 i = 0; i < publicKeys.length; i++) {
            Validator storage validator = _validators[publicKeys[i]];
            if (validator.state == State.ACTIVATED) {
                revert("Validator already activated");
            }
            require(validator.state == State.VALID, "KeysManager: Invalid Key");
            validator.state = State.ACTIVATED;
            emit ActivateValidator(publicKeys);
        }
    }



    /// @notice set status of validator to deposited
    /// @param publicKey public key of the validator.
    function depositValidator(bytes memory publicKey) external override {
        require(
            msg.sender == core().issuer(),
            "KeysManager: Only issuer can activate"
        );

        Validator storage validator = _validators[publicKey];
        
        require(
            IStakingPool(core().validatorPool()).numOfValidatorAllowed(validator.nodeOperator) > 
            nodeOperatorValidatorCount[validator.nodeOperator],
            "KeysManager: validator deposit not added by node operator"
        );
        
        require(
            validator.state == State.ACTIVATED,
            "KeysManager: Key not activated"
        );
        validator.state = State.DEPOSITED;
        nodeOperatorValidatorCount[validator.nodeOperator] += 1;
        emit DepositValidator(publicKey);
    }


    /// @notice function to return the deposit data root node
    /// @return node is deposit root node 
    function verifyDepositDataRoot(
        bytes calldata pubKey,
        bytes calldata signature
    ) internal returns (bytes32) {
        uint256 deposit_amount = VALIDATOR_DEPOSIT / 1 gwei;
        bytes memory amount = to_little_endian_64(uint64(deposit_amount));
        // withdrawalCredsBytes32 = bytes32(uint256(uint160((core().withdrawalCredential()))) << 96);
        // bytes memory withdrawal_credentials = abi.encode(core().withdrawalCredential());

        withdrawal_credentials = core().withdrawalCredential();
        // withdrawlCreds =  withdrawal_credentials;
        bytes32 pubkey_root = sha256(abi.encodePacked(pubKey, bytes16(0)));
        bytes32 signature_root = sha256(
            abi.encodePacked(
                sha256(abi.encodePacked(signature[:64])),
                sha256(abi.encodePacked(signature[64:], bytes32(0)))
            )
        );
        bytes32 node = sha256(
            abi.encodePacked(
                sha256(abi.encodePacked(pubkey_root, withdrawal_credentials)),
                sha256(abi.encodePacked(amount, bytes24(0), signature_root))
            )
        );
        require(pubKey.length == 48, "DepositContract: invalid pubkey length");
        require(
            signature.length == 96,
            "DepositContract: invalid signature length"
        );
        require(
            withdrawal_credentials.length == 32,
            "DepositContract: invalid withdrawal_credentials length"
        );
        // Verify computed and expected deposit data roots match
        // require(node == depositRoot, "KeysManager: reconstructed DepositData does not match supplied deposit_data_root");
        depositRoot = node;
        return node;
    }


    /// @notice function for viewing deposit root node
    /// @return depositRoot is the root node of deposit data.
    function depositRootView() external view returns (bytes32) {
        return depositRoot;
    }



    /// @notice function to convert address to Bytes
    /// @param a address to be converted to bytes.
    function toBytes(address a) public pure returns (bytes memory b) {
        assembly {
            let m := mload(0x40)
            a := and(a, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
            mstore(
                add(m, 20),
                xor(0x140000000000000000000000000000000000000000, a)
            )
            mstore(0x40, add(m, 52))
            b := m
        }
    }


    /// @notice function to convert to integer to little endian 64 bytes format.
    /// @param value is the integer number.
    /// @return ret is 8 byte array.
    function to_little_endian_64(uint64 value)
        internal
        pure
        returns (bytes memory ret)
    {
        ret = new bytes(8);
        bytes8 bytesValue = bytes8(value);
        // Byteswapping during copying to bytes.
        ret[0] = bytesValue[7];
        ret[1] = bytesValue[6];
        ret[2] = bytesValue[5];
        ret[3] = bytesValue[4];
        ret[4] = bytesValue[3];
        ret[5] = bytesValue[2];
        ret[6] = bytesValue[1];
        ret[7] = bytesValue[0];
    }
    


    /// @notice function for checking if signing key ...
    /// @param _key ...
    function _isEmptySigningKey(bytes memory _key)
        internal
        pure
        returns (bool)
    {
        assert(_key.length == PUBKEY_LENGTH);
        // algorithm applicability constraint
        assert(PUBKEY_LENGTH >= 32 && PUBKEY_LENGTH <= 64);

        uint256 k1;
        uint256 k2;
        assembly {
            k1 := mload(add(_key, 0x20))
            k2 := mload(add(_key, 0x40))
        }
        return 0 == k1 && 0 == (k2 >> ((2 * 32 - PUBKEY_LENGTH) * 8));
    }
}
