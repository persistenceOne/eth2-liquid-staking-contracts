// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

// Start a local node

// npx hardhat node

// Open a new terminal and deploy the smart contract in the localhost network

// npx hardhat run --network localhost scripts/deploy.js
const hre = require("hardhat");

const epochsPerTimePeriod = 10;
const slotsPerEpoch = 32;
const secondsPerSlot = 12;
const genesisTime = 1616508000;
const qourom = 2;

async function main() {
  const Core = await hre.ethers.getContractFactory("Core");
  const coreContract = await Core.deploy();
  console.log("Core deployed to ", coreContract.address);

  const initalizeCore = await coreContract.init();
  console.log("Core initialized", initalizeCore);

  const stkEth = await hre.ethers.getContractFactory("StkEth");
  const stkEthContact = await stkEth.deploy(coreContract.address);
  console.log("StkEth deployed to ", stkEthContact.address);

  const Oracle = await hre.ethers.getContractFactory("Oracle");
  const oraleContract = await Oracle.deploy(
    epochsPerTimePeriod,
    slotsPerEpoch,
    secondsPerSlot,
    genesisTime,
    coreContract.address,
    stkEthContact.address
  );
  console.log("Oracle deployed to ", oraleContract.address);

  const quorom = await oraleContract.updateQuorom(qourom);
  console.log("Quorom initialized to ", qourom);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
