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
  let pStakeCommisisons = 200;
  let valCommissions = 300;

  before(async function () {
    // setup
    [defaultSigner, user1, user2, oracle1, oracle2, oracle3, oracle4, oracle5] =
      await ethers.getSigners();

    let StakingPool = await ethers.getContractFactory("DummyStakingPool");
    let stakingPool = await StakingPool.deploy();

    let Core = await ethers.getContractFactory("Core");
    this.core = await Core.deploy();

    await this.core.init();
    await this.core.set(await this.core.VALIDATOR_POOL(), stakingPool.address);
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

  it("Updates Beacon Chain Data", async function () {
    await expect(
      this.oracle.connect(user1).updateBeaconChainData(30, 20, 10, 100)
    ).to.be.revertedWith("CoreRef: Caller is not a governor");

    await this.oracle.updateBeaconChainData(30, 20, 10, 100);
    let beaconData = await this.oracle.getBeaconData();

    expect(beaconData.epochsPerTimePeriod.toString()).to.equal("30");
    expect(beaconData.slotsPerEpoch.toString()).to.equal("20");
    expect(beaconData.secondsPerSlot.toString()).to.equal("10");
    expect(beaconData.genesisTime.toString()).to.equal("100");
  });

  it("Reaches Quorom", async function () {
    await this.oracle.updateQuorom(2);

    let nonce = await this.oracle.currentNonce();

    await expect(
      this.oracle.connect(user1).pushData(1, nonce, 5)
    ).to.be.revertedWith("Not oracle Member");

    await expect(
      this.oracle.connect(oracle1).pushData(1, nonce + 1, 5)
    ).to.be.revertedWith("incorrect Nonce");

    await this.oracle.connect(oracle1).pushData(1, nonce, 5);

    await expect(
      this.oracle.connect(oracle1).pushData(1, nonce, 5)
    ).to.be.revertedWith("Oracles: already voted");

    await this.oracle.addOracleMember(oracle2.address);
    await this.oracle.connect(oracle2).pushData(1, nonce, 5);

    expect((await this.oracle.currentNonce()).toString()).to.equal(
      nonce.toString()
    );

    await this.oracle.connect(oracle3).pushData(1, nonce, 5);

    expect(await this.oracle.currentNonce()).to.be.equal(nonce + 1);
    expect(await this.oracle.getTotalEther()).to.be.equal(1);
  });
});
