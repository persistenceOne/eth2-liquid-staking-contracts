// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

// Commands to run:-
// npx hardhat node
// npx hardhat run --network localhost scripts/deploy.js

const hre = require("hardhat");

const epochsPerTimePeriod = 10;
const slotsPerEpoch = 32;
const secondsPerSlot = 12;
const genesisTime = 1616508000;
const qourom = 2;
const pStakeCommisisons = 200;
const valCommissions = 300;

async function main() {
  [treasury, user1, user2] = await hre.ethers.getSigners();

  const Core = await hre.ethers.getContractFactory("Core");
  const core = await Core.deploy();
  console.log("Core deployed to ", core.address);

  const initalizeCore = await core.init();
  console.log("Core initialized", initalizeCore);

  const stkEth = await hre.ethers.getContractFactory("StkEth");
  const stkEthContact = await stkEth.deploy(core.address);
  console.log("StkEth deployed to ", stkEthContact.address);

  let DepositContract = await ethers.getContractFactory("DummyDepositContract");
  depositContract = await DepositContract.deploy();
  console.log("DepositContract deployed to ", depositContract.address);

  const Oracle = await hre.ethers.getContractFactory("Oracle");
  const oracle = await Oracle.deploy(
    epochsPerTimePeriod,
    slotsPerEpoch,
    secondsPerSlot,
    genesisTime,
    core.address,
    pStakeCommisisons,
    valCommissions
  );
  console.log("Oracle deployed to ", oracle.address);

  await oracle.updateQuorom(qourom);
  console.log("Quorom initialized to ", qourom);

  let KeysManager = await ethers.getContractFactory("KeysManager");
  keysManager = await KeysManager.deploy(core.address);
  console.log("KeysManager deployed to ", keysManager.address);

  let Issuer = await ethers.getContractFactory("Issuer");
  issuer = await Issuer.deploy(
    core.address,
    BigInt(32e32),
    1000,
    "0x00000000219ab540356cBB839Cbe05303d7705Fa"
  );
  console.log("Issuer deployed to ", issuer.address);

  let StakingPool = await ethers.getContractFactory("DummyStakingPool");
  stakingPool = await StakingPool.deploy();
  console.log("StakingPool deployed to ", stakingPool.address);

  await core.set(await core.VALIDATOR_POOL(), stakingPool.address);
  await core.set(await core.PSTAKE_TREASURY(), treasury.address);
  await core.set(
    await core.WITHDRAWAL_CREDENTIAL(),
    "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
  );
  await core.set(await core.KEYS_MANAGER(), keysManager.address);
  await core.set(await core.ORACLE(), oracle.address);
  await core.set(await core.ISSUER(), issuer.address);

  await core.grantMinter(oracle.address);
  await core.grantMinter(issuer.address);
  console.log("Minter granted to issuer and oracle");

  await keysManager
  .connect(defaultSigner)
  .addValidator(
    "0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34",
    "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
    "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
  );

  await this.issuer.connect(user1).stake({ value: BigInt(32e18) });
  await this.issuer.depositToEth2(
    "0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34"
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
