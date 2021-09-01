import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { task } from "hardhat/config";
import { SWPRDistributor, SWPRDistributor__factory } from "../typechain";

interface TaskArguments {
    verify: boolean;
    swprAddress: string;
}

task(
    "deploy-distributor",
    "Deploys the SWPR distributor contract and optionally verifies source code on Etherscan."
)
    .addParam("swprAddress", "The address of the SWPR token")
    .addFlag(
        "verify",
        "Additional (and optional) Etherscan contracts verification flag"
    )
    .setAction(
        async (
            taskArguments: TaskArguments,
            hre: HardhatRuntimeEnvironment
        ) => {
            const { verify, swprAddress } = taskArguments;

            await hre.run("clean");
            await hre.run("compile");

            // deploying the claimer
            const SWPRDistributor = (await hre.ethers.getContractFactory(
                "SWPRDistributor"
            )) as SWPRDistributor__factory;
            const swprDistributor: SWPRDistributor =
                await SWPRDistributor.deploy(swprAddress);

            if (verify) {
                await new Promise((resolve) => {
                    console.log("waiting");
                    setTimeout(resolve, 60000, []);
                });
                await hre.run("verify", {
                    contract: "contracts/SWPRClaimer.sol:SWPRClaimer",
                    address: swprDistributor.address,
                    constructorArgsParams: [swprAddress],
                });
                console.log(`source code verified`);
            }

            console.log(
                `distributor deployed at address ${swprDistributor.address}`
            );
        }
    );
