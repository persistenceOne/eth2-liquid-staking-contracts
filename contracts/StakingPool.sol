//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IStakingPool } from "./interfaces/IStakingPool.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IUniswapRouter } from "./interfaces/external/IUniswapRouter.sol";
import {IStkEth} from "./interfaces/IStkEth.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ICore} from "./interfaces/ICore.sol";

contract StakingPool is IStakingPool, OwnableUpgradeable{

    IERC20 public pstake;

    mapping(address => uint256) public userShare;

    uint256 totalShares = 0;

    uint256 totalStake = 0;

    IUniswapRouter public router;

    address public WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    IStkEth public stkEth;

    ICore public core;

    function initialize (IERC20 _pstake, IUniswapRouter _router, ICore _core) 
        public initializer 
    {
        __Ownable_init();
        pstake = _pstake;
        core = _core;
        stkEth = core.stkEth();
        router = _router;
    }


    function stake(uint256 amount) external {

        pstake.transferFrom(_msgSender(), address(this), amount);

        uint256 shares = calcShares(amount);
        userShare[_msgSender()] = userShare[_msgSender()] + shares;

        totalShares = totalShares + shares;
        totalStake = totalStake + amount;
    }


    function calcShares(uint256 amount) public view returns (uint256 shares){
        if(totalStake == 0 && totalShares == 0){
            shares = amount;
        }else{
            shares = amount * totalShares/totalStake;
        }
    }
    


    function slash(uint256 amount) external override {

        require(_msgSender() == core.oracle(), "StakingPool: only oracle can call to slash");

        address[] memory path = new address[](3);
        path[0] = address(pstake);
        path[1] = WETH;
        path[2] = address(stkEth);
        uint256[] memory amountsIn = router.getAmountsIn(amount, path);

        if(amountsIn[0] > totalStake){
            pstake.approve(address(router), totalStake);
            router.swapExactTokensForTokens(totalStake, 0, path, address(this), block.timestamp + 100);
        }else{
            pstake.approve(address(router), amountsIn[0]);
            router.swapTokensForExactTokens(amount, amountsIn[0], path, address(this), block.timestamp + 100);
        }

        stkEth.burn(address(this), stkEth.balanceOf(address(this)));

    }

}