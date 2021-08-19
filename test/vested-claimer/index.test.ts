import { expect, use } from "chai";
import { formatBytes32String, parseEther } from "ethers/lib/utils";
import { waffle } from "hardhat";
import { BigNumber, constants, Wallet } from "ethers";
import { fixture } from "../fixtures";
import { deployContract } from "ethereum-waffle";
import { SWPRVestedClaimer } from "../../typechain";
import swprVestedClaimerJson from "../../artifacts/contracts/SWPRVestedClaimer.sol/SWPRVestedClaimer.json";
import { fastForwardTo } from "../utils";
import { MerkleTree } from "../../merkle-tree";

const { solidity, loadFixture } = waffle;
use(solidity);

describe("SWPRVestedClaimer", () => {
    it("should fail when deployed with an invalid swpr token address", async () => {
        const { initialHolderAccount } = await loadFixture(fixture);
        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 10;
        const duration = 1000;
        await expect(
            deployContract(initialHolderAccount, swprVestedClaimerJson, [
                constants.AddressZero,
                formatBytes32String("fake-merkle-root"),
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ])
        ).to.be.revertedWith("ZeroAddressInput");
    });

    it("should fail when deployed with an invalid merkle root", async () => {
        const { initialHolderAccount, swpr } = await loadFixture(fixture);
        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 10;
        const duration = 1000;
        await expect(
            deployContract(initialHolderAccount, swprVestedClaimerJson, [
                swpr.address,
                formatBytes32String(""),
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ])
        ).to.be.revertedWith("InvalidMerkleRoot");
    });

    it("should fail when deployed with an invalid release time limit", async () => {
        const { initialHolderAccount, swpr } = await loadFixture(fixture);
        const startTimestamp = Math.floor(Date.now() / 1000) + 10;
        const cliff = startTimestamp + 10;
        const duration = 1000;
        await expect(
            deployContract(initialHolderAccount, swprVestedClaimerJson, [
                swpr.address,
                formatBytes32String("fake-merkle-root"),
                startTimestamp + duration - 10, // 10 seconds before the vesting period ends
                startTimestamp,
                duration,
                cliff,
            ])
        ).to.be.revertedWith("InvalidReleaseTimeLimit");
    });

    it("should fail when deployed with an invalid start timestamp", async () => {
        const { initialHolderAccount, swpr } = await loadFixture(fixture);
        const startTimestamp = Math.floor(Date.now() / 1000) - 10;
        const cliff = startTimestamp + 10;
        const duration = 1000;
        await expect(
            deployContract(initialHolderAccount, swprVestedClaimerJson, [
                swpr.address,
                formatBytes32String("fake-merkle-root"),
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ])
        ).to.be.revertedWith("PastVestingStart");
    });

    it("should fail when deployed with no duration", async () => {
        const { initialHolderAccount, swpr } = await loadFixture(fixture);
        const startTimestamp = Math.floor(Date.now() / 1000) + 10;
        const cliff = startTimestamp + 10;
        const duration = 1000;
        await expect(
            deployContract(initialHolderAccount, swprVestedClaimerJson, [
                swpr.address,
                formatBytes32String("fake-merkle-root"),
                startTimestamp + duration + 10,
                startTimestamp,
                0,
                cliff,
            ])
        ).to.be.revertedWith("InvalidVestingDuration");
    });

    it("should fail when deployed with a cliff which is lower than the starting timestamp", async () => {
        const { initialHolderAccount, swpr } = await loadFixture(fixture);
        const startTimestamp = Math.floor(Date.now() / 1000) + 10;
        const cliff = startTimestamp - 10;
        const duration = 1000;
        await expect(
            deployContract(initialHolderAccount, swprVestedClaimerJson, [
                swpr.address,
                formatBytes32String("fake-merkle-root"),
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ])
        ).to.be.revertedWith("InvalidCliff");
    });

    it("should fail when deployed with a cliff which is greater than the ending timestamp", async () => {
        const { initialHolderAccount, swpr } = await loadFixture(fixture);
        const startTimestamp = Math.floor(Date.now() / 1000) + 10;
        const duration = 1000;
        const cliff = startTimestamp + duration + 10;
        await expect(
            deployContract(initialHolderAccount, swprVestedClaimerJson, [
                swpr.address,
                formatBytes32String("fake-merkle-root"),
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ])
        ).to.be.revertedWith("InvalidCliff");
    });

    it("should fail when release is called after the release time limit", async () => {
        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 10;
        const duration = 1000;
        const claimTimeLimit = startTimestamp + duration + 10;
        const { initialHolderAccount, claimerAccount, swpr } =
            await loadFixture(fixture);
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprVestedClaimerJson,
            [
                swpr.address,
                formatBytes32String("fake-merkle-root"),
                claimTimeLimit,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;

        await fastForwardTo(claimTimeLimit + 1);

        await expect(
            swprClaimer
                .connect(claimerAccount)
                .release(100, [formatBytes32String("fake-proof")])
        ).to.be.revertedWith("ReleaseTimeLimitReached");
    });

    it("should fail when claim is called with an invalid proof", async () => {
        const { initialHolderAccount, claimerAccount, swpr } =
            await loadFixture(fixture);
        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 10;
        const duration = 1000;
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprVestedClaimerJson,
            [
                swpr.address,
                formatBytes32String("fake-merkle-root"),
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;
        await expect(
            swprClaimer
                .connect(claimerAccount)
                .release(100, [formatBytes32String("fake-proof")])
        ).to.be.revertedWith("InvalidMerkleProof");
    });

    it("should succeed when called the first time, before the cliff (initial, unlocked amount should be given out)", async () => {
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

        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 100;
        const duration = 1000;
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprVestedClaimerJson,
            [
                swpr.address,
                tree.root,
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;

        // funding claimer
        const initialClaimerFunding = "1100";
        await swpr
            .connect(initialHolderAccount)
            .transfer(swprClaimer.address, initialClaimerFunding);

        expect(await swpr.balanceOf(claimerAddress)).to.be.equal(0);
        expect(await swpr.balanceOf(swprClaimer.address)).to.be.equal(
            initialClaimerFunding
        );

        // performing the release
        await swprClaimer
            .connect(claimerAccount)
            .release(leaves[0].amount, tree.getProof(leaves[0]));

        expect(await swpr.balanceOf(claimerAddress)).to.be.equal(
            Number(leaves[0].amount) / 2
        );
        expect(await swpr.balanceOf(swprClaimer.address)).to.be.equal(
            BigNumber.from(initialClaimerFunding).sub(
                Number(leaves[0].amount) / 2
            )
        );
        expect(await swprClaimer.released(claimerAccount.address)).to.be.equal(
            Number(leaves[0].amount) / 2
        );
    });

    it("should fail when called the second time, before the cliff, and after the first unlocked release (no release happening)", async () => {
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

        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 100;
        const duration = 1000;
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprVestedClaimerJson,
            [
                swpr.address,
                tree.root,
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;

        // funding claimer
        const initialClaimerFunding = "1100";
        await swpr
            .connect(initialHolderAccount)
            .transfer(swprClaimer.address, initialClaimerFunding);

        // performing the first release
        await swprClaimer
            .connect(claimerAccount)
            .release(leaves[0].amount, tree.getProof(leaves[0]));

        await fastForwardTo(cliff - 10);
        // performing the second release after some time (before cliff though)
        await expect(
            swprClaimer
                .connect(claimerAccount)
                .release(leaves[0].amount, tree.getProof(leaves[0]))
        ).to.be.revertedWith("NothingToRelease");
    });

    it("should succeed when called the second time, right when the cliff has been reached, but the initial unlocked amount has been reached already", async () => {
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

        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 100;
        const duration = 1000;
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprVestedClaimerJson,
            [
                swpr.address,
                tree.root,
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;

        // funding claimer
        const initialClaimerFunding = "1100";
        await swpr
            .connect(initialHolderAccount)
            .transfer(swprClaimer.address, initialClaimerFunding);

        // performing the first release
        await swprClaimer
            .connect(claimerAccount)
            .release(leaves[0].amount, tree.getProof(leaves[0]));

        await fastForwardTo(cliff);
        // performing the second release when the cliff has been reached
        const halfAmount = Number(leaves[0].amount) / 2;
        const vestingTime = cliff - startTimestamp;
        const releasedAmount = (halfAmount * vestingTime) / duration;
        await swprClaimer
            .connect(claimerAccount)
            .release(leaves[0].amount, tree.getProof(leaves[0]));

        expect(await swpr.balanceOf(claimerAddress)).to.be.equal(
            halfAmount + releasedAmount
        );
        expect(await swpr.balanceOf(swprClaimer.address)).to.be.equal(
            BigNumber.from(initialClaimerFunding).sub(
                halfAmount + releasedAmount
            )
        );
        expect(await swprClaimer.released(claimerAccount.address)).to.be.equal(
            halfAmount + releasedAmount
        );
    });

    it("should succeed when called the first time, right when the cliff has been reached (should release unlocked amount + some vested amount)", async () => {
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

        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 100;
        const duration = 1000;
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprVestedClaimerJson,
            [
                swpr.address,
                tree.root,
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;

        // funding claimer
        const initialClaimerFunding = "1100";
        await swpr
            .connect(initialHolderAccount)
            .transfer(swprClaimer.address, initialClaimerFunding);

        await fastForwardTo(cliff);
        await swprClaimer
            .connect(claimerAccount)
            .release(leaves[0].amount, tree.getProof(leaves[0]));

        const halfAmount = Number(leaves[0].amount) / 2;
        const vestingTime = cliff - startTimestamp;
        const releasedAmount = (halfAmount * vestingTime) / duration;
        expect(await swpr.balanceOf(claimerAddress)).to.be.equal(
            halfAmount + releasedAmount
        );
        expect(await swpr.balanceOf(swprClaimer.address)).to.be.equal(
            BigNumber.from(initialClaimerFunding).sub(
                halfAmount + releasedAmount
            )
        );
        expect(await swprClaimer.released(claimerAccount.address)).to.be.equal(
            halfAmount + releasedAmount
        );
    });

    it("should succeed when called the first time, after the vesting duration has passed (should claim everything)", async () => {
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

        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 100;
        const duration = 1000;
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprVestedClaimerJson,
            [
                swpr.address,
                tree.root,
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;

        // funding claimer
        const initialClaimerFunding = "1100";
        await swpr
            .connect(initialHolderAccount)
            .transfer(swprClaimer.address, initialClaimerFunding);

        await fastForwardTo(startTimestamp + duration + 2); // 2 seconds after the vesting period has finished, everything should be unlocked here
        await swprClaimer
            .connect(claimerAccount)
            .release(leaves[0].amount, tree.getProof(leaves[0]));

        expect(await swpr.balanceOf(claimerAddress)).to.be.equal(
            leaves[0].amount
        );
        expect(await swpr.balanceOf(swprClaimer.address)).to.be.equal(
            BigNumber.from(initialClaimerFunding).sub(leaves[0].amount)
        );
        expect(await swprClaimer.released(claimerAccount.address)).to.be.equal(
            leaves[0].amount
        );
    });

    it("should succeed when called the second time, after the vesting duration has passed (should claim all the vesting amount)", async () => {
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

        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 100;
        const duration = 1000;
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprVestedClaimerJson,
            [
                swpr.address,
                tree.root,
                startTimestamp + duration + 10,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;

        // funding claimer
        const initialClaimerFunding = "1100";
        await swpr
            .connect(initialHolderAccount)
            .transfer(swprClaimer.address, initialClaimerFunding);

        // claiming the unlocked amount
        await swprClaimer
            .connect(claimerAccount)
            .release(leaves[0].amount, tree.getProof(leaves[0]));

        const halfAmount = Number(leaves[0].amount) / 2;
        expect(await swpr.balanceOf(claimerAddress)).to.be.equal(halfAmount);
        expect(await swpr.balanceOf(swprClaimer.address)).to.be.equal(
            BigNumber.from(initialClaimerFunding).sub(halfAmount)
        );
        expect(await swprClaimer.released(claimerAccount.address)).to.be.equal(
            halfAmount
        );

        await fastForwardTo(startTimestamp + duration + 2); // 2 seconds after the vesting period has finished, everything should be unlocked here
        // claiming the vested amount
        await swprClaimer
            .connect(claimerAccount)
            .release(leaves[0].amount, tree.getProof(leaves[0]));

        expect(await swpr.balanceOf(claimerAddress)).to.be.equal(
            leaves[0].amount
        );
        expect(await swpr.balanceOf(swprClaimer.address)).to.be.equal(
            BigNumber.from(initialClaimerFunding).sub(leaves[0].amount)
        );
        expect(await swprClaimer.released(claimerAccount.address)).to.be.equal(
            leaves[0].amount
        );
    });

    it("should fail when recovering before the release time limit", async () => {
        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 100;
        const duration = 1000;
        const timeLimit = startTimestamp + duration + 1000;
        const { initialHolderAccount, swpr } = await loadFixture(fixture);
        const swprClaimer = (await deployContract(
            initialHolderAccount,
            swprVestedClaimerJson,
            [
                swpr.address,
                formatBytes32String("fake-merkle-root"),
                timeLimit,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;

        await expect(swprClaimer.recover()).to.be.revertedWith(
            "ReleaseTimeLimitNotYetReached"
        );
    });

    it("should succeed when recovering after the release time limit when no one claimed", async () => {
        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 100;
        const duration = 1000;
        const timeLimit = startTimestamp + duration + 1000;
        const { initialHolderAccount, claimerAccount, swpr } =
            await loadFixture(fixture);
        const owner = claimerAccount;
        const swprClaimer = (await deployContract(
            owner,
            swprVestedClaimerJson,
            [
                swpr.address,
                formatBytes32String("fake-merkle-root"),
                timeLimit,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;
        const claimerFunding = 100; // 100 wei
        await swpr
            .connect(initialHolderAccount)
            .transfer(swprClaimer.address, claimerFunding);

        await fastForwardTo(timeLimit + 1);
        expect(await swpr.balanceOf(owner.address)).to.be.equal(0);
        await swprClaimer.recover();
        expect(await swpr.balanceOf(owner.address)).to.be.equal(claimerFunding);
    });

    it("should succeed when recovering after the claim time limit when someone claimed", async () => {
        const startTimestamp = Math.floor(Date.now() / 1000);
        const cliff = startTimestamp + 100;
        const duration = 1000;
        const timeLimit = startTimestamp + duration + 1000;
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
        const wallets = await waffle.provider.getWallets();
        const owner = wallets[6]; // random, new owner
        const swprClaimer = (await deployContract(
            owner,
            swprVestedClaimerJson,
            [
                swpr.address,
                tree.root,
                timeLimit,
                startTimestamp,
                duration,
                cliff,
            ]
        )) as unknown as SWPRVestedClaimer;

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
            .release(leaves[0].amount, tree.getProof(leaves[0]));

        await fastForwardTo(timeLimit + 10);
        expect(await swpr.balanceOf(owner.address)).to.be.equal(0);
        await swprClaimer.recover();
        expect(await swpr.balanceOf(owner.address)).to.be.equal(
            BigNumber.from(initialClaimerFunding).sub(50) // 50 was released in total (half of the original amount)
        );
    });
});
