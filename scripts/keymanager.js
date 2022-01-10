const hre = require("hardhat");

async function main() {

    const KeysManager = await ethers.getContractFactory("KeysManager");
    const keysManager = await KeysManager.attach(
      "0x772503997f77C30B2E03fAD399c7948B2741a8D2" // The deployed contract address
    );
    
    // Now you can call functions of the contract
    await keysManager.addValidator(
        "0xb56720cc59e4fa235e5569dbbf1b90a746d5da9809fae4a10e31724aeb1962d948ae95f5aead9dbb7aa2c94972e5ce34",
        "0x84739bf51b0995def38d6e744d063da983034903fc5a7e80c7cbcb05898057a047956b380be42bd128f0dce2ef98e08902a16d7152fc431809f2ced350e6535328b9a303348bed0dfb40d093046fafcd2dc9a68018bfd7496ec5d29d4fb9fa7d",
        "0x3d80b31a78c30fc628f20b2c89d7ddbf6e53cedc"
      );
    }

    main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
