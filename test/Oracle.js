const Core = artifacts.require("Core.sol");
const StkEth = artifacts.require("StkEth.sol");
const Oracle = artifacts.require("Oracle.sol");

const { expectRevert, constants, time } = require("@openzeppelin/test-helpers");
const { latest } = require("@openzeppelin/test-helpers/src/time");
require("chai").use(require("chai-as-promised")).should();
const { assert } = require("chai");
const exp = require("constants");

contract("Oracle Contract", function (accounts) {
  let storage;
  const [governance, controller, newGovernance, account1, account2] = accounts;
  const epochsPerTimePeriod = 10;
  const slotsPerEpoch = 32;
  const secondsPerSlot = 12;
  const genesisTime = 1616508000;
  let qourom = 2;
  let pStakeCommisisons = 2;
  let valCommissions = 3;
  let core;
  let stkEth;
  let oracle;
  let err;

  beforeEach("setup", async function () {
    core = await Core.new({
      from: governance,
    });

    stkEth = await StkEth.new(core.address, {
      from: governance,
    });

    oracle = await Oracle.new(
      epochsPerTimePeriod,
      slotsPerEpoch,
      secondsPerSlot,
      genesisTime,
      core.address,
      stkEth.address,
      pStakeCommisisons,
      valCommissions,
      {
        from: governance,
      }
    );
  });

  describe("Oracle setup", function () {
    it("deploys successfully", async () => {
      const address = oracle.address;
      assert.notEqual(address, 0x0);
      assert.notEqual(address, "");
      assert.notEqual(address, null);
      assert.notEqual(address, undefined);
    });

    it("shouldn't set quorom by a non-governor", async function () {
      await expectRevert(
        oracle.updateQuorom(2, {
          from: newGovernance,
        }),
        "CoreRef: Caller is not a governor"
      );
    });

    it("shouldn't set negavtive quorom", async function () {
      try {
        await oracle.updateQuorom(-1, {
          from: governance,
        });
      } catch (error) {
        err = error;
      }
      // Assert
      assert.isNotNull(err);
    });

    it("should set quorom by a governor", async function () {
      await oracle.updateQuorom(2, {
        from: governance,
      });

      assert.equal(await oracle.Quorom(), 2);
    });
  });

  describe("Oralce members", function () {
    it("Adds and Removes Oracle Members", async () => {
      let size = await oracle.numberOfOracleNodes();
      assert.equal(size, 0);

      await oracle.addOracleMember(newGovernance, {
        from: governance,
      });

      size = await oracle.numberOfOracleNodes({
        from: governance,
      });
      assert.equal(size, 1);

      let check = await oracle.isOralce(newGovernance, {
        from: governance,
      });
      assert.equal(check, true);

      await oracle.addOracleMember(controller, {
        from: governance,
      });

      size = await oracle.numberOfOracleNodes({
        from: governance,
      });
      assert.equal(size, 0);

      await oracle.removeOralceMember(newGovernance, {
        from: governance,
      });

      check = await oracle.isOralce(newGovernance, {
        from: governance,
      });
      assert.equal(check, false);

      size = await oracle.numberOfOracleNodes({
        from: governance,
      });
      assert.equal(size, 0);

      await oracle.removeOralceMember(newGovernance, {
        from: governance,
      });

      size = await oracle.numberOfOracleNodes({
        from: governance,
      });
      assert.equal(size, 0);
    });
  });

  describe("update Beacon Chain Data", function () {
    it("Updates Beacon Chain Data", async () => {
      expectRevert(await oracle.updateBeaconChainData(30, 20, 10, 100, {from:newGovernance},"CoreRef: Caller is not a governor"));
      await oracle.updateBeaconChainData(30, 20, 10, 100, {from:governor},);
      epochsPerTimePeriod,slotsPerEpoch,secondsPerSlot,genesisTime = await oracle.getBeaconData();
      assert.equal(epochsPerTimePeriod,30)
      assert.equal(slotsPerEpoch,20)
      assert.equal(secondsPerSlot,10)
      assert.equal(genesisTime,100)
    });
  });

  describe("Oracle Pushes Data", function () {
    it("Reaches Quorom", async () => {

      let ether = oracle.getTotalEther();

      await oracle.updateQuorom(2, {
        from: governance,
      });

      await oracle.addOracleMember(newGovernance, {
        from: governance,
      });

      await oracle.addOracleMember(controller, {
        from: governance,
      });

      await oracle.addOracleMember(account1, {
        from: governance,
      });

      let nonce = await oracle.currentNonce()

      expectRevert(await oracle.pushData(1e18, nonce, 5,{
        from: account2,
      }),"Not oracle Member");

      expectRevert(await oracle.pushData(1e18, nonce+1, 5,{
        from: account1,
      }),"incorrect Nonce");

      await oracle.pushData(1e18, nonce, 5,{
        from: account1,
      });

      expectRevert(await oracle.pushData(100, nonce, 5,{
        from: account1,
      }),"Oracles: already voted");

      await oracle.pushData(1e18, nonce, 5,{
        from: controller,
      });

      assert.equal(nonce,await oracle.currentNonce())

      await oracle.pushData(1e18, nonce, 5,{
        from: newGovernance,
      });

      assert.equal(nonce+1,await oracle.currentNonce())
      assert.equal(1e18,await oracle.getTotalEther())
      
    });
  });
});
