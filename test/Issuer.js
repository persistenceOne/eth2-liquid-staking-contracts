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
    this.issuer = await Issuer.deploy(this.core.address, BigInt(32e32), 1000, this.depositContract.address);

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
    await this.core.set(await this.core.WITHDRAWAL_CREDENTIAL(), "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc");
    await this.core.set(await this.core.KEYS_MANAGER(), this.keysManager.address);
    await this.core.set(await this.core.ORACLE(), this.oracle.address);
    await this.core.set(await this.core.ISSUER(), this.issuer.address);


    await this.oracle.updateQuorom(2);
    await this.oracle.addOracleMember(oracle1.address);
    await this.oracle.addOracleMember(oracle2.address);
    await this.oracle.addOracleMember(oracle3.address);

    await this.core.grantMinter(this.issuer.address);
    // web3.utils.hexToBytes('70b18fc143b6df2d0cc81e5705b8e0665c588140ca6ac4292138b7dc951ffe92');
    // let val_array = Array({"state":  , "signature": "0x82c967218f3279bc1a7ca42911da60d275b4f557a6d6e7e9d0c3969ec4ee91c9543c87a76b1c9bb1c4cb47212d601323117b8ff8c0096129200e83ce02025ed3096a7a525d5adbba1d9a6c342fe79207da0f7ebbdb5f0eb0cba36b8eb234aec3","nodeOperator":"0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc", "deposit_root": "70b18fc143b6df2d0cc81e5705b8e0665c588140ca6ac4292138b7dc951ffe92"})
    // console.log(await ethers.getSigners());
    // await this.keysManager.addValidator("0x905c81057079fe5e19321d2cf2e86bda56119d92da6731be0bf2b4b98b086b0d8ff8748d724c5d6f48b2dd5fd18dd202",{"state": 0 , "signature": "0x82c967218f3279bc1a7ca42911da60d275b4f557a6d6e7e9d0c3969ec4ee91c9543c87a76b1c9bb1c4cb47212d601323117b8ff8c0096129200e83ce02025ed3096a7a525d5adbba1d9a6c342fe79207da0f7ebbdb5f0eb0cba36b8eb234aec3","nodeOperator":"0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc", "deposit_root": "0x70b18fc143b6df2d0cc81e5705b8e0665c588140ca6ac4292138b7dc951ffe92"}) //uint32->bytes32

  });
  // {"pubkey": "b56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34", "withdrawal_credentials": "0100000000000000000000003d80b31a78c30fc628f20b2c89d7ddbf6e53cedc", "amount": 32000000000, "signature": "84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d", "deposit_message_root": "9f558b40930a2cc295c844d7d34781de63c52adc089020d943f8e113306377c8", "deposit_data_root": "19c4c26a64de1266aaf1d58b8eea0734e0a2fd9f12aaec06728e2d9fbee336b9", "fork_version": "00000000", "eth2_network_name": "mainnet", "deposit_cli_version": "1.2.0"}
  it("deploys successfully", async function () {    
    // console.log("0x19c4c26a64de1266aaf1d58b8eea0734e0a2fd9f12aaec06728e2d9fbee336b9".valueOf())
    // let x = await this.keysManager.pub("0x19c4c26a64de1266aaf1d58b8eea0734e0a2fd9f12aaec06728e2d9fbee336b9".valueOf())
    // console.log("Public Key Returned", x);
     a =  await this.keysManager.verifyDepositDataRoot("0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34", "0x8e802b10d138831b61dccca4c3ed6f1f33f665a25401448bf7946fa11dca1ed7910ed01b69933806a0ea1e30ac6212530ed7d42292bda9068203bfced1bfdf52c3e3af4e1970c73aab2638addf794cc0cc1a6c6a229a4352c49e2aa34add8d13")
    // console.log(await this.keysManager.connect(defaultSigner).addValidator("0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34",[0 , "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d","0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc", "0x19c4c26a64de1266aaf1d58b8eea0734e0a2fd9f12aaec06728e2d9fbee336b9".valueOf()])) //uint32->bytes32

    const address = this.issuer.address;
    console.log("adress", this.issuer.address);
    console.log("RETURNED",a )

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
    await this.oracle.connect(oracle1).pushData(64e9, nonce, 2);
    await this.oracle.connect(oracle2).pushData(64e9, nonce, 2);
    await this.oracle.connect(oracle3).pushData(64e9, nonce, 2);
    await this.issuer.connect(user1).stake({ value: BigInt(64e18)});
 
    expect(totalSupply).to.equal(await this.stkEth.totalSupply());

    await this.issuer.depositToEth2("0x36334661433932303134393466306264313742393839324239666165346435326665334244333737")

    await this.issuer.connect(user1).stake({ value: BigInt(69e18)});
    expect(totalSupply).to.equal(await this.stkEth.totalSupply());

  });
});