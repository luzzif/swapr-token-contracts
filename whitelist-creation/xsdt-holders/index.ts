import { BigNumber } from "ethers";
import {
    loadCache,
    MAINNET_PROVIDER,
    saveCache,
    XSDT_MAINNET_ADDRESS,
    MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
} from "../commons";
import { getErc20NonZeroTokenHoldersEoaSnapshot } from "../erc20-eoa-snapshot";

export const getWhitelistXSdtHolders = async () => {
    let nonZeroXSdtHolders = await loadCache(`${__dirname}/cache.json`);
    if (nonZeroXSdtHolders.length > 0) {
        console.log(
            `number of single non-zero xsdt holders from cache: ${nonZeroXSdtHolders.length}`
        );
        return nonZeroXSdtHolders;
    }

    nonZeroXSdtHolders = await getErc20NonZeroTokenHoldersEoaSnapshot(
        XSDT_MAINNET_ADDRESS,
        BigNumber.from("12051153"), // xsdt token deployment block
        BigNumber.from(MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK),
        MAINNET_PROVIDER
    );
    saveCache(nonZeroXSdtHolders, `${__dirname}/cache.json`);
    return nonZeroXSdtHolders;
};
