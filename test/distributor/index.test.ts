import { expect, use } from "chai";
import { waffle } from "hardhat";
import { constants } from "ethers";
import { fixture } from "../fixtures";
import { deployContract } from "ethereum-waffle";
import swprDistributorJson from "../../artifacts/contracts/SWPRDistributor.sol/SWPRDistributor.json";
import accounts from "./data/accounts.json";
import amounts from "./data/amounts.json";
import { parseEther } from "ethers/lib/utils";

const { solidity, loadFixture } = waffle;
use(solidity);

describe("SWPRDistributor", () => {
    it("should fail when deployed with an invalid swpr token address", async () => {
        const { initialHolderAccount } = await loadFixture(fixture);
        await expect(
            deployContract(initialHolderAccount, swprDistributorJson, [
                constants.AddressZero,
            ])
        ).to.be.revertedWith("ZeroAddressInput");
    });

    it("should fail when distribute is called by a non-owner", async () => {
        const { initialHolderAccount, claimerAccount, swpr } =
            await loadFixture(fixture);
        const distributor = await deployContract(
            initialHolderAccount,
            swprDistributorJson,
            [swpr.address]
        );
        await expect(
            distributor
                .connect(claimerAccount)
                .distribute(parseEther("10"), [], [])
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail when distribute is called by by the owner but not enough allowance was given", async () => {
        const { initialHolderAccount, claimerAccount, swpr } =
            await loadFixture(fixture);
        const distributor = await deployContract(
            initialHolderAccount,
            swprDistributorJson,
            [swpr.address]
        );
        await expect(
            distributor
                .connect(initialHolderAccount)
                .distribute(parseEther("10"), [], [])
        ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
    });

    it("should succeed when calling distribute under the right conditions", async () => {
        const { initialHolderAccount, claimerAccount, swpr } =
            await loadFixture(fixture);
        const distributor = await deployContract(
            initialHolderAccount,
            swprDistributorJson,
            [swpr.address]
        );
        const amountToDistribute = parseEther("10");
        await swpr
            .connect(initialHolderAccount)
            .approve(distributor.address, amountToDistribute);

        // check that the balances are right pre distribution
        expect(await swpr.balanceOf(claimerAccount.address)).to.be.equal(0);

        await distributor
            .connect(initialHolderAccount)
            .distribute(
                amountToDistribute,
                [claimerAccount.address],
                [amountToDistribute]
            );

        // check that the balances are right post distribution
        expect(await swpr.balanceOf(claimerAccount.address)).to.be.equal(
            amountToDistribute
        );
    });

    it("should succeed when calling distribute under the right conditions, and with the real data", async () => {
        const { initialHolderAccount, claimerAccount, swpr } =
            await loadFixture(fixture);
        const distributor = await deployContract(
            initialHolderAccount,
            swprDistributorJson,
            [swpr.address]
        );
        const amountToDistribute = parseEther("292372.572334490330712625");
        await swpr
            .connect(initialHolderAccount)
            .approve(distributor.address, amountToDistribute);

        // check that the balances are right pre distribution
        expect(await swpr.balanceOf(claimerAccount.address)).to.be.equal(0);

        await distributor
            .connect(initialHolderAccount)
            .distribute(amountToDistribute, accounts, amounts);

        // check that the balances are right post distribution
        for (let i = 0; i < accounts.length; i++) {
            expect(await swpr.balanceOf(accounts[i])).to.be.equal(amounts[i]);
        }

        // distributor should be drained
        await expect(await swpr.balanceOf(distributor.address)).to.be.equal(0);
    });
});
