# pSTAKE ETH Liquid Staking Protocol

This project contains the contracts used by pSTAKE to implement the liquid staking protocol for ethereum POS system.


### Contracts List

- **CORE CONTRACT:**
- **ISSUER CONTRACT:**
- **KEYSMANAGER CONTRACT:**
- **ORACLE CONTRACT:**
- **STAKING-POOL CONTRACT:**
- **STKETH CONTRACT:**
- **WITHDRAWAL CONTRACT:**
- **PERMISSION CONTRACT:**


### Steps to run the contracts

- **For testing**:
  - npx hardhat test
- **For local deployment**:
  - Start a local node: `npx hardhat node`
  - Deploy the withdrawal contract: `npx hardhat run scripts/deploy_withdrawal.js --network localhost`
  - Change the withdrawal address in deploy_test.js
  - Deploy the contracts: `npx hardhat run scripts/deploy_test.js --network localhost`
- **For mainnet deployment**:
  - Change .env file, add private key and enpoint
  - Change variable for etherscan verification such as your etherscan API key
  - Deploy the withdrawal contract: `npx hardhat run scripts/deploy_withdrawal.js --network mainnet`
  - Change the withdrawal address in deploy_test.js
  - Deploy the contracts: `npx hardhat run scripts/deploy.js --network mainnet`


**Various shell commands for hardhat development**
```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy_mainnet.js
node scripts/deploy_mainnet.js
npx eslint '**/*.js'
npx eslint '**/*.js' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy_mainnet.js
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```
