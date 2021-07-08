import { BigNumber } from "ethers";
import {
    loadCache,
    MAINNET_PROVIDER,
    XDAI_PROVIDER,
    saveCache,
    DXD_MAINNET_ADDRESS,
    DXD_XDAI_ADDRESS,
    MAINNET_SNAPSHOT_BLOCK,
    XDAI_SNAPSHOT_BLOCK,
} from "../commons";
import { getErc20NonZeroTokenHoldersEoaSnapshot } from "../erc20-eoa-snapshot";
import { getBalancerDxdLiquidityProviders } from "./balancer-lps";
import { getHoneyswapDxdLiquidityProviders } from "./honeyswap-lps";
import { getSushiswapDxdLiquidityProviders } from "./sushi-lps";
import { getUniswapV2DxdLiquidityProviders } from "./uniswap-lps";

export const getWhitelistDxdHolders = async () => {
    let nonZeroDxdHolders = await loadCache(`${__dirname}/cache.json`);
    if (nonZeroDxdHolders.length > 0) {
        console.log(
            `number of single non-zero dxd holders from cache: ${nonZeroDxdHolders.length}`
        );
        return nonZeroDxdHolders;
    }

    const honeyswapLps = await getHoneyswapDxdLiquidityProviders(
        XDAI_SNAPSHOT_BLOCK
    );

    const sushiswapLps = await getSushiswapDxdLiquidityProviders(
        MAINNET_SNAPSHOT_BLOCK,
        XDAI_SNAPSHOT_BLOCK
    );

    const uniswapV2Lps = await getUniswapV2DxdLiquidityProviders(
        MAINNET_SNAPSHOT_BLOCK
    );

    const balancerLps = await getBalancerDxdLiquidityProviders(
        MAINNET_SNAPSHOT_BLOCK
    );

    const xDaiNonZeroDxdHolders = await getErc20NonZeroTokenHoldersEoaSnapshot(
        DXD_XDAI_ADDRESS,
        BigNumber.from("15040609"), // dxd token proxy deployment block
        XDAI_SNAPSHOT_BLOCK,
        XDAI_PROVIDER
    );
    console.log(
        `fetched ${xDaiNonZeroDxdHolders.length} xdai non-zero dxd holders`
    );
    console.log();

    const mainnetNonZeroDxdHolders =
        await getErc20NonZeroTokenHoldersEoaSnapshot(
            DXD_MAINNET_ADDRESS,
            BigNumber.from("10012634"), // dxd token deployment block
            MAINNET_SNAPSHOT_BLOCK,
            MAINNET_PROVIDER
        );
    console.log(
        `fetched ${mainnetNonZeroDxdHolders.length} mainnet non-zero dxd holders`
    );
    console.log();

    nonZeroDxdHolders = Array.from(
        new Set([
            ...honeyswapLps,
            ...sushiswapLps,
            ...uniswapV2Lps,
            ...balancerLps,
            ...mainnetNonZeroDxdHolders,
            ...xDaiNonZeroDxdHolders,
        ])
    );
    console.log(
        `number of unique non-zero dxd holders: ${nonZeroDxdHolders.length}`
    );
    saveCache(nonZeroDxdHolders, `${__dirname}/cache.json`);

    return nonZeroDxdHolders;
};
