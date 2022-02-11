const hre = require("hardhat");

async function main() {

    let [defaultSigner] = await hre.ethers.getSigners();

    const epochsPerTimePeriod = 4;
    const slotsPerEpoch = 32;
    const secondsPerSlot = 12;
    const genesisTime = 1644295551;
    const qourom = 2;
    const pStakeCommisisons = 200;
    const valCommissions = 300;

    const core = await hre.ethers.getContractAt("Core", "0xe32a044742Ee08f78749aD9864268FEe8dAB7B2d");

    const Oracle = await hre.ethers.getContractFactory("Oracle");
    const oracle = await Oracle.deploy(
        epochsPerTimePeriod,
        slotsPerEpoch,
        secondsPerSlot,
        genesisTime,
        "0xe32a044742Ee08f78749aD9864268FEe8dAB7B2d",
        "0x956B174142AC8AcdaC0b771638154149903B2919",
        pStakeCommisisons,
        valCommissions
      );
    
    console.log("Oracle deployed to ", oracle.address);
    
    // let tx = await oracle.addOracleMember("0x2E93e2190C8f2f1825Ab40a5899b0c64F60B241d");
    // await tx.wait();

    let tx = await oracle.updateQuorom(qourom);
    await tx.wait();
    console.log("Quorom initialized to ", qourom);
  
    tx = await oracle.updateValidatorQuorom(qourom);
    await tx.wait();
    console.log("Validator updation Quorom initialized to ", qourom);

    tx = await oracle.addOracleMember("0xe9CB071F2Ce62728c4700348fC7e668C76b589dE");
    await tx.wait();

    tx = await oracle.addOracleMember("0x74f02Bd9CdaBc08010214E14928535ecf590FfAb");
    await tx.wait();

    tx = await core.set(await core.ORACLE(), oracle.address);
    await tx.wait();

    tx = await core.grantMinter(oracle.address);
    await tx.wait();

    tx = await core.revokeMinter("0xa9c959bdb32B457Fdb646D9798C8873cC3205a6F");
    await tx.wait();

}

main();