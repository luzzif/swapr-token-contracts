import { BigNumber } from "ethers";
import {
    loadCache,
    MAINNET_PROVIDER,
    saveCache,
    XSDT_MAINNET_ADDRESS,
    MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
} from "../commons";
import { getErc20Holders } from "../erc20-eoa-snapshot";

export const getWhitelistXSdtHolders = async () => {
    let nonZeroXSdtHolders = await loadCache(`${__dirname}/cache.json`);
    if (nonZeroXSdtHolders.length > 0) {
        console.log(
            `number of single non-zero xsdt holders from cache: ${nonZeroXSdtHolders.length}`
        );
        return nonZeroXSdtHolders;
    }

    const { eoas, smartContracts } =
        await getErc20Holders(
            XSDT_MAINNET_ADDRESS,
            BigNumber.from("12051153"), // xsdt token deployment block
            BigNumber.from(MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK),
            MAINNET_PROVIDER,
            "xSDT",
            0.1
        );
    nonZeroXSdtHolders = eoas;
    saveCache(nonZeroXSdtHolders, `${__dirname}/cache.json`);
    saveCache(smartContracts, `${__dirname}/smart-contracts.mainnet.json`);
    console.log();
    return nonZeroXSdtHolders;
};
