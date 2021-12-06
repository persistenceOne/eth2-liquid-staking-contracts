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

    let Core = await ethers.getContractFactory("Core");
    this.core = await Core.deploy();

    await this.core.init();
    await this.core.set(await this.core.VALIDATOR_POOL(), stakingPool.address);
    await this.core.set(await this.core.PSTAKE_TREASURY(), treasury.address);

    let Issuer = await ethers.getContractFactory("Issuer");
    this.issuer = await Issuer.deploy(this.core.address, BigInt(1e32), 2);

    this.stkEth = await ethers.getContractAt(
      "StkEth",
      await this.core.stkEth()
    );

    await this.core.grantMinter(this.issuer.address);
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

    await this.core.set(await this.core.ORACLE(), this.oracle.address);

    await this.oracle.updateQuorom(2);
    await this.oracle.addOracleMember(oracle1.address);
    await this.oracle.addOracleMember(oracle2.address);
    await this.oracle.addOracleMember(oracle3.address);
  });

  it("deploys successfully", async function () {
    const address = this.issuer.address;
    console.log("adress", this.issuer.address);

    expect(address).to.not.equal("0x0");
    expect(address).to.not.equal("");
    expect(address).to.not.equal(null);
    expect(address).to.not.equal(undefined);
  });

  it("should set minimum activating deposit", async function () {
    let err;
    try {
      await this.issuer.setMinActivatingDeposit(2);
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
      await this.issuer.setPendingValidatorsLimit(2);
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

  it("should ", async function () {
    let nonce = await this.oracle.currentNonce();

    await this.oracle.connect(oracle1).pushData(64e9, nonce, 2);
    await this.oracle.connect(oracle2).pushData(64e9, nonce, 2);
    await this.oracle.connect(oracle3).pushData(64e9, nonce, 2);
    await this.issuer.connect(user1).stake({ value: BigInt(100e18) });
  });
});
