//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Oracle interface
/// @author Ankit Parashar
interface IOracle {

    event Distribute(uint256 amount);
    event Slash(uint256 amount);

    function pricePerShare() external view returns (uint256);

    function activatedValidators() external view returns (uint256);

    function addOracleMember(address newOracleMember) external;

    function removeOracleMember(address oracleMeberToDelete) external;

    function pushData(
        uint256 latestEthBalance,
        uint256 latestNonce,
        uint32 numberOfValidators,
        uint256 epochID
    ) external;

    function activateValidator(bytes[] calldata _publicKeys) external;
}
