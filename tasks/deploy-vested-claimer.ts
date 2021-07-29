import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { task } from "hardhat/config";
import { SWPRVestedClaimer, SWPRVestedClaimer__factory } from "../typechain";

interface TaskArguments {
    verify: boolean;
    swprAddress: string;
    merkleRoot: string;
    releaseTimeLimit: string;
    start: string;
    duration: string;
    cliff: string;
}

task(
    "deploy-vested-claimer",
    "Deploys the vested claimer contract and optionally verifies source code on Etherscan. Requires the SWPR token to be deployed already, and a whitelist Merkle root"
)
    .addParam("swprAddress", "The address of the SWPR token")
    .addParam("merkleRoot", "The whitelisted addresses Merkle root")
    .addParam(
        "releaseTimeLimit",
        "The Unix epoch formatted timestamp at which releasing the vested tokens will not be possible anymore"
    )
    .addParam("start", "The vesting start date, in Unix epoch format")
    .addParam("duration", "The vesting duration, in seconds")
    .addParam("cliff", "The cliff timestamp, in Unix epoch format")
    .addFlag(
        "verify",
        "Additional (and optional) Etherscan contracts verification flag"
    )
    .setAction(
        async (
            taskArguments: TaskArguments,
            hre: HardhatRuntimeEnvironment
        ) => {
            const {
                verify,
                swprAddress,
                merkleRoot,
                releaseTimeLimit,
                start,
                duration,
                cliff,
            } = taskArguments;
            const signer = (await hre.ethers.getSigners())[0];

            await hre.run("clean");
            await hre.run("compile");

            // deploying the claimer
            const SWPRVestedClaimer = (await hre.ethers.getContractFactory(
                "SWPRVestedClaimer"
            )) as SWPRVestedClaimer__factory;
            const swprVestedClaimer: SWPRVestedClaimer =
                await SWPRVestedClaimer.deploy(
                    swprAddress,
                    merkleRoot,
                    releaseTimeLimit,
                    start,
                    duration,
                    cliff
                );

            if (verify) {
                await new Promise((resolve) => {
                    console.log("waiting");
                    setTimeout(resolve, 60000, []);
                });
                await hre.run("verify", {
                    contract:
                        "contracts/SWPRVestedClaimer.sol:SWPRVestedClaimer",
                    address: swprVestedClaimer.address,
                    constructorArgsParams: [
                        swprAddress,
                        merkleRoot,
                        releaseTimeLimit,
                        start,
                        duration,
                        cliff,
                    ],
                });
                console.log(`source code verified`);
            }

            console.log(
                `vested claimer deployed at address ${swprVestedClaimer.address}`
            );
        }
    );
