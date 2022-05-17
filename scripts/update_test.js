// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

// Commands to run:-
// npx hardhat node
// npx hardhat run --network localhost scripts/deploy_mainnet.js

const { upgrades } = require("hardhat");
const hre = require("hardhat");


const epochsPerTimePeriod = 200;
const slotsPerEpoch = 32;
const secondsPerSlot = 12;
const genesisTime = 1616508000;
const qourom = 1;
const pStakeCommisisons = 200;
const valCommissions = 300;
const ethstaked = 15191;
const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {

    let [defaultSigner] = await hre.ethers.getSigners();
    console.log(defaultSigner.address);

    const Core = await hre.ethers.getContractFactory("Core");
    const core = await Core.attach("0xE94C554868F13788297C405abe193e1f4cdAffBA");
    console.log("Core deployed to ", core.address);

    const stkEth = await core.stkEth();
    console.log("StkEth deployed to ", stkEth);

    let depositContractAddress = "0xff50ed3d0ec03ac01d4c79aad74928bff48a7b2b";
    let Issuer = await hre.ethers.getContractFactory("Issuer");
    const issuer = await Issuer.deploy(core.address, 1000, depositContractAddress,ethstaked,157);
    console.log("Issuer deployed to ", issuer.address);


    const Oracle = await hre.ethers.getContractFactory("Oracle");

    // uint64 _epochsPerTimePeriod,
    // uint64 _slotsPerEpoch,
    // uint64 _secondsPerSlot,
    // uint64 _genesisTime,
    // address _core,
    // address _keysManager,
    // uint32 _pStakeCommission,
    // uint32 _valCommission

    tx = await core.set(await core.ISSUER(), issuer.address);
    await tx.wait();

    const oracle = await Oracle.deploy(
        epochsPerTimePeriod,
        slotsPerEpoch,
        secondsPerSlot,
        genesisTime,
        core.address,
        pStakeCommisisons,
        valCommissions,
        10012929,
        1244800000000,
        389,
        93094
    );
    console.log("Oracle deployed to ", oracle.address);

    tx = await oracle.updateQuorom(qourom);
    await tx.wait();
    console.log("Quorom initialized to ", qourom);

    tx = await oracle.updateValidatorQuorom(qourom);
    await tx.wait();
    console.log("Validator updation Quorom initialized to ", qourom);


    tx = await core.set(await core.ORACLE(), oracle.address);
    await tx.wait();

    tx = await core.grantMinter(oracle.address);
    await tx.wait();

    tx = await core.grantMinter(issuer.address);
    await tx.wait();

    tx = await core.revokeMinter("0xBE9e61efff6329E3Dc0CA8b25dC379F8ef064Da4");
    await tx.wait();

    tx = await core.revokeMinter("0xe3aCE5Cf3DfF596B74D07E885e199Ecc4719f3F5");
    await tx.wait();

    console.log("key admin granted to: ", defaultSigner.address);

    tx = await oracle.addOracleMember("0x74f02Bd9CdaBc08010214E14928535ecf590FfAb");
    await tx.wait();

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
