import { getWhitelistMoreThanOneSwaprTrade } from "./two-swapr-trades";
import { getWhitelistLiquidityProviders } from "./liquidity-providers";
import { getWhitelistUniswapOnArbitrumYes } from "./uniswap-on-arbitrum-yes-voters";
import { getWhitelistMoreThanOneBanklessDaoVote } from "./two-bankless-dao-votes";
import { getWhitelistOmenUsers } from "./omen-users";
import { getWhitelistDexGuruTraders } from "./dex-guru-traders";
import { getWhitelistDxdHolders } from "./dxd-holders";
import { getWhitelistPoapHolders } from "./poap-holders";
import { getWhitelistXSdtHolders } from "./xsdt-holders";

const createWhitelist = async () => {
    console.log("fetching marketing airdrop data");
    console.log();
    const xSdtHoldersWhitelist = await getWhitelistXSdtHolders();
    const poapHoldersWhitelist = await getWhitelistPoapHolders();
    const dexGuruWhitelist = await getWhitelistDexGuruTraders();
    const omenUsersWhitelist = await getWhitelistOmenUsers();
    const uniswapOnArbitrumYesWhitelist =
        await getWhitelistUniswapOnArbitrumYes();
    const moreThanOneBanklessDaoVoteWhitelist =
        await getWhitelistMoreThanOneBanklessDaoVote();
    const positiveVotersWhitelist = await getWhitelistUniswapOnArbitrumYes();
    const moreThanOneSwaprSwapWhitelist =
        await getWhitelistMoreThanOneSwaprTrade();
    const liquidityProvidersWhitelist = await getWhitelistLiquidityProviders();

    console.log("fetching dxd holders airdrop data");
    console.log();
    const dxdHoldersWhitelist = await getWhitelistDxdHolders();
};

createWhitelist().catch((error) => {
    console.error("could not create whitelist", error);
});
