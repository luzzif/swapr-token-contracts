import { getWhitelistMoreThanOneSwaprTrade } from "./two-swapr-trades";
import { getWhitelistLiquidityProviders } from "./liquidity-providers";
import { getWhitelistUniswapOnArbitrumYes } from "./uniswap-on-arbitrum-yes-voters";
import { getWhitelistMoreThanOneBanklessDaoVote } from "./two-bankless-dao-votes";
import { getWhitelistOmenUsers } from "./omen-users";
import { getWhitelistDexGuruTraders } from "./dex-guru-traders";
import { getWhitelistedDxdHoldersBalanceMap } from "./dxd-holders";
import { getWhitelistPoapHolders } from "./poap-holders";
import { getWhitelistXSdtHolders } from "./xsdt-holders";
import { getWhitelist1InchVoters } from "./1inch-governance-voters";
import { BigNumber } from "ethers";
import { Leaf, MerkleTree } from "../merkle-tree";
import { formatEther, getAddress, parseEther } from "ethers/lib/utils";
import { outputJSONSync } from "fs-extra";
import { mergeBalanceMaps } from "./commons";

const MARKETING_AIRDROP_EOA_JSON_LOCATION = `${__dirname}/cache/marketing-airdrop-eoa-leaves.json`;
const MARKETING_AIRDROP_SC_JSON_LOCATION = `${__dirname}/cache/marketing-airdrop-sc-leaves.json`;
const DXD_AIRDROP_JSON_LOCATION = `${__dirname}/cache/dxd-airdrop-leaves.json`;

export const exportJsonLeaves = (leaves: Leaf[], location: string) => {
    outputJSONSync(location, leaves, { spaces: 4 });
};

const getAmountsMap = (
    overallAmount: BigNumber,
    eoas: string[],
    smartContracts: string[]
): {
    eoas: { [address: string]: BigNumber };
    smartContracts: { [address: string]: BigNumber };
} => {
    const amountPerUser = overallAmount.div(
        eoas.length + smartContracts.length
    ); // some integer truncation might occur
    return {
        eoas: eoas.reduce(
            (accumulator: { [address: string]: BigNumber }, account) => {
                accumulator[getAddress(account)] = amountPerUser;
                return accumulator;
            },
            {}
        ),
        smartContracts: smartContracts.reduce(
            (accumulator: { [address: string]: BigNumber }, account) => {
                accumulator[getAddress(account)] = amountPerUser;
                return accumulator;
            },
            {}
        ),
    };
};

const getBalanceWeightedAmountsMap = (
    overallAmount: BigNumber,
    totalBalance: BigNumber,
    accounts: { [address: string]: BigNumber }
): { [address: string]: BigNumber } => {
    return Object.entries(accounts).reduce(
        (
            accumulator: { [address: string]: BigNumber },
            [account, balance]: [string, BigNumber]
        ) => {
            accumulator[getAddress(account)] = overallAmount
                .mul(balance)
                .div(totalBalance);
            return accumulator;
        },
        {}
    );
};

const getTotalAmountFromMap = (map: {
    [address: string]: BigNumber;
}): BigNumber => {
    return Object.values(map).reduce(
        (total: BigNumber, value) => total.add(value),
        BigNumber.from(0)
    );
};

const buildLeaves = (amountMap: { [address: string]: BigNumber }): Leaf[] => {
    return Object.entries(amountMap).map(([account, amount]) => ({
        account: getAddress(account),
        amount: amount.toString(),
    }));
};

