const { ethers } = require("hardhat");
const { expect } = require("chai");
const { utils } = require('ethers');
const { BigNumber, constants } = ethers;
const { AddressZero, MaxUint256, MaxInt256 } = constants;


const approveMAX = async (erc20, signer, to, amount) => {
    if ((await erc20.allowance(signer.address, to)).lt(amount)) {
        let tx = await erc20.connect(signer).approve(to, MaxUint256);
        await tx.wait();
    }
};

const balanceOf = async (erc20, userAddress) => {
    return await erc20.balanceOf(userAddress);
};

describe('Oracle', function () {

    let defaultSigner, user1, user2, oracle1, oracle2, oracle3, oracle4, oracle5 ;

    const epochsPerTimePeriod = 10;
    const slotsPerEpoch = 32;
    const secondsPerSlot = 12;
    const genesisTime = 1616508000;
    let pStakeCommisisons = 200;
    let valCommissions = 300;

    before(async function () {


        // setup
        [defaultSigner,user1, user2, oracle1, oracle2, oracle3, oracle4, oracle5] = await ethers.getSigners();

        let Core = await ethers.getContractFactory("Core");
        this.core = await Core.deploy();

        await this.core.init();

        let Oracle = await ethers.getContractFactory("Oracle");

        this.oracle = await Oracle.deploy(      
            epochsPerTimePeriod,
            slotsPerEpoch,
            secondsPerSlot,
            genesisTime,
            this.core.address,
            pStakeCommisisons,
            valCommissions);

    })

    it('should add oracle member correctly', async function() {
        await this.oracle.addOracleMember(oracle1.address);
        expect(await this.oracle.isOralce(oracle1.address)).to.equal(true);
    })

    it('should remove oracle member correctly', async function() {

        await this.oracle.addOracleMember(oracle2.address);
        await this.oracle.addOracleMember(oracle3.address);
        await this.oracle.removeOracleMember(oracle2.address); 
        expect(await this.oracle.isOralce(oracle2.address)).to.equal(false);
    })

})
