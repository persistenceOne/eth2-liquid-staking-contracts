const { ethers, network } = require("hardhat");
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

const increaseTime = async (seconds) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

describe("Oracle", function () {
  let defaultSigner, user1, user2, oracle1, oracle2, oracle3, oracle4, oracle5;

  const epochsPerTimePeriod = 10;
  const slotsPerEpoch = 32;
  const secondsPerSlot = 12;
  const genesisTime = 1616508000;
  const pStakeCommisisons = 200;
  const valCommissions = 300;

  let stakingPool, treasury;
  let pricePerShare;

  before(async function () {
    // setup 7406504622
    [
      defaultSigner,
      user1,
      user2,
      oracle1,
      oracle2,
      oracle3,
      oracle4,
      oracle5,
      treasury,
    ] = await ethers.getSigners();

    let StakingPool = await ethers.getContractFactory("DummyStakingPool");
    stakingPool = await StakingPool.deploy();

    let DepositContract = await ethers.getContractFactory(
      "DummyDepositContract"
    );
    this.depositContract = await DepositContract.deploy();

    let Core = await ethers.getContractFactory("Core");
    this.core = await Core.deploy();
    await this.core.init();

    let KeysManager = await ethers.getContractFactory("KeysManager");
    this.keysManager = await KeysManager.deploy(this.core.address);

    let Issuer = await ethers.getContractFactory("Issuer");
    this.issuer = await Issuer.deploy(
      this.core.address,
      BigInt(32e18),
      1000,
      this.depositContract.address
    );

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
      this.keysManager.address,
      pStakeCommisisons,
      valCommissions
    );

    await this.core.set(await this.core.VALIDATOR_POOL(), stakingPool.address);
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

    await this.core.grantMinter(this.oracle.address);
    await this.core.grantMinter(this.issuer.address);
    await this.core.grantKeyAdmin(defaultSigner.address);

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

    await this.oracle.addOracleMember(oracle1.address);
    await this.oracle.addOracleMember(oracle2.address);
    await this.oracle.addOracleMember(oracle3.address);

    this.oracle.updateQuorom(3);
    await this.oracle.updateCommissions(500, 500);
    this.oracle.updateValidatorQuorom(1);
  });

  beforeEach(async function () {
    snapshotId = await snapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("deploys successfully", async function () {
    const address = this.oracle.address;

    expect(address).to.not.equal("0x0");
    expect(address).to.not.equal("");
    expect(address).to.not.equal(null);
    expect(address).to.not.equal(undefined);
  });

  it("shouldn't set quorom by a non-governor", async function () {
    await expect(this.oracle.connect(user1).updateQuorom(3)).to.be.revertedWith(
      "CoreRef: Caller is not a governor"
    );
    await expect(this.oracle.connect(user1).updateValidatorQuorom(3)).to.be.revertedWith(
      "CoreRef: Caller is not a governor"
    );
  });

  it("shouldn't set negavtive quorom", async function () {
    try {
      await this.oracle.updateQuorom(-1);
    } catch (error) {
      err = error;
    }
    // Assert
    expect(err).to.not.equal(null);
    try {
      await this.oracle.updateValidatorQuorom(-1);
    } catch (error) {
      err = error;
    }
    // Assert
    expect(err).to.not.equal(null);
  });

  it("should set quorom by a governor", async function () {
    await this.oracle.updateQuorom(3);

    expect(await this.oracle.Quorom()).to.equal(3);
  });

  it("should not add already present oracle member", async function () {
    expect(await this.oracle.isOralce(oracle1.address)).to.equal(true);
    await expect(
      this.oracle.addOracleMember(oracle1.address)
    ).to.be.revertedWith("Oracle member already present");
  });

  it("should remove oracle member correctly", async function () {
    await this.oracle.removeOracleMember(oracle2.address);
    expect(await this.oracle.isOralce(oracle2.address)).to.equal(false);
  });

  it("Should updates Beacon Chain Data", async function () {
    await expect(
      this.oracle.connect(user1).updateBeaconChainData(10, 32, 12, 1616508000)
    ).to.be.revertedWith("CoreRef: Caller is not a governor");

    await this.oracle.updateBeaconChainData(10, 32, 12, 1616508000);
    let beaconData = await this.oracle.getBeaconData();

    expect(beaconData.epochsPerTimePeriod.toString()).to.equal("10");
    expect(beaconData.slotsPerEpoch.toString()).to.equal("32");
    expect(beaconData.secondsPerSlot.toString()).to.equal("12");
    expect(beaconData.genesisTime.toString()).to.equal("1616508000");
  });

  it("Should reach Quorom to activate validator", async function () {
    await this.oracle.updateValidatorQuorom(3);
    await expect(
      this.oracle
        .connect(user1)
        .activateValidator([
          "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712",
          "0xb5832ad35f7713558987ce0317a480d1db394efd2b2c4a811db7bce7158bc53c8aec1ca17ea9753a2468bc9850a88ee7",
        ])
    ).to.be.revertedWith("Not oracle Member");

    await this.oracle
      .connect(oracle1)
      .activateValidator([
        "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712",
        "0xb5832ad35f7713558987ce0317a480d1db394efd2b2c4a811db7bce7158bc53c8aec1ca17ea9753a2468bc9850a88ee7",
      ]);

    await expect(
      this.oracle
        .connect(oracle1)
        .activateValidator([
          "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712",
          "0xb5832ad35f7713558987ce0317a480d1db394efd2b2c4a811db7bce7158bc53c8aec1ca17ea9753a2468bc9850a88ee7",
        ])
    ).to.be.revertedWith("Oracles: already voted");

    await this.oracle
      .connect(oracle2)
      .activateValidator([
        "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712",
        "0xb5832ad35f7713558987ce0317a480d1db394efd2b2c4a811db7bce7158bc53c8aec1ca17ea9753a2468bc9850a88ee7",
      ]);
    val = await this.keysManager
      .connect(user1)
      .validators(
        "0xb5832ad35f7713558987ce0317a480d1db394efd2b2c4a811db7bce7158bc53c8aec1ca17ea9753a2468bc9850a88ee7"
      );
    expect(val.state.toString()).to.equal("1");
    val = await this.keysManager
      .connect(user1)
      .validators(
        "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712"
      );
    expect(val.state.toString()).to.equal("1");
    await this.oracle
      .connect(oracle3)
      .activateValidator([
        "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712",
        "0xb5832ad35f7713558987ce0317a480d1db394efd2b2c4a811db7bce7158bc53c8aec1ca17ea9753a2468bc9850a88ee7",
      ]);

    val = await this.keysManager
      .connect(user1)
      .validators(
        "0xb5832ad35f7713558987ce0317a480d1db394efd2b2c4a811db7bce7158bc53c8aec1ca17ea9753a2468bc9850a88ee7"
      );
    expect(val.state.toString()).to.equal("2");
    val = await this.keysManager
      .connect(user1)
      .validators(
        "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712"
      );
    expect(val.state.toString()).to.equal("2");

    await expect(
      this.oracle
        .connect(oracle1)
        .activateValidator([
          "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712",
          "0xb5832ad35f7713558987ce0317a480d1db394efd2b2c4a811db7bce7158bc53c8aec1ca17ea9753a2468bc9850a88ee7",
        ])
    ).to.be.revertedWith("voted before an hour");

    await increaseTime(3601);

    await this.oracle
      .connect(oracle1)
      .activateValidator([
        "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951",
      ]);
    await this.oracle
      .connect(oracle2)
      .activateValidator([
        "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951",
      ]);
    val = await this.keysManager
      .connect(user1)
      .validators(
        "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951"
      );
    expect(val.state.toString()).to.equal("1");

    await this.oracle
      .connect(oracle3)
      .activateValidator([
        "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951",
      ]);
    val = await this.keysManager
      .connect(user1)
      .validators(
        "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951"
      );
    expect(val.state.toString()).to.equal("2");
  });

  it("Should reach Quorom to push data", async function () {
    await this.issuer.connect(user1).stake({ value: BigInt(32e18) });
    await this.oracle
    .connect(oracle2)
    .activateValidator([
      "0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34",
    ]);
    await this.issuer.depositToEth2(
      "0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34"
    );

    await this.issuer.connect(user1).stake({ value: BigInt(32e18) });

    let nonce = await this.oracle.currentNonce();

    await expect(
      this.oracle.connect(user1).pushData(BigInt(32e9), nonce, 1)
    ).to.be.revertedWith("Not oracle Member");

    await expect(
      this.oracle.connect(oracle1).pushData(BigInt(64e9), nonce, 3)
    ).to.be.revertedWith("Number of Validators or Balance incorrect");

    await expect(
      this.oracle.connect(oracle1).pushData(BigInt(32e9), nonce + 1, 1)
    ).to.be.revertedWith("incorrect Nonce");

    await this.oracle.connect(oracle1).pushData(BigInt(32e9), nonce, 1);

    await expect(
      this.oracle.connect(oracle1).pushData(BigInt(32e9), nonce, 1)
    ).to.be.revertedWith("Oracles: already voted");

    await this.oracle.connect(oracle2).pushData(BigInt(32e9), nonce, 1);

    expect((await this.oracle.currentNonce()).toString()).to.equal(
      nonce.toString()
    );

    await this.oracle.connect(oracle3).pushData(BigInt(32e9), nonce, 1);

    expect(await this.oracle.currentNonce()).to.be.equal(nonce + 1);
    expect(await this.oracle.getTotalEther()).to.be.equal(BigInt(32e18));
  });

  it("Should update commissions", async function () {
    await expect(this.oracle.updateCommissions(10001, 10)).to.be.revertedWith(
      "Invalid values"
    );
    await expect(this.oracle.updateCommissions(10, 10001)).to.be.revertedWith(
      "Invalid values"
    );
    await expect(this.oracle.updateCommissions(5000, 5000)).to.be.revertedWith(
      "Invalid values"
    );
    await this.oracle.updateCommissions(500, 500);
  });

  describe("Should implement distributeRewards", function () {
    it("Should update Price Per Share", async function () {
      await this.issuer.connect(user1).stake({ value: BigInt(64e18) });
      await this.oracle
      .connect(oracle2)
      .activateValidator([
        "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951",
        "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712",
      ]);
      await this.issuer.depositToEth2(
        "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951"
      );
      await this.issuer.depositToEth2(
        "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712"
      );

      let nonce = parseInt(await this.oracle.currentNonce());

      await this.oracle.connect(oracle1).pushData(BigInt(65e9), nonce, 2);
      await this.oracle.connect(oracle2).pushData(BigInt(65e9), nonce, 2);
      await this.oracle.connect(oracle3).pushData(BigInt(65e9), nonce, 2);

      it("Should update Treasury Balance", async function () {
        pricePerShare = await this.oracle.pricePerShare();
        let pstakeEth = utils.parseEther((500 / 10000).toString());
        pstakeEth = pstakeEth.mul(utils.parseEther("1")).div(pricePerShare);
        expect(await this.stkEth.balanceOf(treasury.address)).to.equal(
          pstakeEth
        );
      });

      it("Should update stakingPool Balance", async function () {
        pricePerShare = await this.oracle.pricePerShare();
        let valEth = utils.parseEther((500 / 10000).toString());
        valEth = valEth.mul(utils.parseEther("1")).div(pricePerShare);
        expect(await this.stkEth.balanceOf(stakingPool.address)).to.equal(
          valEth
        );
      });
    });
  });

  describe("Should implement slashing", function () {
    it("Should slashing work", async function () {
      let nonce = parseInt(await this.oracle.currentNonce());

      await this.issuer.connect(user1).stake({ value: BigInt(32e18) });
     
      await this.oracle
      .connect(oracle2)
      .activateValidator([
        "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712",
        "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951",
      ]);

      await this.issuer.depositToEth2(
        "0xa908f145cecb1adfb69d78cef5c43dd29f9236d739161d83c7eef577f6a3d52a3f059e31590b5d685c87931739d09951"
      );

      await this.oracle.connect(oracle1).pushData(BigInt(32e9), nonce, 1);
      await this.oracle.connect(oracle2).pushData(BigInt(32e9), nonce, 1);
      await this.oracle.connect(oracle3).pushData(BigInt(32e9), nonce, 1);

      await this.issuer.connect(user2).stake({ value: BigInt(32e18) });

      await this.issuer.depositToEth2(
        "0xa71aee2aabea9b69daf14a494d91b1edea3ab25ae3d2f3a9b2269bc7b05268d6b6745307bd7ee7cccf5338a9b2a23712"
      );

      nonce = parseInt(await this.oracle.currentNonce());
      await increaseTime(420);
      await this.oracle.connect(oracle1).pushData(BigInt(66e9), nonce, 2);
      await this.oracle.connect(oracle2).pushData(BigInt(66e9), nonce, 2);
      await this.oracle.connect(oracle3).pushData(BigInt(66e9), nonce, 2);

      let pricePerShare = await this.oracle.pricePerShare();
      console.log("pricePerShare", pricePerShare);

      nonce = parseInt(await this.oracle.currentNonce());
      await increaseTime(420);
      await this.oracle.connect(oracle1).pushData(BigInt(65e9), nonce, 2);
      await this.oracle.connect(oracle2).pushData(BigInt(65e9), nonce, 2);
      await this.oracle.connect(oracle3).pushData(BigInt(65e9), nonce, 2);

      let newPricePerShare = await this.oracle.pricePerShare();
      expect(pricePerShare).to.be.above(newPricePerShare);

      // let stkEthToSlash = utils.parseEther("1").div(pricePerShare);

      // expect(await this.stkEth.balanceOf(stakingPool.address)).to.equal(((valEth.sub(stkEthToSlash))));
    });
  });
});
