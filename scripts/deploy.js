// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

// Commands to run:- 
// npx hardhat node
// npx hardhat run --network localhost scripts/deploy.js

const { upgrades } = require("hardhat");
const hre = require("hardhat");

const epochsPerTimePeriod = 4;
const slotsPerEpoch = 32;
const secondsPerSlot = 12;
const genesisTime = 1644295551;
const qourom = 2;
const pStakeCommisisons = 200;
const valCommissions = 300;

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {

  let [defaultSigner] = await hre.ethers.getSigners();
  console.log(defaultSigner.address);
  treasury = "0x0A821de645e9070196bFC9bE7ED6A8d7673737bb";

  const Core = await hre.ethers.getContractFactory("Core");
  const core = await Core.deploy();
  console.log("Core deployed to ", core.address);

  await core.init();
  console.log("Core initialized");

  const stkEth = await core.stkEth();
  console.log("StkEth deployed to ", stkEth.address);

  let depositContractAddress = "0x27c495e778386b57e9e9F309f4cF99DFc3103e1F";

  let PStake = await hre.ethers.getContractFactory('pStake');
  let pstake = await PStake.deploy();

  let KeysManager = await ethers.getContractFactory("KeysManager");
  const keysManager = await KeysManager.deploy(core.address);
  console.log("KeysManager deployed to ", keysManager.address);

  const Oracle = await hre.ethers.getContractFactory("Oracle");

  // uint64 _epochsPerTimePeriod,
  // uint64 _slotsPerEpoch,
  // uint64 _secondsPerSlot,
  // uint64 _genesisTime,
  // address _core,
  // address _keysManager,
  // uint32 _pStakeCommission,
  // uint32 _valCommission

  
  let Issuer = await ethers.getContractFactory("Issuer");
  const issuer = await Issuer.deploy(core.address, BigInt(32e17), 1000, depositContractAddress);
  console.log("Issuer deployed to ", issuer.address);

  let StakingPool = await ethers.getContractFactory("StakingPool");
  const stakingPool = await upgrades.deployProxy(StakingPool,[pstake.address, depositContractAddress, core.address, "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"],{ initializer: 'initialize' });
  console.log("StakingPool deployed to ", stakingPool.address);
  
  let tx = await core.set(await core.VALIDATOR_POOL(), stakingPool.address);
  await tx.wait();
  tx = await core.set(await core.PSTAKE_TREASURY(), treasury);
  await tx.wait();
  tx = await core.set(await core.WITHDRAWAL_CREDENTIAL(), "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc");
  await tx.wait();
  tx = await core.set(await core.KEYS_MANAGER(), keysManager.address);
  await tx.wait()
  await core.set(await core.ISSUER(), issuer.address);
  await tx.wait();

  const oracle = await Oracle.deploy(
    epochsPerTimePeriod,
    slotsPerEpoch,
    secondsPerSlot,
    genesisTime,
    core.address,
    keysManager.address,
    pStakeCommisisons,
    valCommissions
  );
  console.log("Oracle deployed to ", oracle.address);

  tx = await oracle.updateQuorom(qourom);
  await tx.wait();
  console.log("Quorom initialized to ", qourom);

  tx = await oracle.updateValidatorQuorom(3);
  await tx.wait();
  console.log("Validator updation Quorom initialized to ", qourom);


  tx = await core.set(await core.ORACLE(), oracle.address);
  await tx.wait();

  tx = await core.grantMinter(oracle.address);
  await tx.wait();
  tx = await core.grantMinter(issuer.address);
  await tx.wait();
  tx = await core.grantBurner(stakingPool.address);
  await tx.wait();
  console.log("Minter granted to issuer and oracle");

  tx = await core.grantNodeOperator(defaultSigner.address);
  await tx.wait();
  console.log("key admin granted to: ", defaultSigner.address);

  await keysManager.addValidator(
    "0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34",
    "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
    "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
  );
  console.log("Validator added");
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
