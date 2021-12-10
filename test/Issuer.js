const { ethers } = require("hardhat");
const { expect } = require("chai");
const { utils } = require("ethers");
const { BigNumber, constants } = ethers;
const { AddressZero, MaxUint256, MaxInt256 } = constants;

const approveMAX = async (erc20, signer, to, amount) => {
  if ((await erc20.allowance(signer.address, to)).lt(amount)) {
    let tx = await erc20.connect(signer).approve(to, MaxUint256);
    await tx.wait();
  }
};

const balanceOf = async (erc20, userAddress) => {
  return await erc20.balanceOf(userAddress);
};

describe("Issuer", function () {
  let defaultSigner, user1, user2, oracle1, oracle2, oracle3;
  let totalSupply = 0;
  let stakingPool, treasury;

  before(async function () {
    // setup
    const epochsPerTimePeriod = 10;
    const slotsPerEpoch = 32;
    const secondsPerSlot = 12;
    const genesisTime = 1616508000;
    const pStakeCommisisons = 200;

    const valCommissions = 300;
    [defaultSigner, user1, user2, treasury, oracle1, oracle2, oracle3] =
      await ethers.getSigners();

    let StakingPool = await ethers.getContractFactory("DummyStakingPool");
    stakingPool = await StakingPool.deploy();

    let DepositContract = await ethers.getContractFactory("DummyDepositContract");
    this.depositContract = await DepositContract.deploy();

    let Core = await ethers.getContractFactory("Core");
    this.core = await Core.deploy();
    await this.core.init();

    let KeysManager = await ethers.getContractFactory("KeysManager");
    this.keysManager = await KeysManager.deploy(this.core.address);

    let Issuer = await ethers.getContractFactory("Issuer");
    this.issuer = await Issuer.deploy(this.core.address, BigInt(32e18), 1000, this.depositContract.address);

    this.stkEth = await ethers.getContractAt(
      "StkEth",
      await this.core.stkEth()
    );

    let Oracle = await ethers.getContractFactory("Oracle");

    this.oracle = await Oracle.deploy(
      epochsPerTimePeriod,
      slotsPerEpoch,
      secondsPerSlot,
      genesisTime,
      this.core.address,
      pStakeCommisisons,
      valCommissions
    );

    await this.core.set(await this.core.VALIDATOR_POOL(), stakingPool.address);
    await this.core.set(await this.core.PSTAKE_TREASURY(), treasury.address);
    await this.core.setWithdrawalCredential("0x0100000000000000000000003d80b31a78c30fc628f20b2c89d7ddbf6e53cedc");
    await this.core.set(await this.core.KEYS_MANAGER(), this.keysManager.address);
    await this.core.set(await this.core.ORACLE(), this.oracle.address);
    await this.core.set(await this.core.ISSUER(), this.issuer.address);


    await this.oracle.updateQuorom(2);
    await this.oracle.addOracleMember(oracle1.address);
    await this.oracle.addOracleMember(oracle2.address);
    await this.oracle.addOracleMember(oracle3.address);

    await this.core.grantMinter(this.issuer.address);
      //  await this.keysManager.addValidator("0x905c81057079fe5e19321d2cf2e86bda56119d92da6731be0bf2b4b98b086b0d8ff8748d724c5d6f48b2dd5fd18dd202",{"state": 0 , "signature": "0x82c967218f3279bc1a7ca42911da60d275b4f557a6d6e7e9d0c3969ec4ee91c9543c87a76b1c9bb1c4cb47212d601323117b8ff8c0096129200e83ce02025ed3096a7a525d5adbba1d9a6c342fe79207da0f7ebbdb5f0eb0cba36b8eb234aec3","nodeOperator":"0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc", "deposit_root": "0x70b18fc143b6df2d0cc81e5705b8e0665c588140ca6ac4292138b7dc951ffe92"})
      await this.keysManager.connect(defaultSigner).addValidator("0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34","0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d", "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc");
      await this.keysManager.connect(defaultSigner).addValidator("0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951","0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d", "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc");
      await this.keysManager.connect(defaultSigner).addValidator("0xb5832ad35f7713558987ce0317a480d1db394efd2b2c4a811db7bce7158bc53c8aec1ca17ea9753a2468bc9850a88ee7","0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d", "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc");
      await this.keysManager.connect(defaultSigner).addValidator("0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712","0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d", "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc");

      console.log("depositRootView",await this.keysManager.depositRootView())
      console.log("withdrawlCredsView", await this.core.withdrawalCredential())
      // console.log("withdrawlCredsViewBytes32", await this.keysManager.withdrawlCredsViewBytes32())

  });
  it("deploys successfully", async function () {    

    const address = this.issuer.address;
    expect(address).to.not.equal("0x0");
    expect(address).to.not.equal("");
    expect(address).to.not.equal(null);
    expect(address).to.not.equal(undefined);
  });

  it("should set minimum activating deposit", async function () {
    let err;
    try {
      await this.issuer.setMinActivatingDeposit(BigInt(32e18));
    } catch (error) {
      err = error;
    }
    // Assert
    expect(err).to.not.equal(null);
  });


  it("should set pending validator limit", async function () {
    let err;
    await expect(
      this.issuer.setPendingValidatorsLimit(10000)
    ).to.be.revertedWith("Issuer: invalid limit");
    try {
      await this.issuer.setPendingValidatorsLimit(1000);
    } catch (error) {
      err = error;
    }
    // Assert
    expect(err).to.not.equal(null);
  });

  it("should not stake less that 0", async function () {
    await expect(this.issuer.stake({ value: 0 })).to.be.revertedWith(
      "Issuer: can't stake zero"
    );
  });

  it("should mint stkEth", async function () {
    await this.issuer.connect(user1).stake({ value: BigInt(1e18) });
    let pricePerShare = await this.stkEth.pricePerShare();
    stkEthToMint = (1e18 * 1e18) / pricePerShare;
    expect(BigInt(await this.stkEth.balanceOf(user1.address))).to.equal(
      BigInt(stkEthToMint)
    );
  });

  it("should not mint when pending validator limit exceed", async function () {
    totalSupply = await this.stkEth.totalSupply();
    let nonce = await this.oracle.currentNonce();

    await this.issuer.connect(user1).stake({ value: BigInt(63e18)});

    await this.oracle.connect(oracle1).pushData(BigInt(64e9), nonce, 2);
    await this.oracle.connect(oracle2).pushData(BigInt(64e9), nonce, 2);
    await this.oracle.connect(oracle3).pushData(BigInt(64e9), nonce, 2);
 
    expect(totalSupply).to.equal(await this.stkEth.totalSupply());
    await this.issuer.depositToEth2("0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34")
    await this.issuer.depositToEth2("0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951")

    await this.issuer.connect(user1).stake({ value: BigInt(64e18)});
    expect(totalSupply).to.equal(await this.stkEth.totalSupply());
    let balanceOfDeposit = await this.depositContract.balance()
    console.log("balance", balanceOfDeposit.toString());
  });
});