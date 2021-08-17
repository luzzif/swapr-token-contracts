import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { SWPR__factory } from "../typechain";

interface TaskArguments {
    ownerAddress: string;
}

task(
    "estimate-swpr-deployment-gas-used",
    "Estimates the gas to be used when deploying SWPR to a given network. The estimation won't always be 100% accurate."
)
    .addParam(
        "ownerAddress",
        "The address which will own all the SWPR supply once deployed"
    )
    .setAction(
        async (
            taskArguments: TaskArguments,
            hre: HardhatRuntimeEnvironment
        ) => {
            const SWPR = (await hre.ethers.getContractFactory(
                "SWPR"
            )) as SWPR__factory;
            console.log(
                "estimated gas to be used:",
                (
                    await hre.ethers.provider.estimateGas(
                        SWPR.getDeployTransaction(taskArguments.ownerAddress)
                    )
                ).toString()
            );
        }
    );
