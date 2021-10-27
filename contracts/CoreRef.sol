//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/ICoreRef.sol";
import "./interfaces/ICore.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

abstract contract CoreRef is ICoreRef, Pausable {

    ICore private _core;

    constructor(address core){
        _core = ICore(core);
    }

    modifier ifMinterSelf() {
        if (_core.isMinter(address(this))) {
            _;
        }
    }

    modifier onlyMinter() {
        require(_core.isMinter(msg.sender), "CoreRef: Caller is not a minter");
        _;
    }

    modifier onlyBurner() {
        require(_core.isBurner(msg.sender), "CoreRef: Caller is not a burner");
        _;
    }

    modifier onlyGovernor() {
        require(
            _core.isGovernor(msg.sender),
            "CoreRef: Caller is not a governor"
        );
        _;
    }

    /// @notice set pausable methods to paused
    function pause() public override onlyGovernor {
        _pause();
    }

    /// @notice set pausable methods to unpaused
    function unpause() public override onlyGovernor {
        _unpause();
    }

    /// @notice set new Core reference address
    /// @param core the new core address
    function setCore(address core) external override onlyGovernor {
        _core = ICore(core);
    }

    function stkEth() public view override returns (IStkEth) {
        return _core.stkEth();
    }

    function core() public view override returns (ICore) {
        return _core;
    }
}