import { getWhitelistEqualOrMoreThan2SwaprTrades } from "./2-swapr-trades";
import { getWhitelistLiquidityProviders } from "./liquidity-providers";
import { getWhitelistUniswapOnArbitrumYes } from "./uniswap-on-arbitrum-yes-voters";

const createWhitelist = async () => {
    const positiveVotersWhitelist = await getWhitelistUniswapOnArbitrumYes();
    console.log(
        `number of addresses that voted for uniswap to be on arbitrum: ${positiveVotersWhitelist.length}`
    );

    const moreThan2SwapsWhitelist =
        await getWhitelistEqualOrMoreThan2SwaprTrades();
    console.log(
        `number of addresses with more than 1 swap on swapr: ${moreThan2SwapsWhitelist.length}`
    );

    const liquidityProvidersWhitelist = await getWhitelistLiquidityProviders();
    console.log(
        `number of addresses that have provided liquidity on swapr: ${liquidityProvidersWhitelist.length}`
    );
};

createWhitelist().catch((error) => {
    console.error("could not create whitelist", error);
});
