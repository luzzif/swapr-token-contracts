import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { task } from "hardhat/config";
import { SWPR, SWPR__factory } from "../typechain";

interface TaskArguments {
    verify: boolean;
    ownerAddress: string;
}

task(
    "deploy-token",
    "Deploys the token contract and optionally verifies source code on Etherscan."
)
    .addParam(
        "ownerAddress",
        "The address to which the entire supply of SWPR tokens will be minted"
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
            const { verify, ownerAddress } = taskArguments;
            const signer = (await hre.ethers.getSigners())[0];

            await hre.run("clean");
            await hre.run("compile");

            const SWPR = (await hre.ethers.getContractFactory(
                "SWPR"
            )) as SWPR__factory;
            const swpr: SWPR = await SWPR.deploy(ownerAddress);

            if (verify) {
                await new Promise((resolve) => {
                    console.log("waiting");
                    setTimeout(resolve, 60000, []);
                });
                await hre.run("verify", {
                    contract: "contracts/SWPR.sol:SWPR",
                    address: swpr.address,
                    constructorArgsParams: [ownerAddress],
                });
                console.log(`source code verified`);
            }

            console.log(`token deployed at address ${swpr.address}`);
        }
    );
