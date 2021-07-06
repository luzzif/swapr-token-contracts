import { getWhitelistMoreThanOneSwaprTrade } from "./two-swapr-trades";
import { getWhitelistLiquidityProviders } from "./liquidity-providers";
import { getWhitelistUniswapOnArbitrumYes } from "./uniswap-on-arbitrum-yes-voters";
import { getWhitelistMoreThanOneBanklessDaoVote } from "./two-bankless-dao-votes";

const createWhitelist = async () => {
    const uniswapOnArbitrumYesWhitelist =
        await getWhitelistUniswapOnArbitrumYes();
    console.log(
        `number of addresses that voted yes to uniswap on arbitrum: ${uniswapOnArbitrumYesWhitelist.length}`
    );

    console.log();

    const moreThanOneBanklessDaoVoteWhitelist =
        await getWhitelistMoreThanOneBanklessDaoVote();
    console.log(
        `number of addresses that voted more than once on bankless dao: ${moreThanOneBanklessDaoVoteWhitelist.length}`
    );

    console.log();

    const positiveVotersWhitelist = await getWhitelistUniswapOnArbitrumYes();
    console.log(
        `number of addresses that voted for uniswap to be on arbitrum: ${positiveVotersWhitelist.length}`
    );

    console.log();

    const moreThanOneSwaprSwapWhitelist =
        await getWhitelistMoreThanOneSwaprTrade();
    console.log(
        `number of addresses with more than one swap on swapr: ${moreThanOneSwaprSwapWhitelist.length}`
    );

    console.log();

    const liquidityProvidersWhitelist = await getWhitelistLiquidityProviders();
    console.log(
        `number of addresses that have provided liquidity on swapr: ${liquidityProvidersWhitelist.length}`
    );
};

createWhitelist().catch((error) => {
    console.error("could not create whitelist", error);
});
