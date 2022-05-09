const { ethers, network, upgrades} = require("hardhat");
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

const rpcCall = async (callType, params) => {
  return await network.provider.request({
    method: callType,
    params: params,
  });
};

const snapshot = async () => {
  return await rpcCall("evm_snapshot", []);
};

const revertToSnapshot = async (snapId) => {
  return await rpcCall("evm_revert", [snapId]);
};

describe("Issuer", function () {
  let defaultSigner, user1, user2, user3, oracle1, oracle2, oracle3;
  let totalSupply = 0;
  let stakingPool, treasury;
  let snapshotId;

  before(async function () {
    // setup
    const epochsPerTimePeriod = 10;
    const slotsPerEpoch = 32;
    const secondsPerSlot = 12;
    const genesisTime = 1616508000;
    const pStakeCommisisons = 500;

    const valCommissions = 500;
    [
      defaultSigner,
      user1,
      user2,
      oracle1,
      oracle2,
      oracle3,
      oracle4,
      nodeOperator1,
      nodeOperator2,
      nodeOperator3,
      treasury,
    ] = await ethers.getSigners();

    let DepositContract = await ethers.getContractFactory(
        "DummyDepositContract"
    );
    this.depositContract = await DepositContract.deploy();

    let Core = await ethers.getContractFactory("Core");
    this.core = await Core.deploy();

    let Stketh = await ethers.getContractFactory("StkEth")
    this.stketh = await Stketh.attach(await this.core.stkEth())
    let StakingPool = await ethers.getContractFactory("StakingPool");
    this.stakingPool = await upgrades.deployProxy(StakingPool,[this.depositContract.address, "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", this.core.address, "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"],{ initializer: 'initialize' });
    await this.stakingPool.deployed();

    let KeysManager = await ethers.getContractFactory("KeysManager");
    this.keysManager = await KeysManager.deploy(this.core.address);

    let Issuer = await ethers.getContractFactory("Issuer");
    this.issuer = await Issuer.deploy(
        this.core.address,
        1000,
        this.depositContract.address
    );
    await this.core.set(await this.core.VALIDATOR_POOL(), this.stakingPool.address)
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

    await this.core.set(await this.core.VALIDATOR_POOL(), this.stakingPool.address);
    await this.core.set(await this.core.PSTAKE_TREASURY(), treasury.address);
    await this.core.setWithdrawalCredential(
      "0x0100000000000000000000003d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
    );
    await this.core.set(
      await this.core.KEYS_MANAGER(),
      this.keysManager.address
    );
    await this.core.set(await this.core.ORACLE(), this.oracle.address);
    await this.core.set(await this.core.ISSUER(), this.issuer.address);

    await this.oracle.updateQuorom(3);
    await this.oracle.addOracleMember(oracle1.address);
    await this.oracle.addOracleMember(oracle2.address);
    await this.oracle.addOracleMember(oracle3.address);

    await this.core.grantMinter(this.oracle.address);
    await this.core.grantMinter(this.issuer.address);
    await this.core.grantKeyAdmin(defaultSigner.address);
    await this.core.grantNodeOperator(defaultSigner.address);

    await this.keysManager
      .connect(defaultSigner)
      .addValidator(
        "0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );
    await this.keysManager
      .connect(defaultSigner)
      .addValidator(
        "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );
    await this.keysManager
      .connect(defaultSigner)
      .addValidator(
        "0xb5832ad35f7713558987ce0317a480d1db394efd2b2c4a811db7bce7158bc53c8aec1ca17ea9753a2468bc9850a88ee7",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );
    await this.keysManager
      .connect(defaultSigner)
      .addValidator(
        "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );
    await this.keysManager
      .connect(defaultSigner)
      .addValidator(
        "0xa7ada7935ccba746f5b998ddfec51002fc7728d52d1772ef39bb2a60eae9da28d9c1b927032780d5247043d5a39e3301",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );
    await this.keysManager
      .connect(defaultSigner)
      .addValidator(
        "0x8b67bf3b5d12dc5d727538b4d9b745aee17a2971beecfc999ad54a53c2827996b4d47460a19f42f350582b86bdb2a2a5",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );
    await this.keysManager
      .connect(defaultSigner)
      .addValidator(
        "0x8d11dd32ec39e2ccc2a0084999644f34cfa290e24438d3cd0224504399ace4d83356e497e96bb8172e6fc9450410e628",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );

    await this.keysManager
      .connect(defaultSigner)
      .addValidator(
        "0x8fb45ee750f417b0653056ba4c0b81c1821303f20bb8310a001a6bf5b6a6c1b67ef96249e83197b378917914ded09e0e",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );
    await this.keysManager
      .connect(defaultSigner)
      .addValidator(
        "0x8d0984d2ac0851de4e47e941fe0147c727a991895538aa42d30458650a0e55c4b45cc4fe10709ed14c6db6add99b4dd9",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );
    await this.keysManager
      .connect(defaultSigner)
      .addValidator(
        "0xb0b01b2edf42e67f6ccf9b68c2ae1834771b17efa1115000b726b2a2982eeaef3c316ea91b230be6aed8f5d221952162",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );

    await this.oracle.updateValidatorQuorom(1);    
    await this.oracle
    .connect(oracle1)
    .activateValidator([
      "0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34",
      "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951",
      "0x8d0984d2ac0851de4e47e941fe0147c727a991895538aa42d30458650a0e55c4b45cc4fe10709ed14c6db6add99b4dd9",
      "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712",
      "0x8b67bf3b5d12dc5d727538b4d9b745aee17a2971beecfc999ad54a53c2827996b4d47460a19f42f350582b86bdb2a2a5",
      "0x8d11dd32ec39e2ccc2a0084999644f34cfa290e24438d3cd0224504399ace4d83356e497e96bb8172e6fc9450410e628",
      "0x8fb45ee750f417b0653056ba4c0b81c1821303f20bb8310a001a6bf5b6a6c1b67ef96249e83197b378917914ded09e0e",  
      "0xa7ada7935ccba746f5b998ddfec51002fc7728d52d1772ef39bb2a60eae9da28d9c1b927032780d5247043d5a39e3301",
    ]);
  });

  beforeEach(async function () {
    snapshotId = await snapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("deploys successfully", async function () {
    const address = this.issuer.address;
    expect(address).to.not.equal("0x0");
    expect(address).to.not.equal("");
    expect(address).to.not.equal(null);
    expect(address).to.not.equal(undefined);
  });

  it("should not add validator from a non-permission account", async function () {
    await expect(
      this.keysManager
        .connect(user1)
        .addValidator(
          "0xacbf72fd32a6baf8a8b35b6598c4b9b5640b0f073d1616be0042dd24b7d28d89249e656caf6298d9a388423a6725f7ed",
          "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
          "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
        )
    ).to.be.revertedWith("Permissions: Caller is not a Node Operator");
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
    let pricePerShare = await this.stketh.pricePerShare();
    stkEthToMint = (1e18 * 1e18) / pricePerShare;
    expect(BigInt(await this.stketh.balanceOf(user1.address))).to.equal(
      BigInt(stkEthToMint)
    );
  });
  describe("keysmanager",function (){
    it("should not make deposit for validator when less than 32 eth in pool",async function(){
      await this.issuer.connect(user1).stake({ value: BigInt(31e18) });
      await expect(this.issuer.depositToEth2("0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34")).to.be.revertedWith("Issuer: Not enough ether deposited")
    })
    it("should not make deposit for validator when key not activated ",async function(){
      await this.issuer.connect(user1).stake({ value: BigInt(64e18) });
      await expect(this.issuer.depositToEth2("0xb0b01b2edf42e67f6ccf9b68c2ae1834771b17efa1115000b726b2a2982eeaef3c316ea91b230be6aed8f5d221952162")).to.be.revertedWith("KeysManager: Key not activated")

    })
    it("should make deposit for validator when key activated and amount more than 32 eth in pool",async function(){
      await this.issuer.connect(user1).stake({ value: BigInt(64e18) });
      await this.issuer.depositToEth2("0x8b67bf3b5d12dc5d727538b4d9b745aee17a2971beecfc999ad54a53c2827996b4d47460a19f42f350582b86bdb2a2a5")
      expect((await this.keysManager.validators("0x8b67bf3b5d12dc5d727538b4d9b745aee17a2971beecfc999ad54a53c2827996b4d47460a19f42f350582b86bdb2a2a5"))[0]).to.be.equal(3);
    })
  })

});
