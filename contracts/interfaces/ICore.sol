//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPermissions.sol";
import "./IStkEth.sol";

/// @title Core interface
/// @author Ankit Parashar
interface ICore {

    function init() external;

    function stkEth() external view returns(IStkEth);

    function oracle() external view returns(address);

    function withdrawalCredential() external view returns(address);

    function keysManager() external view returns(address);

    function set(bytes32 _key, address _address) external;
}