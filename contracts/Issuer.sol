//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CoreRef.sol";
import "hardhat/console.sol";
import "./interfaces/IKeysManager.sol";
import "./interfaces/IDepositContract.sol";
import "./interfaces/IIssuer.sol";

contract Issuer is CoreRef, IIssuer {
    uint256 public constant VALIDATOR_DEPOSIT = 31 ether;
    uint256 public constant VERIFICATION_DEPOSIT = 1 ether;
    

    IDepositContract public DEPOSIT_CONTRACT;
    uint256 public pendingValidators;
    uint256 public minActivatingDeposit;
    uint256 public pendingValidatorsLimit;

    mapping(address => mapping(uint256 => uint256)) public activations;

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

    function activatingDeposit()
        public
        view
        returns (uint256 minActivatingDeposit)
    {
        return minActivatingDeposit;
    }

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

    function setPendingValidatorsLimit(uint256 _pendingValidatorsLimit)
        external
        onlyGovernor
    {
        require(_pendingValidatorsLimit < 10000, "Issuer: invalid limit");
        pendingValidatorsLimit = _pendingValidatorsLimit;
    }

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

    function mintStkEthForEth(uint256 amount, address user) internal {
        uint256 stkEthToMint = (amount * 1e18) / stkEth().pricePerShare();
        //console.log("amount", amount);
        //console.log("stkEth().pricePerShare()", stkEth().pricePerShare());
        stkEth().mint(user, stkEthToMint);
    }

    function stake() public payable whenNotPaused {
        require(msg.value > 0, "Issuer: can't stake zero");

        if (msg.value <= minActivatingDeposit) {
            mintStkEthForEth(msg.value, msg.sender);
            return;
        }

        // mint tokens if current pending validators limit is not exceed
        uint256 _pendingValidators = pendingValidators +
            ((address(this).balance) / (VALIDATOR_DEPOSIT));
        uint256 _activatedValidators = oracle().activatedValidators();
        uint256 validatorIndex = _activatedValidators + _pendingValidators;
        //console.log("Pending val", _pendingValidators);
        //console.log("active val", _activatedValidators);
        //console.log("val index", validatorIndex);

        if (
            validatorIndex * 1e4 <=
            _activatedValidators * (pendingValidatorsLimit + 1e4)
        ) {
            // 10001
            mintStkEthForEth(msg.value, msg.sender);
            //console.log("STKETH SUPPLY", stkEth().totalSupply());
        } else {
            // lock deposit amount until validator activated
            //console.log("not minted", stkEth().totalSupply());
            activations[msg.sender][validatorIndex] =
                activations[msg.sender][validatorIndex] +
                msg.value;
        }
    }

    function activate(address _account, uint256 _validatorIndex)
        external
        whenNotPaused
    {
        uint256 activatedValidators = oracle().activatedValidators();
        //console.log("activatedValidators", activatedValidators);

        uint256 amount = activations[_account][_validatorIndex];
        require(amount > 0, "Issuer: invalid validator index");
        //console.log("amount", amount);
        require(
            _validatorIndex * 1e4 <=
                activatedValidators * (pendingValidatorsLimit + 1e4),
            "Issuer: validator is not active yet"
        );

        delete activations[_account][_validatorIndex];
        mintStkEthForEth(amount, _account);
    }

    function depositToEth2(bytes calldata publicKey) external {
        IKeysManager.Validator memory validator = IKeysManager(
            core().keysManager()
        ).validators(publicKey);

        IKeysManager(core().keysManager()).depositValidator(publicKey);

        pendingValidators = pendingValidators + 1;
        DEPOSIT_CONTRACT.deposit{value: VALIDATOR_DEPOSIT}(
            publicKey, //
            abi.encodePacked(core().withdrawalCredential()),
            validator.signature,
            validator.deposit_root
        );
    }


    function validatordepositToEth2(bytes calldata publicKey) internal {
        IKeysManager.Validator memory validator = IKeysManager(
            core().keysManager()
            ).validators(publicKey);

        IKeysManager(core().keysManager()).depositValidator(publicKey);

        //pendingValidators = pendingValidators + 1;
        DEPOSIT_CONTRACT.deposit{value: VERIFICATION_DEPOSIT } (
            publicKey, //
            abi.encodePacked(core().withdrawalCredential()),
            validator.signature,
            validator.deposit_root
        );
    }










}
