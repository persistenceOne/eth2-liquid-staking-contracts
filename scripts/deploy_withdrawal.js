// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

// Commands to run:-
// npx hardhat node
// npx hardhat run --network localhost scripts/deploy_mainnet.js

const { upgrades } = require("hardhat");
const hre = require("hardhat");

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {

    let [defaultSigner] = await hre.ethers.getSigners();
    console.log(defaultSigner.address);

    const Withdrawal = await hre.ethers.getContractFactory("WithdrawalCredential");
    const withdraw = await upgrades.deployProxy(Withdrawal);
    await withdraw.deployed();
    console.log("withdrawal contract deployed to ", withdraw.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