const createWhitelist = async () => {
    // Accounts that voted more than a certain amount on 1Inch governance
    const { eoas: oneInchEoas, smartContracts: oneInchSmartContracts } =
        await getWhitelist1InchVoters();
    const {
        eoas: oneInchEoaAmounts,
        smartContracts: oneInchSmartContractAmounts,
    } = getAmountsMap(parseEther("873000"), oneInchEoas, oneInchSmartContracts);

    // Accounts that hold more than a certain amount of xSDT
    const { eoas: xSdtEoas, smartContracts: xSdtSmartContracts } =
        await getWhitelistXSdtHolders();
    const { eoas: xSdtEoaAmounts, smartContracts: xSdtSmartContractAmounts } =
        getAmountsMap(parseEther("214000"), xSdtEoas, xSdtSmartContracts);

    // Accounts that hold DXdao-issued POAPs
    const {
        eoas: poapEoas,
        mainnetSmartContracts: poapMainnetSmartContracts,
        xDaiSmartContracts: poapXDaiSmartContracts,
    } = await getWhitelistPoapHolders();
    if (poapXDaiSmartContracts.length > 0)
        throw new Error("xdai smart contracts detected");
    const { eoas: poapEoaAmounts, smartContracts: poapSmartContractAmounts } =
        getAmountsMap(parseEther("74000"), poapEoas, poapMainnetSmartContracts);

    // Accounts that traded more than a certain amount on dex.guru
    const { eoas: dexGuruEoas, smartContracts: dexGuruSmartContracts } =
        await getWhitelistDexGuruTraders();
    const {
        eoas: dexGuruEoaAmounts,
        smartContracts: dexGuruSmartContractAmounts,
    } = getAmountsMap(parseEther("121900"), dexGuruEoas, dexGuruSmartContracts);

    // Accounts that traded more than a certain amount on dex.guru
    const {
        eoas: omenEoas,
        xDaiSmartContracts: omenXDaiSmartContracts,
        mainnetSmartContracts: omenMainnetSmartContracts,
    } = await getWhitelistOmenUsers();
    if (omenXDaiSmartContracts.length > 0)
        throw new Error("xdai smart contracts detected");
    const { eoas: omenEoaAmounts, smartContracts: omenSmartContractAmounts } =
        getAmountsMap(
            parseEther("515600"),
            omenEoas,
            omenMainnetSmartContracts
        );

    // Accounts that voted yes to Uniswap on Arbitrum
    const {
        eoas: uniswapOnArbitrumEoas,
        smartContracts: uniswapOnArbitrumSmartContracts,
    } = await getWhitelistUniswapOnArbitrumYes();
    const {
        eoas: uniswapOnArbitrumEoaAmounts,
        smartContracts: uniswapOnArbitrumSmartContractAmounts,
    } = await getAmountsMap(
        parseEther("359500"),
        uniswapOnArbitrumEoas,
        uniswapOnArbitrumSmartContracts
    );

    // Accounts that voted on Bankless DAO proposals
    const {
        eoas: banklessVoterEoas,
        smartContracts: banklessVoterSmartContracts,
    } = await getWhitelistMoreThanOneBanklessDaoVote();
    const {
        eoas: banklessVoterEoaAmounts,
        smartContracts: banklessVoterSmartContractAmounts,
    } = getAmountsMap(
        parseEther("376000"),
        banklessVoterEoas,
        banklessVoterSmartContracts
    );

    // Accounts that swapped on Swapr more than a certain amount
    const {
        eoas: swaprSwapperEoas,
        mainnetSmartContracts: swaprSwapperMainnetSmartContracts,
        xDaiSmartContracts: swaprSwapperXDaiSmartContracts,
    } = await getWhitelistMoreThanOneSwaprTrade();
    if (swaprSwapperXDaiSmartContracts.length > 0)
        throw new Error("xdai smart contracts detected");
    const {
        eoas: swaprSwapperEoaAmounts,
        smartContracts: swaprSwapperSmartContractAmounts,
    } = getAmountsMap(
        parseEther("376000"),
        swaprSwapperEoas,
        swaprSwapperMainnetSmartContracts
    );

    // Accounts that provided liquidity on Swapr
    const {
        eoas: swaprLpEoas,
        mainnetSmartContracts: swaprLpMainnetSmartContracts,
        xDaiSmartContracts: swaprLpXDaiSmartContracts,
    } = await getWhitelistLiquidityProviders();
    if (swaprLpXDaiSmartContracts.length > 0)
        throw new Error("xdai smart contracts detected");
    const {
        eoas: swaprLpEoaAmounts,
        smartContracts: swaprLpSmartContractAmounts,
    } = getAmountsMap(
        parseEther("90000"),
        swaprLpEoas,
        swaprLpMainnetSmartContracts
    );

    const eoaMarketingAmountsMap = {};
    mergeBalanceMaps(eoaMarketingAmountsMap, oneInchEoaAmounts);
    mergeBalanceMaps(eoaMarketingAmountsMap, xSdtEoaAmounts);
    mergeBalanceMaps(eoaMarketingAmountsMap, poapEoaAmounts);
    mergeBalanceMaps(eoaMarketingAmountsMap, dexGuruEoaAmounts);
    mergeBalanceMaps(eoaMarketingAmountsMap, omenEoaAmounts);
    mergeBalanceMaps(eoaMarketingAmountsMap, uniswapOnArbitrumEoaAmounts);
    mergeBalanceMaps(eoaMarketingAmountsMap, banklessVoterEoaAmounts);
    mergeBalanceMaps(eoaMarketingAmountsMap, swaprSwapperEoaAmounts);
    mergeBalanceMaps(eoaMarketingAmountsMap, swaprLpEoaAmounts);
    const marketingAirdropEoaLeaves = buildLeaves(eoaMarketingAmountsMap);
    exportJsonLeaves(
        marketingAirdropEoaLeaves,
        MARKETING_AIRDROP_EOA_JSON_LOCATION
    );
    const marketingAirdropEoaTree = new MerkleTree(marketingAirdropEoaLeaves);
    console.log("marketing airdrop eoa root", marketingAirdropEoaTree.root);

    const smartContractMarketingAmountsMap = {};
    mergeBalanceMaps(
        smartContractMarketingAmountsMap,
        oneInchSmartContractAmounts
    );
    mergeBalanceMaps(
        smartContractMarketingAmountsMap,
        xSdtSmartContractAmounts
    );
    mergeBalanceMaps(
        smartContractMarketingAmountsMap,
        poapSmartContractAmounts
    );
    mergeBalanceMaps(
        smartContractMarketingAmountsMap,
        dexGuruSmartContractAmounts
    );
    mergeBalanceMaps(
        smartContractMarketingAmountsMap,
        omenSmartContractAmounts
    );
    mergeBalanceMaps(
        smartContractMarketingAmountsMap,
        uniswapOnArbitrumSmartContractAmounts
    );
    mergeBalanceMaps(
        smartContractMarketingAmountsMap,
        banklessVoterSmartContractAmounts
    );
    mergeBalanceMaps(
        smartContractMarketingAmountsMap,
        swaprSwapperSmartContractAmounts
    );
    mergeBalanceMaps(
        smartContractMarketingAmountsMap,
        swaprLpSmartContractAmounts
    );
    const marketingAirdropSmartContractLeaves = buildLeaves(
        smartContractMarketingAmountsMap
    );
    exportJsonLeaves(
        marketingAirdropSmartContractLeaves,
        MARKETING_AIRDROP_SC_JSON_LOCATION
    );
    const marketingAirdropSmartContractTree = new MerkleTree(
        marketingAirdropSmartContractLeaves
    );
    console.log(
        "marketing airdrop sc root",
        marketingAirdropSmartContractTree.root
    );
    console.log(
        `marketing airdrop required funding: ${formatEther(
            getTotalAmountFromMap(eoaMarketingAmountsMap).add(
                getTotalAmountFromMap(smartContractMarketingAmountsMap)
            )
        )}`
    );

    const {
        eoas: dxdEoas,
        mainnetSmartContracts: dxdMainnetSmartContracts,
        xDaiSmartContracts: dxdXDaiSmartContracts,
    } = await getWhitelistedDxdHoldersBalanceMap();
    if (Object.keys(dxdXDaiSmartContracts).length > 0)
        throw new Error("xdai smart contracts detected");
    // calculating per-user amount based on balance-weighted algorithm
    const overallMap = {
        ...dxdEoas,
        ...dxdMainnetSmartContracts,
    };
    const totalDxdAmount = [...Object.values(overallMap)].reduce(
        (total: BigNumber, balance) => total.add(balance),
        BigNumber.from(0)
    );
    const dxdAmounts = getBalanceWeightedAmountsMap(
        parseEther("8000000"),
        totalDxdAmount,
        overallMap
    );
    const dxdLeaves = buildLeaves(dxdAmounts);
    exportJsonLeaves(dxdLeaves, DXD_AIRDROP_JSON_LOCATION);
    const dxdAirdropTree = new MerkleTree(dxdLeaves);
    console.log("dxd airdrop root", dxdAirdropTree.root);
    console.log(
        `dxd airdrop required funding: ${formatEther(
            getTotalAmountFromMap(dxdAmounts)
        )}`
    );
};

createWhitelist().catch((error) => {
    console.error("could not create whitelist", error);
});
