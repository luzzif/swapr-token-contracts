import { getWhitelistMoreThanOneSwaprTrade } from "./two-swapr-trades";
import { getWhitelistLiquidityProviders } from "./liquidity-providers";
import { getWhitelistUniswapOnArbitrumYes } from "./uniswap-on-arbitrum-yes-voters";
import { getWhitelistMoreThanOneBanklessDaoVote } from "./two-bankless-dao-votes";
import { getWhitelistOmenUsers } from "./omen-users";
import { getWhitelistDexGuruTraders } from "./dex-guru-traders";
import { getWhitelistDxdHolders } from "./dxd-holders";
import { getWhitelistPoapHolders } from "./poap-holders";
import { getWhitelistXSdtHolders } from "./xsdt-holders";
import { getWhitelist1InchVoters } from "./1inch-governance-voters";

const createWhitelist = async () => {
    const oneInchVotersWhitelist = await getWhitelist1InchVoters();
    const xSdtHoldersWhitelist = await getWhitelistXSdtHolders();
    const poapHoldersWhitelist = await getWhitelistPoapHolders();
    const dexGuruWhitelist = await getWhitelistDexGuruTraders();
    const omenUsersWhitelist = await getWhitelistOmenUsers();
    const uniswapOnArbitrumYesWhitelist =
        await getWhitelistUniswapOnArbitrumYes();
    const moreThanOneBanklessDaoVoteWhitelist =
        await getWhitelistMoreThanOneBanklessDaoVote();
    const moreThanOneSwaprSwapWhitelist =
        await getWhitelistMoreThanOneSwaprTrade();
    const liquidityProvidersWhitelist = await getWhitelistLiquidityProviders();
    const dxdHoldersWhitelist = await getWhitelistDxdHolders();
};

createWhitelist().catch((error) => {
    console.error("could not create whitelist", error);
});
