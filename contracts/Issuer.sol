//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CoreRef.sol";
import "./interfaces/IKeysManager.sol";
import "./interfaces/IDepositContract.sol";
import "./interfaces/IIssuer.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @author PStake
/// @title Issuer
/// @notice contract for issuance of StkEth
contract Issuer is CoreRef, IIssuer, ReentrancyGuard {
    uint256 public constant VALIDATOR_DEPOSIT = 31e18;
    uint256 public constant VERIFICATION_DEPOSIT = 1e18;
    

    IDepositContract public DEPOSIT_CONTRACT;
    uint256 public override pendingValidators;
    uint256 public minActivatingDeposit;
    uint256 public pendingValidatorsLimit;


    /// event MintStkEthForEth (uint256 amount, address user, uint256 stkEthToMint);

    mapping(address => mapping(uint256 => uint256)) public activations;


    /// @notice constructor for initializing core
    /// @param core address of the core 
    /// @param _minActivatingDeposit minimum amount of ether deposited to activate ...
    /// @param _pendingValidatorsLimit ...
    /// @param demoDeposit ...
    constructor(
        address core,
        uint256 _minActivatingDeposit,
        uint256 _pendingValidatorsLimit,
        address demoDeposit
    ) CoreRef(core) {
        DEPOSIT_CONTRACT = IDepositContract(demoDeposit);
        minActivatingDeposit = _minActivatingDeposit;

        require(_pendingValidatorsLimit < 10000, "Issuer: invalid limit");
        pendingValidatorsLimit = _pendingValidatorsLimit;
    }



    /// @notice function returns minimum activating deposit.
    /// @return minActivatingDeposit returns the value of minimum deposit required to activate validator.
    function activatingDeposit()
        public
        view
        returns (uint256 minActivatingDeposit)
    {
        return minActivatingDeposit;
    }


    /// @notice function returns pending validator limit.
    /// @return pendingValidatorsLimit number of pending validators.
    function pendingValidatorLimit()
        public
        view
        returns (uint256 pendingValidatorsLimit)
    {
        return pendingValidatorsLimit;
    }

    function setMinActivatingDeposit(uint256 _minActivatingDeposit)
        external
        onlyGovernor
    {
        minActivatingDeposit = _minActivatingDeposit;
    }


    /// @notice function for setting the count of pending validators limit.
    /// @param _pendingValidatorsLimit integer limit for number of pending validators.
    function setPendingValidatorsLimit(uint256 _pendingValidatorsLimit)
        external
        onlyGovernor
    {
        require(_pendingValidatorsLimit < 10000, "Issuer: invalid limit");
        pendingValidatorsLimit = _pendingValidatorsLimit;
    }


    /// @notice function for updating the count of pending validators with new activated validators.
    /// @param newActiveValidators the number of new activated validators.
    function updatePendingValidator(uint256 newActiveValidators)
        external
        override
    {
        require(
            core().oracle() == msg.sender,
            "Issuer: Only oracle can update"
        );

        pendingValidators = pendingValidators - newActiveValidators;
    }



    /// @notice function to mint Stk Eth for Eth.
    /// @param amount amount of ether.
    /// @param user address of user.
    function mintStkEthForEth(uint256 amount, address user) internal {
        uint256 stkEthToMint = (amount * 1e18) / stkEth().pricePerShare();

        stkEth().mint(user, stkEthToMint);
        /// emit MintStkEthForEth (amount, user,stkEthToMint);
    }


    /// @notice function for issuer to stake
    function stake() public payable whenNotPaused {
        require(msg.value > 0, "Issuer: can't stake zero");

        if (msg.value <= minActivatingDeposit) {
            mintStkEthForEth(msg.value, msg.sender);
            return;
        }

        // mint tokens if current pending validators limit is not exceeded
        uint256 _pendingValidators = pendingValidators +
            ((address(this).balance) / (VALIDATOR_DEPOSIT));
        uint256 _activatedValidators = oracle().activatedValidators();
        uint256 validatorIndex = _activatedValidators + _pendingValidators;


        if (
            validatorIndex * 1e4 <=
            _activatedValidators * (pendingValidatorsLimit + 1e4)
        ) {
            // 10001
            mintStkEthForEth(msg.value, msg.sender);
  
        } else {

            activations[msg.sender][validatorIndex] =
                activations[msg.sender][validatorIndex] +
                msg.value;
        }
    }



    /// @notice Mint stkEth after waiting for validator to get active
    /// @param _account account of users whose stkEth need to be minted
    /// @param _validatorIndex index of validator which got activated
    function activate(address _account, uint256 _validatorIndex)
       external
       whenNotPaused
    {
        uint256 activatedValidators = oracle().activatedValidators();
       

        uint256 amount = activations[_account][_validatorIndex];
        require(amount > 0, "Issuer: invalid validator index");
      
        require(
            _validatorIndex * 1e4 <=
                activatedValidators * (pendingValidatorsLimit + 1e4),
            "Issuer: validator is not active yet"
        );

        delete activations[_account][_validatorIndex];
        mintStkEthForEth(amount, _account);
    }



    /// @notice function for deposit of 32 Ether.
    /// @param publicKey public key of the validator.
    function depositToEth2(bytes calldata publicKey) external {
        require(address(this).balance >= VALIDATOR_DEPOSIT + VERIFICATION_DEPOSIT, "Issuer: Not enough ether deposited");
        IKeysManager.Validator memory validator = IKeysManager(
            core().keysManager()
        ).validators(publicKey);

        withdrawalverificationDeposit(validator.nodeOperator);

        IKeysManager(core().keysManager()).depositValidator(publicKey);

        pendingValidators = pendingValidators + 1;
        DEPOSIT_CONTRACT.deposit{value: VALIDATOR_DEPOSIT}(
            publicKey, //
            abi.encodePacked(core().withdrawalCredential()),
            validator.signature,
            validator.deposit_root
        );
    }


    /// @notice function for sending 1 Ether to a node operator address.
    /// @param nodeOperator address of the node operator
    function withdrawalverificationDeposit(address nodeOperator) internal nonReentrant  {

        (bool sent, ) = nodeOperator.call{value: VERIFICATION_DEPOSIT }("");
        require(sent, "Issuer: Failed to send to Node Operator");
    }

}



