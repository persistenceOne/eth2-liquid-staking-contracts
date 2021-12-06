//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CoreRef.sol";
import "./interfaces/IKeysManager.sol";

contract KeysManager is IKeysManager, CoreRef {

    mapping(bytes => Validator) public _validators;

    uint256 constant public PUBKEY_LENGTH = 48;
    uint256 constant public SIGNATURE_LENGTH = 96;
    uint256 constant public VALIDATOR_DEPOSIT = 32 ether;


    constructor(address _core) public
    CoreRef(_core)
    {
        

    }

    function validators(bytes calldata publicKey) external view override returns(Validator memory) {
        return _validators[publicKey];
    }

    function addValidator(bytes calldata publicKey, Validator calldata validator) external override {

        Validator memory _validator = _validators[publicKey];

        require(_validator.state == State.INVALID, "KeysManager: validator already exist");        
        require(_isEmptySigningKey(publicKey), "KeysManager: empty signing key");
        _validator = validator;

        verifyDepositDataRoot(publicKey, validator.signature, validator.deposit_root);
        _validators[publicKey] = _validator;
    }

    function activateValidator(bytes calldata publicKey) external override {

        require(msg.sender == core().issuer(), "KeysManager: Only issuer can activate");
        Validator storage validator = _validators[publicKey];
        require(validator.state == State.VALID, "KeysManager: Invalid Key");
        validator.state = State.ACTIVATED;

    }

    function verifyDepositDataRoot(bytes calldata pubKey, bytes calldata signature, bytes32 depositRoot) internal {

        uint256 deposit_amount = VALIDATOR_DEPOSIT / 1 gwei;
        bytes memory amount = to_little_endian_64(uint64(deposit_amount));
        
        bytes32 pubkey_root = sha256(abi.encodePacked(pubKey, bytes16(0)));
        bytes32 signature_root = sha256(abi.encodePacked(
            sha256(abi.encodePacked(signature[:64])),
            sha256(abi.encodePacked(signature[64:], bytes32(0)))
        ));
        bytes32 node = sha256(abi.encodePacked(
            sha256(abi.encodePacked(pubkey_root, core().withdrawalCredential())),
            sha256(abi.encodePacked(amount, bytes24(0), signature_root))
        ));

        // Verify computed and expected deposit data roots match
        require(node == depositRoot, "KeysManager: reconstructed DepositData does not match supplied deposit_data_root");

    }

    function to_little_endian_64(uint64 value) internal pure returns (bytes memory ret) {
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

    function _isEmptySigningKey(bytes memory _key) internal pure returns (bool) {
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