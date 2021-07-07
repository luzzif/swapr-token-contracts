import { getWhitelistMoreThanOneSwaprTrade } from "./two-swapr-trades";
import { getWhitelistLiquidityProviders } from "./liquidity-providers";
import { getWhitelistUniswapOnArbitrumYes } from "./uniswap-on-arbitrum-yes-voters";
import { getWhitelistMoreThanOneBanklessDaoVote } from "./two-bankless-dao-votes";
import { getWhitelistOmenUsers } from "./omen-users";
import { getWhitelistDexGuruTraders } from "./dex-guru-traders";

const createWhitelist = async () => {
    const dexGuruWhitelist = await getWhitelistDexGuruTraders();
    console.log(
        `number of addresses that traded more than twice on dex.guru: ${dexGuruWhitelist.length}`
    );

    console.log();

    const omenUsersWhitelist = await getWhitelistOmenUsers();
    console.log(
        `number of addresses that used omen: ${omenUsersWhitelist.length}`
    );

    console.log();

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
