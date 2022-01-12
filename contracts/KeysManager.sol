//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CoreRef.sol";
import "./interfaces/IKeysManager.sol";

contract KeysManager is IKeysManager, CoreRef {
    mapping(bytes => Validator) public _validators;

    uint256 constant public PUBKEY_LENGTH = 48;
    uint256 constant public SIGNATURE_LENGTH = 96;
    uint256 constant public VALIDATOR_DEPOSIT = 32 ether;
    bytes32 depositRoot;
    bytes32 withdrawal_credentials;
    
    event AddValidator(bytes indexed publicKey, bytes indexed signature, address indexed nodeOperator);
    event ActivateValidator(bytes publicKey);
    constructor(address _core) public
    CoreRef(_core)
    {
        

    }

    function validators(bytes calldata publicKey) external view override returns(Validator memory) {
        return _validators[publicKey];
    }

    function addValidator(bytes calldata publicKey, bytes calldata signature, address nodeOperator) onlyKeyAdmin external override {

        Validator memory _validator = _validators[publicKey];
        require(_validator.state == State.INVALID, "KeysManager: validator already exist");        
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

    function activateValidator(bytes calldata publicKey) external override {

        require(msg.sender == core().issuer(), "KeysManager: Only issuer can activate");
        Validator storage validator = _validators[publicKey];
        require(validator.state == State.VALID, "KeysManager: Invalid Key");
        validator.state = State.ACTIVATED;
        emit ActivateValidator(publicKey);

    }

       function activateValidator(bytes[] calldata publicKey, uint size ) external override {

        require(msg.sender == core().issuer(), "KeysManager: Only issuer can activate");
        for(i=0; i<size ; i++){
            Validator storage validator = _validators[publicKey[i]];
            require(validator.state == State.VALID, "KeysManager: Invalid Key");
            validator.state = State.ACTIVATED;
            emit ActivateValidator(publicKey);
        }


    }

    function verifyDepositDataRoot(bytes calldata pubKey, bytes calldata signature) internal returns(bytes32) {

        uint256 deposit_amount = VALIDATOR_DEPOSIT / 1 gwei;
        bytes memory amount = to_little_endian_64(uint64(deposit_amount));
        // withdrawalCredsBytes32 = bytes32(uint256(uint160((core().withdrawalCredential()))) << 96);
        // bytes memory withdrawal_credentials = abi.encode(core().withdrawalCredential());
        
        withdrawal_credentials = core().withdrawalCredential();
        // withdrawlCreds =  withdrawal_credentials;
        bytes32 pubkey_root = sha256(abi.encodePacked(pubKey, bytes16(0)));
        bytes32 signature_root = sha256(abi.encodePacked(
            sha256(abi.encodePacked(signature[:64])),
            sha256(abi.encodePacked(signature[64:], bytes32(0)))
        ));
        bytes32 node = sha256(abi.encodePacked(
            sha256(abi.encodePacked(pubkey_root, withdrawal_credentials)),
            sha256(abi.encodePacked(amount, bytes24(0), signature_root))
        ));
        require(pubKey.length == 48, "DepositContract: invalid pubkey length");
        require(signature.length == 96, "DepositContract: invalid signature length");
        require(withdrawal_credentials.length == 32, "DepositContract: invalid withdrawal_credentials length");
        // Verify computed and expected deposit data roots match
        // require(node == depositRoot, "KeysManager: reconstructed DepositData does not match supplied deposit_data_root");
        depositRoot = node;
        return node;
    }

    function depositRootView() external view returns(bytes32)
    {
        return depositRoot;
    }

    function toBytes(address a) public pure returns (bytes memory b){
    assembly {
        let m := mload(0x40)
        a := and(a, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
        mstore(add(m, 20), xor(0x140000000000000000000000000000000000000000, a))
        mstore(0x40, add(m, 52))
        b := m
   }
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