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

describe("Oracle", function () {
  let defaultSigner, user1, user2, oracle1, oracle2, oracle3, oracle4, oracle5;

  const epochsPerTimePeriod = 10;
  const slotsPerEpoch = 32;
  const secondsPerSlot = 12;
  const genesisTime = 1616508000;
  const pStakeCommisisons = 200;
  const valCommissions = 300;

  let stakingPool, treasury;

  before(async function () {
    // setup
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

    let Core = await ethers.getContractFactory("Core");
    this.core = await Core.deploy();

    await this.core.init();
    await this.core.set(await this.core.VALIDATOR_POOL(), stakingPool.address);
    await this.core.set(await this.core.PSTAKE_TREASURY(), treasury.address);

    let Issuer = await ethers.getContractFactory("Issuer");
    this.issuer = await Issuer.deploy(this.core.address, BigInt(1e32), 10);

    let Oracle = await ethers.getContractFactory("Oracle");

    this.stkEth = await ethers.getContractAt('StkEth' , await this.core.stkEth());

    this.oracle = await Oracle.deploy(
      epochsPerTimePeriod,
      slotsPerEpoch,
      secondsPerSlot,
      genesisTime,
      this.core.address,
      pStakeCommisisons,
      valCommissions
    );

    await this.core.set(await this.core.ORACLE(), this.oracle.address);

    await this.core.grantMinter(this.oracle.address);
    await this.core.grantMinter(this.issuer.address);
  });

  it("deploys successfully", async () => {
    const address = oracle1.address;

    expect(address).to.not.equal("0x0");
    expect(address).to.not.equal("");
    expect(address).to.not.equal(null);
    expect(address).to.not.equal(undefined);
  });

  it("shouldn't set quorom by a non-governor", async function () {
    // const address1 = user1.address;
    await expect(this.oracle.connect(user1).updateQuorom(2)).to.be.revertedWith(
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
  });

  it("should set quorom by a governor", async function () {
    await this.oracle.updateQuorom(2);

    expect(await this.oracle.Quorom()).to.equal(2);
  });

  it("should add oracle member correctly", async function () {
    await this.oracle.addOracleMember(oracle1.address);
    expect(await this.oracle.isOralce(oracle1.address)).to.equal(true);
    await expect(
      this.oracle.addOracleMember(oracle1.address)
    ).to.be.revertedWith("Oracle member already present");
  });

  it("should remove oracle member correctly", async function () {
    await this.oracle.addOracleMember(oracle2.address);
    await this.oracle.addOracleMember(oracle3.address);
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

  it("Should reaches Quorom", async function () {
    await this.issuer.connect(user1).stake({ value: BigInt(32e18) });

    await this.oracle.updateQuorom(2);

    let nonce = await this.oracle.currentNonce();

    await expect(
      this.oracle.connect(user1).pushData(32e9, nonce, 1)
    ).to.be.revertedWith("Not oracle Member");

    await expect(
      this.oracle.connect(oracle1).pushData(64e9, nonce, 3)
    ).to.be.revertedWith("Number of Validators or Balance incorrect");

    await expect(
      this.oracle.connect(oracle1).pushData(32e9, nonce + 1, 1)
    ).to.be.revertedWith("incorrect Nonce");

    await this.oracle.connect(oracle1).pushData(32e9, nonce, 1);

    await expect(
      this.oracle.connect(oracle1).pushData(32e9, nonce, 1)
    ).to.be.revertedWith("Oracles: already voted");

    await this.oracle.addOracleMember(oracle2.address);
    await this.oracle.connect(oracle2).pushData(32e9, nonce, 1);

    expect((await this.oracle.currentNonce()).toString()).to.equal(
      nonce.toString()
    );

    await this.oracle.connect(oracle3).pushData(32e9, nonce, 1);

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

  it("Should work in stimulation", async function () {
    await this.issuer.connect(user1).stake({ value: BigInt(32e18) });

    let nonce = parseInt(await this.oracle.currentNonce());

    let blockNumBefore = await ethers.provider.getBlockNumber();
    let blockBefore = await ethers.provider.getBlock(blockNumBefore);
    let timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_setNextBlockTimestamp", [
      timestampBefore + 864000,
    ]);
    await ethers.provider.send("evm_mine");

    await this.oracle.connect(oracle1).pushData(65e9, nonce, 2);
    await this.oracle.connect(oracle2).pushData(65e9, nonce, 2);
    await this.oracle.connect(oracle3).pushData(65e9, nonce, 2);
    let pricePerShare = await this.oracle.pricePerShare();
    let valEth = utils.parseEther((500/10000).toString());
    let pstakeEth = utils.parseEther((500/10000).toString());
    valEth = valEth.mul(utils.parseEther("1")).div(pricePerShare);
    pstakeEth = pstakeEth.mul(utils.parseEther("1")).div(pricePerShare);
    expect(await this.stkEth.balanceOf(stakingPool.address)).to.equal(valEth);

    expect(await this.stkEth.balanceOf(treasury.address)).to.equal(pstakeEth);
  });
});
