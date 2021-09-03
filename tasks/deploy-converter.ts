import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { task } from "hardhat/config";
import {
    SWPRClaimer,
    SWPRClaimer__factory,
    SWPRConverter,
    SWPRConverter__factory,
} from "../typechain";

interface TaskArguments {
    verify: boolean;
    oldSwprAddress: string;
    newSwprAddress: string;
}

task("deploy-converter", "Deploys the converter contract")
    .addParam("oldSwprAddress", "The address of the old SWPR token")
    .addParam("newSwprAddress", "The address of the new SWPR token")
    .addFlag(
        "verify",
        "Additional (and optional) Etherscan contracts verification flag"
    )
    .setAction(
        async (
            taskArguments: TaskArguments,
            hre: HardhatRuntimeEnvironment
        ) => {
            const { verify, oldSwprAddress, newSwprAddress } = taskArguments;

            await hre.run("clean");
            await hre.run("compile");

            // deploying the claimer
            const SWPRConverter = (await hre.ethers.getContractFactory(
                "SWPRConverter"
            )) as SWPRConverter__factory;
            const swprConverter = await SWPRConverter.deploy(
                oldSwprAddress,
                newSwprAddress
            );

            if (verify) {
                await new Promise((resolve) => {
                    console.log("waiting");
                    setTimeout(resolve, 60000, []);
                });
                await hre.run("verify", {
                    contract: "contracts/SWPRConverter.sol:SWPRConverter",
                    address: swprConverter.address,
                    constructorArgsParams: [oldSwprAddress, newSwprAddress],
                });
                console.log(`source code verified`);
            }

            console.log(
                `converter deployed at address ${swprConverter.address}`
            );
        }
    );
