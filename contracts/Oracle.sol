pragma solidity ^0.8.0;

import "./CoreRef.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IStkEth.sol";

contract Oracle is CoreRef{
    using Counters for Counters.Counter;
    
    uint128 internal constant ETH2_DENOMINATION = 1e9;
   
    struct BeaconData{
        uint64 epochsPerTimePeriod;
        uint64 slotsPerEpoch;
        uint64 secondsPerSlot;
        uint64 genesisTime;
    }
    
    address stkEthAddress;
    
    uint256 lastCompletedEpochId;
    uint256 totalPooledEther;
    Counters.Counter private nonce;
    uint256 pricePerShareStk;
    uint64 lastCompletedTimeFrame;
    uint32 quorom;
    uint32 numberOfVal;
    uint256 oracleMemberSize = 0;
    uint32 pStakeCommisison;
    uint32 valCommission;


    address[] oracleMember;
    mapping(bytes32 => uint256) public candidates;
    mapping(bytes32 => bool) private submittedVotes;   
    BeaconData beaconData;
    
    address Admin;

    constructor(uint64 epochsPerTimePeriod, uint64 slotsPerEpoch, uint64 secondsPerSlot, uint64 genesisTime, address core, address sktEth, uint32 pStakeCommisisons,
    uint32 valCommissions) 
    CoreRef(core)
    {
        stkEthAddress = sktEth;
        beaconData.epochsPerTimePeriod = epochsPerTimePeriod; 
        beaconData.slotsPerEpoch = slotsPerEpoch;
        beaconData.secondsPerSlot = secondsPerSlot;
        beaconData.genesisTime = genesisTime;
        pStakeCommisison = pStakeCommisisons;
        valCommission = valCommissions;
    }
    
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
        uint64 secondsPerEpoch = beaconData.secondsPerSlot * beaconData.slotsPerEpoch;

        frameEpochId = _getFrameFirstEpochId(_getCurrentEpochId(beaconData), beaconData);
        frameStartTime = frameEpochId * secondsPerEpoch + genesisTime;
        frameEndTime = (frameEpochId + beaconData.epochsPerTimePeriod) * secondsPerEpoch + genesisTime - 1;
    }
    
    function currentNonce() external view returns (uint256){
        return nonce.current();
    }

    function numberOfOracleNodes() external view returns (uint256){
        return oracleMemberSize;
    }
    
    function oracleMembers() external view returns (address[] memory){
        return oracleMember;
    }
    
    function Quorom() external view returns (uint32){
        return quorom;
    }

    function getBeaconData() external view returns (uint64 epochsPerTimePeriod, uint64 slotsPerEpoch, uint64 secondsPerSlot, uint64 genesisTime){
        return(beaconData.epochsPerTimePeriod,beaconData.slotsPerEpoch,beaconData.secondsPerSlot,beaconData.genesisTime);
    }

    function pricePerShare() external view returns (uint256){
        return(IStkEth(stkEthAddress).totalSupply()/totalPooledEther);
    }
    
    function _getFrameFirstEpochId(uint256 _epochId, BeaconData memory _beaconSpec) internal view returns (uint256) {
        return _epochId / _beaconSpec.epochsPerTimePeriod * _beaconSpec.epochsPerTimePeriod;
    }
    
    function _getCurrentEpochId(BeaconData memory _beaconSpec) internal view returns (uint256) {
        return (block.timestamp - beaconData.genesisTime) / (beaconData.slotsPerEpoch * beaconData.secondsPerSlot);
    }
       
    function getLastCompletedEpochId() external view returns (uint256){
        return lastCompletedEpochId;    
    }
    
    function updateQuorom(uint32 latestQuorom) external onlyGovernor{
        quorom = latestQuorom;
    }

    function updateCommissions(uint32 pStakeCommisisos, uint32 valCommissions) external onlyGovernor{
        pStakeCommisison = pStakeCommisisos;
        valCommission = valCommissions;
    }

    function addOracleMember(address newOracleMember) external onlyGovernor{
        oracleMember.push(newOracleMember);
        oracleMemberSize++;
    }
    
    function removeOralceMember(address oracleMeberToDelete) external onlyGovernor{
        if (oracleMember[oracleMemberSize-1] == oracleMeberToDelete)
        oracleMemberSize = oracleMemberSize -1;
        
        address prev = oracleMember[oracleMemberSize-1];
        uint256 i;
        for (i=oracleMemberSize-2; i>=0 && oracleMember[i]!=oracleMeberToDelete; i--)
        {
            address curr = oracleMember[i];
            oracleMember[i] = prev;
            prev = curr;
        }
 
        if (i < 0)
        revert("Oracle member not found");
 
        oracleMember[i] = prev;
        oracleMemberSize--;
    }
    
    function isOralce(address member) public view returns(bool)
    {
        for(uint i=0; i <= oracleMemberSize; i++)
        {
            if(member == oracleMember[i])
            return true;
        }
        return false;
    }
    
    function updatePricePershare(uint64 latestEthBalance) internal{
        uint256 priceDifference = latestEthBalance - totalPooledEther;
        uint256 price = (IStkEth(stkEthAddress).totalSupply()/latestEthBalance);
        if(priceDifference<0){
            //slashing
        }
        else{
            uint256 valEthShare = (valCommission*priceDifference)/100;
            uint256 protocolEthShare = (pStakeCommisison*priceDifference)/100;
            IStkEth(stkEthAddress).mint(0x7723DcdBA4b375157375fd363c238Be82a9eDF84,(valEthShare/price));
            IStkEth(stkEthAddress).mint(0x7723DcdBA4b375157375fd363c238Be82a9eDF84,(protocolEthShare/price));
        }
        totalPooledEther = latestEthBalance;
        pricePerShareStk = price;
    }
    
    function pushData(uint64 latestEthBalance, uint256 latestNonce, uint32 numberOfValidators) external{
        if(isOralce(msg.sender) == false)
            revert("Not oracle Member");
        uint256 currentFrameEpochId = _getCurrentEpochId(beaconData);
        require(currentFrameEpochId > lastCompletedEpochId, "Cannot push to Epoch less that already commited");   
        require(currentFrameEpochId >= _getFrameFirstEpochId(currentFrameEpochId, beaconData));
        require(currentFrameEpochId <= _getFrameFirstEpochId(currentFrameEpochId, beaconData) + beaconData.epochsPerTimePeriod);

        require(latestNonce == nonce.current(), "incorrect Nonce"); 
        bytes32 candidateId = keccak256(abi.encode(nonce, latestEthBalance, numberOfValidators));
        bytes32 voteId = keccak256(abi.encode(msg.sender, candidateId));
        require(!submittedVotes[voteId], "Oracles: already voted");


        // mark vote as submitted, update candidate votes number
        submittedVotes[voteId] = true;
        uint256 candidateNewVotes = candidates[candidateId]+1;
        candidates[candidateId] = candidateNewVotes;
        
        uint256 oraclesCount = oracleMember.length;
        if (candidateNewVotes > quorom) {
             // clean up votes
            delete submittedVotes[voteId];
            for (uint256 i = 0; i < oraclesCount; i++) {
                delete submittedVotes[keccak256(abi.encode(oracleMember[i], candidateId))];
            }

            // clean up candidate
            nonce.increment();
            delete candidates[candidateId];

            numberOfVal = numberOfValidators;
            lastCompletedEpochId = currentFrameEpochId;
            updatePricePershare(latestEthBalance);
        }
            uint256 timeElapsed = (currentFrameEpochId - lastCompletedEpochId *
            beaconData.slotsPerEpoch * beaconData.secondsPerSlot);
    }

    //DAO
    function updateBeaconChainData(uint64 epochsPerTimePeriod, uint64 slotsPerEpoch, uint64 secondsPerSlot, uint64 genesisTime) external{
        _setBeaconSpec(
            epochsPerTimePeriod,
            slotsPerEpoch,
            secondsPerSlot,
            genesisTime
        );
    }
        
    function _setBeaconSpec(
        uint64 _epochsPerTimePeriod,
        uint64 _slotsPerEpoch,
        uint64 _secondsPerSlot,
        uint64 _genesisTime
    )
        internal
    {
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