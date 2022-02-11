const hre = require("hardhat");

async function main() {

    let [defaultSigner] = await hre.ethers.getSigners();

    const core = await hre.ethers.getContractAt("Core", "0xe32a044742Ee08f78749aD9864268FEe8dAB7B2d");
    const oracle = await hre.ethers.getContractAt("Oracle", "0xa9c959bdb32B457Fdb646D9798C8873cC3205a6F");


    // let tx = await oracle.addOracleMember("0x2E93e2190C8f2f1825Ab40a5899b0c64F60B241d");
    // await tx.wait();

    let tx = await oracle.addOracleMember("0xe9CB071F2Ce62728c4700348fC7e668C76b589dE");
    await tx.wait();

    tx = await oracle.addOracleMember("0x74f02Bd9CdaBc08010214E14928535ecf590FfAb");
    await tx.wait();

    tx = await core.grantNodeOperator("0x8E35f095545c56b07c942A4f3B055Ef1eC4CB148");
    await tx.wait();

}

main();