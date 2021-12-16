//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/ICore.sol";
import "./Permissions.sol";
import "./interfaces/IStkEth.sol";
import "./token/StkEth.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Core is Initializable, ICore, Permissions {

    using SafeERC20 for IERC20;

    IStkEth public override stkEth;

    bytes32 public constant ORACLE = keccak256("ORACLE");
    bytes32 public constant WITHDRAWAL_CREDENTIAL = keccak256("WITHDRAWAL_CREDENTIAL");
    bytes32 public constant KEYS_MANAGER = keccak256("KEYS_MANAGER");
    bytes32 public constant PSTAKE_TREASURY = keccak256("PSTAKE_TREASURY");
    bytes32 public constant VALIDATOR_POOL = keccak256("VALIDATOR_POOL");    
    bytes32 public constant ISSUER = keccak256("ISSUER");
    bytes32 public WITHDRAWAL_CREDENTIAL_BYTES32;

    mapping(bytes32 => address) public override coreContract;

    function init() external override initializer {

        _setupGovernor(msg.sender);

        StkEth _stkEth = new StkEth(address(this));
        _setStkEth(address(_stkEth));
    }

    function _setStkEth(address token) internal {
        stkEth = IStkEth(token);
    }

    function oracle() external view override returns(address) {
        return coreContract[ORACLE];
    }

    function withdrawalCredential() external view override returns(bytes32) {
        // return coreContract[WITHDRAWAL_CREDENTIAL];
        return WITHDRAWAL_CREDENTIAL_BYTES32;
    }

    function setWithdrawalCredential(bytes32 withdrawcreds) external onlyGovernor{
        // 0x0100000000000000000000003d80b31a78c30fc628f20b2c89d7ddbf6e53cedc
        // console.log("WITHDRAWAL_CREDENTIAL_BYTES32", WITHDRAWAL_CREDENTIAL_BYTES32);
        WITHDRAWAL_CREDENTIAL_BYTES32 = withdrawcreds;
    }


    function keysManager() external view override returns(address) {
        return coreContract[KEYS_MANAGER];
    }

    function pstakeTreasury() external view override returns(address) {
        return coreContract[PSTAKE_TREASURY];
    }

    function validatorPool() external view override returns(address) {
        return coreContract[VALIDATOR_POOL];
    }

    function issuer() external view override returns(address) {
        return coreContract[ISSUER];
    }

    function set(bytes32 _key, address _address) external override onlyGovernor {
        coreContract[_key] = _address; 
    }

}
