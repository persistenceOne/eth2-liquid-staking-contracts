//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CoreRef.sol";
import "./interfaces/IKeysManager.sol";

contract KeysManager is IKeysManager, CoreRef {

    mapping(bytes => Validator) public _validators;

    uint256 constant public PUBKEY_LENGTH = 48;
    uint256 constant public SIGNATURE_LENGTH = 96;

    constructor(address _core) public
    CoreRef(_core)
    {
        
        // todo

    }

    function validators(bytes calldata publicKey) external view override returns(Validator memory) {
        return _validators[publicKey];
    }

    function addValidator(bytes calldata publicKey, Validator calldata validator) external override {

        Validator memory _validator = _validators[publicKey];

        require(_validator.state == State.INVALID, "KeysManager: validator already exist");        

        _validator = validator;
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