pragma solidity ^0.8.0;

// import "./CoreRef.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IStkEth.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/IStakingPool.sol";
import "./CoreRef.sol";
import "./interfaces/IIssuer.sol";
import "./KeysManager.sol";
import "hardhat/console.sol";

contract Oracle is IOracle, CoreRef {
    using EnumerableSet for EnumerableSet.AddressSet;
    using Counters for Counters.Counter;

    uint128 internal constant ETH2_DENOMINATION = 1e9;
    uint256 constant BASIS_POINT = 10000;
    uint256 public DEPOSIT_LIMIT = 32e18;

    struct BeaconData {
        uint64 epochsPerTimePeriod;
        uint64 slotsPerEpoch;
        uint64 secondsPerSlot;
        uint64 genesisTime;
    }

    uint256 lastCompletedEpochId;
    uint256 lastValidatorActivation;
    Counters.Counter private nonce;
    uint64 lastCompletedTimeFrame;
    uint32 quorom;
    uint32 validatorQuorom;
    uint256 public override activatedValidators;
    uint32 pStakeCommission;
    uint32 valCommission;

    uint256 beaconEthBalance = 0;

    mapping(bytes32 => uint256) public candidates;
    mapping(bytes32 => bool) private submittedVotes;

    BeaconData beaconData;

    EnumerableSet.AddressSet private oracleMember;

    uint256 public override pricePerShare = 1e18;

    KeysManager key;

    event quoromUpdated(
        uint32 indexed latestQuorom,
        uint256 indexed nonce,
        uint32 indexed quorom
    );
    event oracleMemberAdded(
        address indexed newOracleMember,
        uint256 indexed oracleMemberLength
    );
    event oracleMemberRemoved(
        address indexed newOracleMember,
        uint256 indexed oracleMemberLength
    );
    event dataPushed(
        uint256 indexed latestEthBalance,
        uint256 indexed latestNonce,
        uint32 indexed numberOfValidators
    );
    event validatorActivated(bytes[] _publicKey);
    event commissionsUpdated(uint32 _pStakeCommission, uint32 _valCommission);

    constructor(
        uint64 _epochsPerTimePeriod,
        uint64 _slotsPerEpoch,
        uint64 _secondsPerSlot,
        uint64 _genesisTime,
        address _core,
        address _keysManager,
        uint32 _pStakeCommission,
        uint32 _valCommission
    ) CoreRef(_core) {
        key = KeysManager(_keysManager);
        beaconData.epochsPerTimePeriod = _epochsPerTimePeriod;
        beaconData.slotsPerEpoch = _slotsPerEpoch;
        beaconData.secondsPerSlot = _secondsPerSlot;
        beaconData.genesisTime = _genesisTime;
        require(
            _pStakeCommission < BASIS_POINT &&
                _valCommission < BASIS_POINT &&
                (_pStakeCommission + _valCommission) < BASIS_POINT,
            "Invalid values"
        );
        pStakeCommission = _pStakeCommission;
        valCommission = _valCommission;
    }

    /// @notice fucntion that returns the 
    /// @return frameEpochId epoch id of the frame
    /// @return frameStartTime timestamp of start of time frame
    /// @return frameEndTime
    function getCurrentTimePeriod()
        external
        view
        returns (
            uint256 frameEpochId,
            uint256 frameStartTime,
            uint256 frameEndTime
        )
    {
        uint64 genesisTime = beaconData.genesisTime;
        uint64 secondsPerEpoch = beaconData.secondsPerSlot *
            beaconData.slotsPerEpoch;

        frameEpochId = _getFrameFirstEpochId(
            _getCurrentEpochId(beaconData),
            beaconData
        );
        frameStartTime = frameEpochId * secondsPerEpoch + genesisTime;
        frameEndTime =
            (frameEpochId + beaconData.epochsPerTimePeriod) *
            secondsPerEpoch +
            genesisTime -
            1;
    }

    function currentNonce() external view returns (uint256) {
        return nonce.current();
    }

    function oracleMemberLength() public view returns (uint256) {
        return EnumerableSet.length(oracleMember);
    }

    function Quorom() external view returns (uint32) {
        return quorom;
    }

    function ValidatorQuorom() external view returns (uint32) {
        return validatorQuorom;
    }

    function getBeaconData()
        external
        view
        returns (
            uint64 epochsPerTimePeriod,
            uint64 slotsPerEpoch,
            uint64 secondsPerSlot,
            uint64 genesisTime
        )
    {
        return (
            beaconData.epochsPerTimePeriod,
            beaconData.slotsPerEpoch,
            beaconData.secondsPerSlot,
            beaconData.genesisTime
        );
    }

    function _getFrameFirstEpochId(
        uint256 _epochId,
        BeaconData memory _beaconSpec
    ) internal view returns (uint256) {
        return
            (_epochId / _beaconSpec.epochsPerTimePeriod) *
            _beaconSpec.epochsPerTimePeriod;
    }

    function _getCurrentEpochId(BeaconData memory _beaconSpec)
        internal
        view
        returns (uint256)
    {
        return
            (block.timestamp - beaconData.genesisTime) /
            (beaconData.slotsPerEpoch * beaconData.secondsPerSlot);
    }

    function _getCurrentEpochIdExt(BeaconData memory _beaconSpec)
        external
        view
        returns (uint256)
    {
        return
            (block.timestamp - beaconData.genesisTime) /
            (beaconData.slotsPerEpoch * beaconData.secondsPerSlot);
    }

    function getLastCompletedEpochId() external view returns (uint256) {
        return lastCompletedEpochId;
    }

    function getTotalEther() external view returns (uint256) {
        return beaconEthBalance;
    }

    function updateQuorom(uint32 latestQuorom) external onlyGovernor {
        require(latestQuorom >= 0, "Quorom less that 0");
        quorom = latestQuorom;
        emit quoromUpdated(latestQuorom, nonce.current(), quorom);
    }

    function updateValidatorQuorom(uint32 latestQuorom) external onlyGovernor {
        require(latestQuorom >= 0, "Quorom less that 0");
        validatorQuorom = latestQuorom;
    }

    function updateCommissions(uint32 _pStakeCommission, uint32 _valCommission)
        external
        onlyGovernor
    {
        require(
            _pStakeCommission < BASIS_POINT &&
                _valCommission < BASIS_POINT &&
                (_pStakeCommission + _valCommission) < BASIS_POINT,
            "Invalid values"
        );
        pStakeCommission = _pStakeCommission;
        valCommission = _valCommission;
        emit commissionsUpdated(_pStakeCommission, _valCommission);
    }

    function addOracleMember(address newOracleMember)
        external
        override
        onlyGovernor
    {
        if (EnumerableSet.add(oracleMember, newOracleMember) == false)
            revert("Oracle member already present");
        emit oracleMemberAdded(newOracleMember, oracleMemberLength());
    }

    function removeOracleMember(address oracleMeberToDelete)
        external
        override
        onlyGovernor
    {
        if (EnumerableSet.contains(oracleMember, oracleMeberToDelete) == false)
            revert("Oracle member not present");
        else EnumerableSet.remove(oracleMember, oracleMeberToDelete);
        emit oracleMemberRemoved(oracleMeberToDelete, oracleMemberLength());
    }

    function isOralce(address member) public view returns (bool) {
        return (EnumerableSet.contains(oracleMember, member));
    }


    /// @notice function for minting of StkEth for Eth
    /// @param amount ...
    /// @param user ...
    /// @param newPricePerShare new price per share
    function mintStkEthForEth(
        uint256 amount,
        address user,
        uint256 newPricePerShare
    ) internal {
        uint256 stkEthToMint = (amount * 1e18) / newPricePerShare;
        stkEth().mint(user, stkEthToMint);
    }


    /// @notice function for slashing balance of a pool 
    /// @param deltaEth difference in eth balance since last distribution
    /// @param rewardBase ...

    function slash(uint256 deltaEth, uint256 rewardBase) internal {
        //
        uint256 stkEthToSlash = (deltaEth * 1e18) / pricePerShare;

        uint256 preTotal = stkEth().totalSupply();

        IStakingPool(core().validatorPool()).slash(stkEthToSlash);

        uint256 stkEthBurned = preTotal - stkEth().totalSupply();
        // If staking pool not able to burn enough stkEth, then adjust pricePerShare for remainingSupply
        if (stkEthBurned < stkEthToSlash) {
            deltaEth = deltaEth - ((stkEthBurned * pricePerShare) / 1e18);
            pricePerShare =
                ((rewardBase - deltaEth) * 1e18) /
                (activatedValidators * DEPOSIT_LIMIT);
            //console.log("Price per share is: ", pricePerShare);
        }
    }

    /// @notice function to distribute rewards by setting price per share
    /// @param deltaEth difference in eth balance since last distribution
    /// @param rewardBase ...
    function distributeRewards(uint256 deltaEth, uint256 rewardBase) internal {
        // calculate fees need to be deducted in terms of stkEth which will be minted for treasury & validators
        // while calculating we will assume 1 stkEth * pricePerShare == 1 eth in Eth2
        // and then respectively mint new stkEth to treasury and validator pool address

        uint256 price = ((rewardBase + deltaEth) * 1e18) /
            (activatedValidators * DEPOSIT_LIMIT);

        uint256 valEthShare = (valCommission * deltaEth) / BASIS_POINT;
        uint256 protocolEthShare = (pStakeCommission * deltaEth) / BASIS_POINT;
        //console.log("valEthShare", valEthShare);
        //console.log("protocolEthShare", protocolEthShare);

        mintStkEthForEth(valEthShare, core().validatorPool(), price);
        mintStkEthForEth(protocolEthShare, core().pstakeTreasury(), price);
        pricePerShare = price;
    }


    /// @notice function to activate an array of validators
    /// @param _publicKeys public key array of validators
    function activateValidator(bytes[] memory _publicKeys) external override {
        if (isOralce(msg.sender) == false) revert("Not oracle Member");
        require(
            block.timestamp >= lastValidatorActivation + 24 hours,
            "voted before an hour"
        );
        bytes32 candidateId = keccak256(abi.encode(_publicKeys));
        bytes32 voteId = keccak256(abi.encode(msg.sender, candidateId));
        require(!submittedVotes[voteId], "Oracles: already voted");

        // mark vote as submitted, update candidate votes number
        submittedVotes[voteId] = true;
        uint256 candidateNewVotes = candidates[candidateId] + 1;
        candidates[candidateId] = candidateNewVotes;
        uint256 oracleMemberSize = oracleMemberLength();

        if (candidateNewVotes >= validatorQuorom) {
            delete submittedVotes[voteId];

            for (uint256 i = 0; i < oracleMemberSize; i++) {
                delete submittedVotes[
                    keccak256(
                        abi.encode(
                            EnumerableSet.at(oracleMember, i),
                            candidateId
                        )
                    )
                ];
            }

            // clean up candidate
            delete candidates[candidateId];
            key.activateValidator(_publicKeys);
            lastValidatorActivation = block.timestamp;
            emit validatorActivated(_publicKeys);
        }
    }


    /// @notice function to push data to oracle
    /// @param latestEthBalance latest balance of eth 
    /// @param latestNonce latest nonce number
    /// @param numberOfValidators count of validators
    function pushData(
        uint256 latestEthBalance,
        uint256 latestNonce,
        uint32 numberOfValidators
    ) external override {
        if (isOralce(msg.sender) == false) revert("Not oracle Member");
        require(
            latestEthBalance >= (numberOfValidators * 32e9),
            "Number of Validators or Balance incorrect"
        );
        uint256 currentFrameEpochId = _getCurrentEpochId(beaconData);
        //console.log("currentFrameEpochId", currentFrameEpochId);
        //console.log("lastCompletedEpochId", lastCompletedEpochId);

        require(
            currentFrameEpochId > lastCompletedEpochId,
            "Cannot push to Epoch less that already commited"
        );
        require(
            currentFrameEpochId >=
                _getFrameFirstEpochId(currentFrameEpochId, beaconData)
        );
        require(
            currentFrameEpochId <=
                _getFrameFirstEpochId(currentFrameEpochId, beaconData) +
                    beaconData.epochsPerTimePeriod
        );

        require(latestNonce == nonce.current(), "incorrect Nonce");
        require(
            activatedValidators <= numberOfValidators,
            "Invalid numberOfValidators"
        );
        latestEthBalance = latestEthBalance * ETH2_DENOMINATION;
        bytes32 candidateId = keccak256(
            abi.encode(nonce, latestEthBalance, numberOfValidators)
        );
        bytes32 voteId = keccak256(abi.encode(msg.sender, candidateId));
        require(!submittedVotes[voteId], "Oracles: already voted");

        // mark vote as submitted, update candidate votes number
        submittedVotes[voteId] = true;
        uint256 candidateNewVotes = candidates[candidateId] + 1;
        candidates[candidateId] = candidateNewVotes;
        uint256 oracleMemberSize = oracleMemberLength();

        if (candidateNewVotes >= quorom) {
            // clean up votes
            delete submittedVotes[voteId];

            for (uint256 i = 0; i < oracleMemberSize; i++) {
                delete submittedVotes[
                    keccak256(
                        abi.encode(
                            EnumerableSet.at(oracleMember, i),
                            candidateId
                        )
                    )
                ];
            }

            // clean up candidate
            nonce.increment();
            delete candidates[candidateId];

            uint256 rewardBase = beaconEthBalance +
                (DEPOSIT_LIMIT * (numberOfValidators - activatedValidators));
            if (activatedValidators < numberOfValidators) {
                IIssuer(core().issuer()).updatePendingValidator(
                    numberOfValidators - activatedValidators
                );
            }
            activatedValidators = numberOfValidators;
            //console.log("rewardBase", rewardBase);
            //console.log("latestEthBalance", latestEthBalance);
            if (latestEthBalance > rewardBase) {
                distributeRewards(latestEthBalance - rewardBase, rewardBase);
            } else if (latestEthBalance < rewardBase) {
                slash(rewardBase - latestEthBalance, rewardBase);
            }

            beaconEthBalance = latestEthBalance;
            lastCompletedEpochId = currentFrameEpochId;
        }
        uint256 timeElapsed = (currentFrameEpochId - lastCompletedEpochId) *
            beaconData.slotsPerEpoch *
            beaconData.secondsPerSlot;
        emit dataPushed(latestEthBalance, latestNonce, numberOfValidators);
    }


    /// @notice update the specification parameters for beacon chain data
    /// @param epochsPerTimePeriod ...
    /// @param slotsPerEpoch ...
    /// @param secondsPerSlot ...
    /// @param genesisTime ...
    //DAO
    function updateBeaconChainData(
        uint64 epochsPerTimePeriod,
        uint64 slotsPerEpoch,
        uint64 secondsPerSlot,
        uint64 genesisTime
    ) external onlyGovernor {
        _setBeaconSpec(
            epochsPerTimePeriod,
            slotsPerEpoch,
            secondsPerSlot,
            genesisTime
        );
    }



    /// @notice sets the specification parameters for beacon chain data
    /// @param _epochsPerTimePeriod ...
    /// @param _slotsPerEpoch ...
    /// @param _secondsPerSlot ...
    /// @param _genesisTime ...

    function _setBeaconSpec(
        uint64 _epochsPerTimePeriod,
        uint64 _slotsPerEpoch,
        uint64 _secondsPerSlot,
        uint64 _genesisTime
    ) internal {
        require(_epochsPerTimePeriod > 0);
        require(_slotsPerEpoch > 0);
        require(_secondsPerSlot > 0);
        require(_genesisTime > 0);

        beaconData.epochsPerTimePeriod = _epochsPerTimePeriod;
        beaconData.slotsPerEpoch = _slotsPerEpoch;
        beaconData.secondsPerSlot = _secondsPerSlot;
        beaconData.genesisTime = _genesisTime;
    }
}
