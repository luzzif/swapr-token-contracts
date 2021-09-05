import { expect, use } from "chai";
import { waffle } from "hardhat";
import { BigNumber, Wallet } from "ethers";
import { fixture, fixtureOnlyToken } from "../fixtures";
import { deployContract } from "ethereum-waffle";
import { SWPRClaimer } from "../../typechain";
import { SWPRConverter } from "../../typechain";
import swprClaimerJson from "../../artifacts/contracts/SWPRClaimer.sol/SWPRClaimer.json";
import swprConverterJson from "../../artifacts/contracts/SWPRConverter.sol/SWPRConverter.json";
import { MerkleTree } from "../../merkle-tree";
import { fastForwardTo } from "../utils";

const { solidity, loadFixture } = waffle;
use(solidity);

describe("SWPRConverter", () => {
    it("should succeed converting", async () => {
        const timeLimit = Math.floor(Date.now() / 1000) + 1000;

        const {
            initialHolderAccount: initialHolderAccountA,
            claimerAccount,
            swpr: swprA,
        } = await loadFixture(fixture);
        const claimerAddress = await claimerAccount.getAddress();
        const leaves = [
            { account: claimerAddress, amount: "100" },
            { account: Wallet.createRandom().address, amount: "200" },
            { account: Wallet.createRandom().address, amount: "300" },
            { account: Wallet.createRandom().address, amount: "500" },
        ];
        const tree = new MerkleTree(leaves);

        // deploying claimer
        const wallets = await waffle.provider.getWallets();
        const owner = wallets[6]; // random, new owner
        const swprClaimer = (await deployContract(owner, swprClaimerJson, [
            swprA.address,
            tree.root,
            timeLimit,
        ])) as unknown as SWPRClaimer;

        // funding claimer
        const initialClaimerFunding = "1100";
        await swprA
            .connect(initialHolderAccountA)
            .transfer(swprClaimer.address, initialClaimerFunding);

        expect(await swprA.balanceOf(claimerAddress)).to.be.equal(0);
        expect(await swprA.balanceOf(swprClaimer.address)).to.be.equal(
            initialClaimerFunding
        );

        // performing the claim
        await swprClaimer
            .connect(claimerAccount)
            .claim(leaves[0].amount, tree.getProof(leaves[0]));

        await fastForwardTo(timeLimit + 10);
        expect(await swprA.balanceOf(owner.address)).to.be.equal(0);
        await swprClaimer.recover();
        expect(await swprA.balanceOf(owner.address)).to.be.equal(
            BigNumber.from(initialClaimerFunding).sub(100) // 100 was claimed
        );

        expect(await swprA.balanceOf(claimerAccount.address)).to.be.equal(
            "100"
        );

        // deploy SWPRTokenB
        const { initialHolderAccount: initialHolderAccountB, swpr: swprB } =
            await loadFixture(fixtureOnlyToken);

        // deploy converter
        const swprConverter = (await deployContract(owner, swprConverterJson, [
            swprA.address,
            swprB.address,
        ])) as unknown as SWPRConverter;

        await swprB
            .connect(initialHolderAccountB)
            .transfer(swprConverter.address, "1000");
        expect(await swprB.balanceOf(swprConverter.address)).to.be.equal(
            "1000"
        );

        // No allowance done
        await expect(
            swprConverter
                .connect(initialHolderAccountB)
                .convert(claimerAccount.address)
        ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");

        // Not enough allowance
        await swprA
            .connect(claimerAccount)
            .approve(swprConverter.address, "90");
        await expect(
            swprConverter
                .connect(initialHolderAccountB)
                .convert(claimerAccount.address)
        ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");

        // Not SWPRTokenA holder
        const noTokenHolder = wallets[7];
        await expect(
            swprConverter
                .connect(initialHolderAccountB)
                .convert(noTokenHolder.address)
        ).to.be.revertedWith("NothingToConvert");

        // Do the right allowance and convert
        await swprA
            .connect(claimerAccount)
            .approve(swprConverter.address, "100");
        await swprConverter
            .connect(initialHolderAccountB)
            .convert(claimerAccount.address);
        expect(await swprB.balanceOf(swprConverter.address)).to.be.equal("900");

        // Check that SWPRTokenA was transferred to the converter
        expect(await swprA.balanceOf(swprConverter.address)).to.be.equal("100");

        // Check final balance of claimer
        expect(await swprA.balanceOf(claimerAccount.address)).to.be.equal("0");
        expect(await swprB.balanceOf(claimerAccount.address)).to.be.equal(
            "100"
        );
    });
});
