import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { task } from "hardhat/config";
import {
    SWPR,
    SWPRClaimer,
    SWPRClaimer__factory,
    SWPR__factory,
} from "../typechain";
import { MerkleTree } from "../merkle-tree";
import { formatBytes32String } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { DateTime } from "luxon";
import fs from "fs";

interface TaskArguments {
    verify: boolean;
    claimerFunding: string;
}

task(
    "test-deploy",
    "Deploys the whole contracts suite and optionally verifies source code on Etherscan. Useful to test out the whole process (SPWR is sent to the task caller)"
)
    .addParam(
        "claimerFunding",
        "How much SWPR token must be sent to the claimer (ultimately depends on the airdrop list)"
    )
    .addFlag(
        "verify",
        "Additional (and optional) Etherscan contracts verification"
    )
    .setAction(
        async (
            taskArguments: TaskArguments,
            hre: HardhatRuntimeEnvironment
        ) => {
            if (
                !fs.existsSync(
                    "../whitelist-creation/cache/marketing-and-unlocked-dxd-holders-airdrop-eoa-leaves.json"
                )
            )
                throw new Error(
                    "no cache to read data from. Please run the create-whitelist script once"
                );
            const airdropData = require("../whitelist-creation/cache/marketing-and-unlocked-dxd-holders-airdrop-eoa-leaves.json");

            const { verify, claimerFunding } = taskArguments;
            const signer = (await hre.ethers.getSigners())[0];
            const signerAddress = await signer.getAddress();

            await hre.run("clean");
            await hre.run("compile");

            const merkleTree = new MerkleTree(airdropData);
            const merkleRoot = merkleTree.root;
            if (merkleRoot === formatBytes32String("0x")) {
                throw new Error("invalid merkle root");
            }

            // deploying the token
            const SWPR = (await hre.ethers.getContractFactory(
                "SWPR"
            )) as SWPR__factory;
            // FIXME: this doesn't make much sense probably, the token is
            // intended to be deployed behind a proxy
            const swpr: SWPR = await SWPR.deploy();

            // deploying the claimer
            const SWPRClaimer = (await hre.ethers.getContractFactory(
                "SWPRClaimer"
            )) as SWPRClaimer__factory;
            const swprClaimer: SWPRClaimer = await SWPRClaimer.deploy(
                swpr.address,
                merkleRoot,
                DateTime.now().plus({ months: 1 }).toSeconds()
            );

            // funding the claimer
            await swpr
                .connect(signer)
                .transfer(swprClaimer.address, BigNumber.from(claimerFunding));

            if (verify) {
                await new Promise((resolve) => {
                    console.log("waiting");
                    setTimeout(resolve, 60000, []);
                });
                await hre.run("verify", {
                    contract: "contracts/SWPR.sol:SWPR",
                    address: swpr.address,
                    constructorArgsParams: [signerAddress],
                });
                await hre.run("verify", {
                    contract: "contracts/SWPRClaimer.sol:SWPRClaimer",
                    address: swprClaimer.address,
                    constructorArgsParams: [swpr.address, merkleRoot],
                });
                console.log(`source code verified`);
            }

            console.log(`swpr deployed at address ${swpr.address}`);
            console.log(`claimer deployed at address ${swprClaimer.address}`);
        }
    );
