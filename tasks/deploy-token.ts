import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { task } from "hardhat/config";
import { SWPR, SWPR__factory } from "../typechain";
import { TransparentUpgradeableProxy__factory } from "../typechain/factories/TransparentUpgradeableProxy__factory";
import { ProxyAdmin__factory } from "../typechain/factories/ProxyAdmin__factory";

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

            await hre.run("clean");
            await hre.run("compile");

            const ProxyAdmin = (await hre.ethers.getContractFactory(
                "ProxyAdmin"
            )) as ProxyAdmin__factory;
            const proxyAdmin = await ProxyAdmin.deploy();
            await proxyAdmin.deployed();

            const SWPR = (await hre.ethers.getContractFactory(
                "SWPR"
            )) as SWPR__factory;
            const swpr: SWPR = await SWPR.deploy();
            await swpr.deployed();

            const TransparentUpgradeableProxy =
                (await hre.ethers.getContractFactory(
                    "TransparentUpgradeableProxy"
                )) as TransparentUpgradeableProxy__factory;
            const proxy = await TransparentUpgradeableProxy.deploy(
                swpr.address,
                proxyAdmin.address,
                "0x"
            );
            await proxy.deployed();

            if (verify) {
                await new Promise((resolve) => {
                    console.log("waiting");
                    setTimeout(resolve, 60000, []);
                });
                await hre.run("verify", {
                    contract:
                        "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin",
                    address: proxyAdmin.address,
                    constructorArgsParams: [],
                });
                await hre.run("verify", {
                    contract: "contracts/SWPR.sol:SWPR",
                    address: swpr.address,
                    constructorArgsParams: [ownerAddress],
                });
                await hre.run("verify", {
                    contract:
                        "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
                    address: proxy.address,
                    constructorArgsParams: [
                        swpr.address,
                        proxyAdmin.address,
                        "",
                    ],
                });
                console.log(`source code verified`);
            }

            console.log(
                `proxy admin deployed at address ${proxyAdmin.address}`
            );
            console.log(`implementation deployed at address ${swpr.address}`);
            console.log(`proxy deployed at address ${proxy.address}`);
        }
    );
