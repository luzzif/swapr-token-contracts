import { expect, use } from "chai";
import { formatBytes32String } from "ethers/lib/utils";
import { waffle } from "hardhat";
import { BigNumber, Wallet } from "ethers";
import { fixture } from "../fixtures";
import { deployContract } from "ethereum-waffle";
import { SWPRClaimer } from "../../typechain";
import swprClaimerJson from "../../artifacts/contracts/SWPRClaimer.sol/SWPRClaimer.json";
import { MerkleTree } from "../../merkle-tree";

const { solidity, loadFixture } = waffle;
use(solidity);

describe("SWPRClaimer", () => {
    it("should fail when claim is called with an invalid proof", async () => {
        const { initialHolderAccount, claimerAccount, swpr } =
            await loadFixture(fixture);
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprClaimerJson,
            [
                swpr.address,
                formatBytes32String("fake-merkle-root"),
                Math.floor(Date.now() / 1000) + 1000,
            ]
        )) as SWPRClaimer;
        await expect(
            swprClaimer
                .connect(claimerAccount)
                .claim(100, [formatBytes32String("fake-proof")])
        ).to.be.revertedWith("SC06");
    });

    it("should fail when claim is called 2 times", async () => {
        const { initialHolderAccount, claimerAccount, swpr } =
            await loadFixture(fixture);
        const claimerAddress = await claimerAccount.getAddress();
        const leaves = [
            { account: claimerAddress, amount: "100" },
            { account: Wallet.createRandom().address, amount: "200" },
            { account: Wallet.createRandom().address, amount: "300" },
            { account: Wallet.createRandom().address, amount: "500" },
        ];
        const address = Wallet.createRandom().address; // reduces execution times
        for (let i = 0; i < 7000; i++) {
            leaves.push({
                account: address,
                amount: "200",
            });
        }
        const tree = new MerkleTree(leaves);

        // deploying claimer
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprClaimerJson,
            [swpr.address, tree.root, Math.floor(Date.now() / 1000) + 1000]
        )) as SWPRClaimer;

        // funding claimer
        const initialClaimerFunding = "1100";
        await swpr
            .connect(initialHolderAccount)
            .transfer(swprClaimer.address, initialClaimerFunding);

        expect(await swpr.balanceOf(claimerAddress)).to.be.equal(0);
        expect(await swpr.balanceOf(swprClaimer.address)).to.be.equal(
            initialClaimerFunding
        );

        // performing the claim
        const claimerConnectedSwprClaimer = swprClaimer.connect(claimerAccount);
        await claimerConnectedSwprClaimer.claim(
            leaves[0].amount,
            tree.getProof(leaves[0])
        );

        // performing a claim the second time should revert
        await expect(
            claimerConnectedSwprClaimer.claim(
                leaves[0].amount,
                tree.getProof(leaves[0])
            )
        ).to.be.revertedWith("SC05");
    });

    it("should succeed when contribute is called in a valid state", async () => {
        const { initialHolderAccount, claimerAccount, swpr } =
            await loadFixture(fixture);
        const claimerAddress = await claimerAccount.getAddress();
        const leaves = [
            { account: claimerAddress, amount: "100" },
            { account: Wallet.createRandom().address, amount: "200" },
            { account: Wallet.createRandom().address, amount: "300" },
            { account: Wallet.createRandom().address, amount: "500" },
        ];
        const tree = new MerkleTree(leaves);

        // deploying claimer
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprClaimerJson,
            [swpr.address, tree.root, Math.floor(Date.now() / 1000) + 1000]
        )) as SWPRClaimer;

        // funding claimer
        const initialClaimerFunding = "1100";
        await swpr
            .connect(initialHolderAccount)
            .transfer(swprClaimer.address, initialClaimerFunding);

        expect(await swpr.balanceOf(claimerAddress)).to.be.equal(0);
        expect(await swpr.balanceOf(swprClaimer.address)).to.be.equal(
            initialClaimerFunding
        );

        // performing the claim
        await swprClaimer
            .connect(claimerAccount)
            .claim(leaves[0].amount, tree.getProof(leaves[0]));

        expect(await swpr.balanceOf(claimerAddress)).to.be.equal(
            leaves[0].amount
        );
        expect(await swpr.balanceOf(swprClaimer.address)).to.be.equal(
            BigNumber.from(initialClaimerFunding).sub(leaves[0].amount)
        );
    });
});
