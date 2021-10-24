//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICore.sol";
import "./IStkEth.sol";

/// @title CoreRef interface
/// @author Ankit Parashar
interface ICoreRef {

    function setCore(address core) external;

    function pause() external;

    function unpause() external;

    // ----------- Getters -----------

    function core() external view returns (ICore);

    function stkEth() external view returns (IStkEth);

}