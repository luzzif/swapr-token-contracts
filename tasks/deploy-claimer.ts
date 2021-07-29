import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { task } from "hardhat/config";
import { SWPRClaimer, SWPRClaimer__factory } from "../typechain";

interface TaskArguments {
    verify: boolean;
    swprAddress: string;
    merkleRoot: string;
    claimTimeLimit: string;
}

task(
    "deploy-claimer",
    "Deploys the unvested claimer contract and optionally verifies source code on Etherscan. Requires the SWPR token to be deployed already, and a whitelist Merkle root"
)
    .addParam("swprAddress", "The address of the SWPR token")
    .addParam("merkleRoot", "The whitelisted addresses Merkle root")
    .addParam(
        "claimTimeLimit",
        "The Unix epoch formatted timestamp at which claiming the airdrop will not be possible anymore"
    )
    .addFlag(
        "verify",
        "Additional (and optional) Etherscan contracts verification flag"
    )
    .setAction(
        async (
            taskArguments: TaskArguments,
            hre: HardhatRuntimeEnvironment
        ) => {
            const { verify, swprAddress, merkleRoot, claimTimeLimit } =
                taskArguments;
            const signer = (await hre.ethers.getSigners())[0];
            const signerAddress = await signer.getAddress();

            await hre.run("clean");
            await hre.run("compile");

            // deploying the claimer
            const SWPRClaimer = (await hre.ethers.getContractFactory(
                "SWPRClaimer"
            )) as SWPRClaimer__factory;
            const swprClaimer: SWPRClaimer = await SWPRClaimer.deploy(
                swprAddress,
                merkleRoot,
                claimTimeLimit
            );

            if (verify) {
                await new Promise((resolve) => {
                    console.log("waiting");
                    setTimeout(resolve, 60000, []);
                });
                await hre.run("verify", {
                    contract: "contracts/SWPRClaimer.sol:SWPRClaimer",
                    address: swprClaimer.address,
                    constructorArgsParams: [
                        swprAddress,
                        merkleRoot,
                        claimTimeLimit,
                    ],
                });
                console.log(`source code verified`);
            }

            console.log(`claimer deployed at address ${swprClaimer.address}`);
        }
    );
