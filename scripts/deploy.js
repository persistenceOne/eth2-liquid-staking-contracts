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

  [treasury] = await hre.ethers.getSigners();

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

  const quorom = await oracle.updateQuorom(qourom);
  console.log("Quorom initialized to ", qourom);

  let KeysManager = await ethers.getContractFactory("KeysManager");
  keysManager = await KeysManager.deploy(core.address);
  console.log("KeysManager deployed to ", keysManager.address);

  let Issuer = await ethers.getContractFactory("Issuer");
  issuer = await Issuer.deploy(core.address, BigInt(32e32), 1000, depositContract.address);
  console.log("Issuer deployed to ", issuer.address);

  let StakingPool = await ethers.getContractFactory("DummyStakingPool");
  stakingPool = await StakingPool.deploy();
  console.log("StakingPool deployed to ", stakingPool.address);

  await core.set(await core.VALIDATOR_POOL(), stakingPool.address);
  await core.set(await core.PSTAKE_TREASURY(), treasury.address);
  await core.set(await core.WITHDRAWAL_CREDENTIAL(), "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc");
  await core.set(await core.KEYS_MANAGER(), keysManager.address);
  await core.set(await core.ORACLE(), oracle.address);
  await core.set(await core.ISSUER(), issuer.address);

  await core.grantMinter(oracle.address);
  await core.grantMinter(issuer.address);
  console.log("Minter granted to issuer and oracle");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
