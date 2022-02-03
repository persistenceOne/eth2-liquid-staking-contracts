//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IStakingPool } from "./interfaces/IStakingPool.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IUniswapRouter } from "./interfaces/external/IUniswapRouter.sol";
import {IStkEth} from "./interfaces/IStkEth.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ICore} from "./interfaces/ICore.sol";
import {IOracle} from "./interfaces/IOracle.sol";
import {IIssuer} from "./interfaces/IIssuer.sol";
import {IKeysManager} from "./interfaces/IKeysManager.sol";

contract StakingPool is IStakingPool, OwnableUpgradeable{

    struct UserInfo {
        uint256 amount;     // How many validators the user has provided.
        uint256 rewardDebt; // Reward debt
    }


    IERC20 public pstake;

    IUniswapRouter public router;

    address public WETH;

    IStkEth public stkEth;

    ICore public core;

    uint256 public accRewardPerValidator;


    mapping(address => UserInfo) public userInfos;

    function initialize (IERC20 _pstake, IUniswapRouter _router, ICore _core, address _weth) 
        public initializer 
    {
        __Ownable_init();
        pstake = _pstake;
        core = _core;
        stkEth = core.stkEth();
        router = _router;
        WETH = _weth;
    }


    function updateRewardPerValidator(uint256 newReward) public override {

        uint256 totalValidators = IOracle(core.oracle()).activatedValidators() + IIssuer(core.issuer()).pendingValidators();
        
        stkEth.transferFrom(_msgSender(), address(this), newReward);

        accRewardPerValidator += newReward*1e12/totalValidators;
    }

    function claimAndUpdateRewardDebt(address usr) external override {
        
        UserInfo storage user = userInfos[usr];

        uint256 userValidators = IKeysManager(core.keysManager()).nodeOperatorValidatorCount(usr);

        uint256 pending = (accRewardPerValidator*user.amount/1e12) - user.rewardDebt;

        if(pending > 0){
            stkEth.transfer(usr, pending);
        }

        user.rewardDebt = accRewardPerValidator*userValidators/1e12; 
        user.amount = userValidators;
    }

    // function stake(uint256 amount) external {

    //     pstake.transferFrom(_msgSender(), address(this), amount);

    //     uint256 shares = calcShares(amount);
    //     userShare[_msgSender()] = userShare[_msgSender()] + shares;

    //     totalShares = totalShares + shares;
    //     totalStake = totalStake + amount;
    // }


    // function calcShares(uint256 amount) public view returns (uint256 shares){
    //     if(totalStake == 0 && totalShares == 0){
    //         shares = amount;
    //     }else{
    //         shares = amount * totalShares/totalStake;
    //     }
    // }
    


    function slash(uint256 amount) external override {

        require(_msgSender() == core.oracle(), "StakingPool: only oracle can call to slash");

        address[] memory path = new address[](3);
        path[0] = address(pstake);
        path[1] = WETH;
        path[2] = address(stkEth);
        uint256[] memory amountsIn = router.getAmountsIn(amount, path);
        uint256 pstakeBalance = pstake.balanceOf(address(this));
        if(amountsIn[0] > pstakeBalance){
            pstake.approve(address(router), pstakeBalance);
            router.swapExactTokensForTokens(pstakeBalance, 0, path, address(this), block.timestamp + 100);
        }else{
            pstake.approve(address(router), amountsIn[0]);
            router.swapTokensForExactTokens(amount, amountsIn[0], path, address(this), block.timestamp + 100);
        }

        stkEth.burn(address(this), stkEth.balanceOf(address(this)));

    }

    function numOfValidatorAllowed(address usr) public view override returns (uint256) {

        return type(uint256).max;
    }

    

}