import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { task } from "hardhat/config";
import { SWPRClaimer__factory, SWPR__factory } from "../typechain";
import { commify, formatEther } from "ethers/lib/utils";
import { DateTime } from "luxon";
import FACTORY_ABI from "./abis/factory.json";
import FEE_SETTER_ABI from "./abis/fee-setter.json";
import FEE_RECEIVER_ABI from "./abis/fee-receiver.json";
import ROUTER_ABI from "./abis/router.json";
import FARMING_CAMPAIGNS_FACTORY_ABI from "./abis/farming-campaigns-factory.json";

interface TaskArguments {
    swprL1Address: string;
    swprL2Address: string;
    daoL1Address: string;
    daoL2Address: string;
    swaprSchemeAddress: string;
    claimerAddress: string;
    factoryAddress: string;
    routerAddress: string;
    farmingCampaignsFactoryAddress: string;
    deployerAddress: string;
}

task(
    "verify-deployment",
    "Verifies a claimer and token deployment on Arbitrum One/mainnet"
)
    .addParam("swprL1Address", "The address of the SWPR token on L1 (mainnet)")
    .addParam("swprL2Address", "The address of the SWPR token on L2 (Arb1)")
    .addParam("daoL1Address", "The address of the DAO on L1 (mainnet)")
    .addParam("daoL2Address", "The address of the DAO on L2 (Arb1)")
    .addParam(
        "swaprSchemeAddress",
        "The address of the Swapr scheme on L2 (Arb1)"
    )
    .addParam(
        "claimerAddress",
        "The address of the claimer contract on L2 (Arb1)"
    )
    .addParam(
        "factoryAddress",
        "The address of the factory address on L2 (Arb1)"
    )
    .addParam("routerAddress", "The address of the router on L2 (Arb1)")
    .addParam(
        "farmingCampaignsFactoryAddress",
        "The address of the farming campaigns factory on L2 (Arb1)"
    )
    .addParam("deployerAddress", "The deploying address")
    .setAction(
        async (
            taskArguments: TaskArguments,
            hre: HardhatRuntimeEnvironment
        ) => {
            const {
                swprL1Address,
                daoL1Address,
                deployerAddress,
                claimerAddress,
                swprL2Address,
                daoL2Address,
                swaprSchemeAddress,
                factoryAddress,
                routerAddress,
                farmingCampaignsFactoryAddress,
            } = taskArguments;
            const l2Provider = new hre.ethers.providers.JsonRpcProvider(
                "https://arb1.arbitrum.io/rpc"
            );

            const l1Swpr = SWPR__factory.connect(
                swprL1Address,
                hre.ethers.provider
            );
            console.log("-- L1 SWPR --");
            console.log(
                `Total supply: ${commify(
                    formatEther(await l1Swpr.totalSupply())
                )}`
            );
            console.log(
                `DAO avatar balance: ${commify(
                    formatEther(await l1Swpr.balanceOf(daoL1Address))
                )}`
            );
            console.log(
                `Deployer's balance: ${commify(
                    formatEther(await l1Swpr.balanceOf(deployerAddress))
                )}`
            );

            const l2Swpr = SWPR__factory.connect(swprL2Address, l2Provider);
            console.log();
            console.log("-- L2 SWPR --");
            console.log(
                `Total supply: ${commify(
                    formatEther(await l2Swpr.totalSupply())
                )}`
            );
            console.log(
                `DAO avatar balance: ${commify(
                    formatEther(await l2Swpr.balanceOf(daoL2Address))
                )}`
            );
            console.log(
                `Swapr wallet scheme balance: ${commify(
                    formatEther(await l2Swpr.balanceOf(swaprSchemeAddress))
                )}`
            );
            console.log(
                `Deployer's balance: ${commify(
                    formatEther(await l2Swpr.balanceOf(deployerAddress))
                )}`
            );

            const claimer = SWPRClaimer__factory.connect(
                claimerAddress,
                l2Provider
            );
            console.log();
            console.log("-- L2 claimer --");
            console.log(`L2 SWPR address: ${await claimer.swprToken()}`);
            console.log(`Merkle root: ${await claimer.merkleRoot()}`);
            const claimTimeLimit = await claimer.claimTimeLimit();
            console.log(
                `Claim time limit: ${claimTimeLimit.toString()} (${DateTime.fromSeconds(
                    claimTimeLimit.toNumber(),
                    { zone: "utc" }
                )
                    .toUTC()
                    .toFormat("dd/MM/yyyy hh:mm")})`
            );
            console.log(
                `SWPR balance: ${commify(
                    formatEther(await l2Swpr.balanceOf(claimerAddress))
                )}`
            );

            const factory = await new hre.ethers.Contract(
                factoryAddress,
                FACTORY_ABI,
                l2Provider
            );
            console.log();
            console.log("-- Factory --");
            const feeReceiverAddress = await factory.feeTo();
            console.log(`Fee receiver address: ${feeReceiverAddress}`);
            const feeSetterAddress = await factory.feeToSetter();
            console.log(`Fee setter address: ${feeSetterAddress}`);

            const feeReceiver = await new hre.ethers.Contract(
                feeReceiverAddress,
                FEE_RECEIVER_ABI,
                l2Provider
            );
            console.log();
            console.log("-- Fee receiver --");
            console.log(`Owner: ${await feeReceiver.owner()}`);
            console.log(`Factory: ${await feeReceiver.factory()}`);
            console.log(`Native currency wrapper: ${await feeReceiver.WETH()}`);
            console.log(`ETH receiver: ${await feeReceiver.ethReceiver()}`);
            console.log(
                `Fallback receiver: ${await feeReceiver.fallbackReceiver()}`
            );

            const feeSetter = await new hre.ethers.Contract(
                feeSetterAddress,
                FEE_SETTER_ABI,
                l2Provider
            );
            console.log();
            console.log("-- Fee setter --");
            console.log(`Owner: ${await feeSetter.owner()}`);
            console.log(`Factory: ${await feeSetter.factory()}`);

            const router = await new hre.ethers.Contract(
                routerAddress,
                ROUTER_ABI,
                l2Provider
            );
            console.log();
            console.log("-- Router --");
            console.log(`Factory: ${await router.factory()}`);
            console.log(`Native currency wrapper: ${await router.WETH()}`);

            const farmingCampaignsFactory = await new hre.ethers.Contract(
                farmingCampaignsFactoryAddress,
                FARMING_CAMPAIGNS_FACTORY_ABI,
                l2Provider
            );
            console.log();
            console.log("-- Farming campaigns factory --");
            console.log(`Owner: ${await farmingCampaignsFactory.owner()}`);
        }
    );
