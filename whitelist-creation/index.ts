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
import {
    formatEther,
    formatUnits,
    getAddress,
    parseEther,
} from "ethers/lib/utils";
import { outputJSONSync } from "fs-extra";
import { logInPlace, mergeBalanceMaps } from "./commons";
import Decimal from "decimal.js-light";

const MARKETING_AND_UNLOCKED_DXD_HOLDERS_AIRDROP_EOA_JSON_LOCATION = `${__dirname}/cache/marketing-and-unlocked-dxd-holders-airdrop-eoa-leaves.json`;
const MARKETING_AIRDROP_SC_JSON_LOCATION = `${__dirname}/cache/marketing-airdrop-sc-leaves.json`;
const VESTED_DXD_AIRDROP_JSON_LOCATION = `${__dirname}/cache/vested-dxd-airdrop-leaves.json`;

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

const getBalanceWeightedHalfAmountsMap = (
    overallAmount: BigNumber,
    totalBalance: BigNumber,
    eoas: { [address: string]: BigNumber },
    smartContracts: { [address: string]: BigNumber }
): {
    eoas: { [address: string]: BigNumber };
    smartContracts: { [address: string]: BigNumber };
} => {
    const reducer = (
        accumulator: { [address: string]: BigNumber },
        [account, balance]: [string, BigNumber]
    ) => {
        accumulator[getAddress(account)] = overallAmount
            .mul(balance)
            .div(totalBalance)
            .div(2);
        return accumulator;
    };

    return {
        eoas: Object.entries(eoas).reduce(reducer, {}),
        smartContracts: Object.entries(smartContracts).reduce(reducer, {}),
    };
};

const getTotalAmountFromMap = (map: {
    [address: string]: BigNumber;
}): BigNumber => {
    return Object.values(map).reduce(
        (total: BigNumber, value) => total.add(value),
        BigNumber.from(0)
    );
};

const checkForDuplicatedLeaves = (leaves: Leaf[]) => {
    leaves.forEach((leaf, index) => {
        const foundLeaf = leaves.find(
            (searchedLeaf, searchedIndex) =>
                index !== searchedIndex && // avoids triggering the error when the looked at leaf is encountered while scanning
                searchedLeaf.account.toLowerCase() ===
                    leaf.account.toLowerCase()
        );
        if (foundLeaf)
            throw new Error(
                `found duplicated leaf for account: ${foundLeaf.account}`
            );
        logInPlace(`checking for duplicates: ${index + 1}/${leaves.length}`);
    });
    logInPlace("");
};

const buildLeaves = (amountMap: { [address: string]: BigNumber }): Leaf[] => {
    return Object.entries(amountMap).map(([account, amount]) => ({
        account: getAddress(account),
        amount: amount.toString(),
    }));
};

const adjustWhitelist = (outputWhitelist: Leaf[], inputWhitelist: Leaf[]) => {
    inputWhitelist.forEach((leaf) => {
        const index = outputWhitelist.findIndex(
            (innerLeaf) =>
                innerLeaf.account.toLowerCase() === leaf.account.toLowerCase()
        );
        if (index === -1) outputWhitelist.push(leaf);
        else outputWhitelist[index] = leaf;
    });
};

const adjustVestedWhitelist = (
    outputWhitelist: Leaf[],
    inputWhitelist: Leaf[]
) => {
    inputWhitelist.forEach((leaf) => {
        const index = outputWhitelist.findIndex(
            (innerLeaf) =>
                innerLeaf.account.toLowerCase() === leaf.account.toLowerCase()
        );
        if (index === -1) outputWhitelist.push(leaf);
        else
            outputWhitelist[index] = {
                ...outputWhitelist[index],
                amount: formatUnits(
                    BigNumber.from(outputWhitelist[index].amount).sub(
                        leaf.amount
                    ),
                    "wei"
                ),
            };
    });
};

const getTotalSwprAmountInWhitelist = (whitelist: Leaf[]) => {
    return Object.values(whitelist).reduce(
        (accumulator: BigNumber, leaf) =>
            accumulator.add(BigNumber.from(leaf.amount)),
        BigNumber.from(0)
    );
};

const getAdjustedSwprAmounts = (
    wrongWhitelist: Leaf[],
    correctWhitelist: Leaf[]
) => {
    return wrongWhitelist.reduce(
        (
            accumulator: {
                address: string;
                percentage: Decimal;
                newAmount: BigNumber;
                addedAmount: BigNumber;
            }[],
            leaf
        ) => {
            const rightBalanceForAccount = correctWhitelist.find(
                (rightLeaf) => rightLeaf.account === leaf.account
            );
            if (!!!rightBalanceForAccount) throw new Error("no leaf found");

            const percentageChange = new Decimal(leaf.amount)
                .minus(rightBalanceForAccount.amount)
                .dividedBy(rightBalanceForAccount.amount)
                .times(100);
            let newAmount = BigNumber.from(rightBalanceForAccount.amount);
            let addedAmount = BigNumber.from(0);

            // handle those that got more
            if (
                !percentageChange.isZero() &&
                Number(percentageChange.toFixed(8)) < 7.115437455
            ) {
                newAmount = newAmount.add(
                    BigNumber.from(rightBalanceForAccount.amount)
                        .mul(711543746)
                        .div(10000000000)
                );
                addedAmount = newAmount.sub(leaf.amount);
            }
            if (addedAmount.gt(0)) {
                accumulator.push({
                    address: leaf.account,
                    percentage: percentageChange,
                    newAmount,
                    addedAmount,
                });
            }
            return accumulator;
        },
        []
    );
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

    const {
        eoas: dxdEoas,
        mainnetSmartContracts: dxdMainnetSmartContracts,
        xDaiSmartContracts: dxdXDaiSmartContracts,
    } = await getWhitelistedDxdHoldersBalanceMap();
    if (Object.keys(dxdXDaiSmartContracts).length > 0)
        throw new Error("xdai smart contracts detected");
    // calculating per-user amount based on balance-weighted algorithm
    const totalDxdAmount = [
        ...Object.values({
            ...dxdEoas,
            ...dxdMainnetSmartContracts,
        }),
    ].reduce(
        (total: BigNumber, balance) => total.add(balance),
        BigNumber.from(0)
    );

    // this map only represents half of the SWPR amount each DXD holder must get.
    // This is because half will be given out immediately, alongside the marketing airdrop,
    // while the other half will be vested for 2 years on mainnet.
    const { eoas: halfDxdAmountEoas, smartContracts: halfDxdAmountScs } =
        getBalanceWeightedHalfAmountsMap(
            parseEther("8000000"),
            totalDxdAmount,
            dxdEoas,
            dxdMainnetSmartContracts
        );
    const vestedMainnetDxdLeaves = buildLeaves({
        ...halfDxdAmountEoas,
        ...halfDxdAmountScs,
    });
    checkForDuplicatedLeaves(vestedMainnetDxdLeaves);
    exportJsonLeaves(vestedMainnetDxdLeaves, VESTED_DXD_AIRDROP_JSON_LOCATION);
    const vestedDxdAirdropTree = new MerkleTree(vestedMainnetDxdLeaves);

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
    mergeBalanceMaps(smartContractMarketingAmountsMap, halfDxdAmountScs);
    const marketingAirdropSmartContractLeaves = buildLeaves(
        smartContractMarketingAmountsMap
    );
    checkForDuplicatedLeaves(marketingAirdropSmartContractLeaves);
    exportJsonLeaves(
        marketingAirdropSmartContractLeaves,
        MARKETING_AIRDROP_SC_JSON_LOCATION
    );
    const marketingAirdropSmartContractTree = new MerkleTree(
        marketingAirdropSmartContractLeaves
    );

    const eoaMarketingAndUnlockedDxdHoldersAmountsMap = {};
    mergeBalanceMaps(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap,
        oneInchEoaAmounts
    );
    mergeBalanceMaps(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap,
        xSdtEoaAmounts
    );
    mergeBalanceMaps(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap,
        poapEoaAmounts
    );
    mergeBalanceMaps(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap,
        dexGuruEoaAmounts
    );
    mergeBalanceMaps(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap,
        omenEoaAmounts
    );
    mergeBalanceMaps(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap,
        uniswapOnArbitrumEoaAmounts
    );
    mergeBalanceMaps(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap,
        banklessVoterEoaAmounts
    );
    mergeBalanceMaps(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap,
        swaprSwapperEoaAmounts
    );
    mergeBalanceMaps(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap,
        swaprLpEoaAmounts
    );
    mergeBalanceMaps(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap,
        halfDxdAmountEoas
    );
    const marketingAndUnlockedDxdHoldersAirdropEoaLeaves = buildLeaves(
        eoaMarketingAndUnlockedDxdHoldersAmountsMap
    );
    checkForDuplicatedLeaves(marketingAndUnlockedDxdHoldersAirdropEoaLeaves);
    exportJsonLeaves(
        marketingAndUnlockedDxdHoldersAirdropEoaLeaves,
        MARKETING_AND_UNLOCKED_DXD_HOLDERS_AIRDROP_EOA_JSON_LOCATION
    );
    const marketingAndUnlockedDxdHoldersAirdropEoatREE = new MerkleTree(
        marketingAndUnlockedDxdHoldersAirdropEoaLeaves
    );

    console.log(
        "marketing and unlocked dxd holders airdrop eoa root",
        marketingAndUnlockedDxdHoldersAirdropEoatREE.root
    );
    console.log(
        "marketing and unlocked dxd holders airdrop sc root",
        marketingAirdropSmartContractTree.root
    );
    console.log(
        `marketing airdrop required funding: ${formatEther(
            getTotalAmountFromMap(eoaMarketingAndUnlockedDxdHoldersAmountsMap)
        )} on arbitrum and ${formatEther(
            getTotalAmountFromMap(smartContractMarketingAmountsMap)
        )} on mainnet`
    );
    console.log("vested dxd mainnet airdrop root", vestedDxdAirdropTree.root);
    console.log(
        `vested dxd airdrop required funding: ${formatEther(
            getTotalAmountFromMap(halfDxdAmountEoas).add(
                getTotalAmountFromMap(halfDxdAmountScs)
            )
        )}`
    );

    const wrongEoaLeaves =
        require(`${__dirname}/cache/old-and-wrong/marketing-and-unlocked-dxd-holders-airdrop-eoa-leaves.json`) as Leaf[];
    const wrongScLeaves =
        require(`${__dirname}/cache/old-and-wrong/marketing-airdrop-sc-leaves.json`) as Leaf[];

    const adjustedEoaWhitelist: Leaf[] = [];
    adjustWhitelist(adjustedEoaWhitelist, wrongEoaLeaves);
    const adjustedScWhitelist: Leaf[] = [];
    adjustWhitelist(adjustedScWhitelist, wrongScLeaves);
    const adjustedVestedWhitelist: Leaf[] = [];
    adjustWhitelist(adjustedVestedWhitelist, vestedMainnetDxdLeaves);

    // calculate how much SWPR to give out to people that got more, but still less than 6.64% more
    const eoaAdjustments = getAdjustedSwprAmounts(
        wrongEoaLeaves,
        marketingAndUnlockedDxdHoldersAirdropEoaLeaves
    ).sort((a, b) =>
        a.percentage.lt(b.percentage)
            ? -1
            : a.percentage.eq(b.percentage)
            ? 0
            : 1
    );

    // logging out adjustments
    eoaAdjustments.forEach((item) => {
        console.log(
            `${item.address}: ${item.percentage.toFixed(8)}% - +${formatEther(
                item.addedAmount
            )} SWPR`
        );
    });
    console.log();

    adjustWhitelist(
        adjustedEoaWhitelist,
        eoaAdjustments.map((item) => {
            return {
                account: getAddress(item.address),
                amount: formatUnits(item.newAmount, "wei"),
            };
        })
    );

    const wrongEoasSwprAmount = getTotalSwprAmountInWhitelist(wrongEoaLeaves);
    console.log(
        "Wrong SWPR amount given out to EOAs:",
        formatEther(wrongEoasSwprAmount)
    );
    const adjustedEoasSwprAmount =
        getTotalSwprAmountInWhitelist(adjustedEoaWhitelist);
    console.log(
        "Adjusted SWPR amount given out to EOAs:",
        formatEther(adjustedEoasSwprAmount)
    );
    console.log(
        "Extra SWPR to give out to EOAs:",
        formatEther(adjustedEoasSwprAmount.sub(wrongEoasSwprAmount))
    );

    console.log();

    // calculate how much SWPR to give out to people that got more, but still less than 6.64% more
    const scAdjustments = getAdjustedSwprAmounts(
        wrongScLeaves,
        marketingAirdropSmartContractLeaves
    ).sort((a, b) =>
        a.percentage.lt(b.percentage)
            ? -1
            : a.percentage.eq(b.percentage)
            ? 0
            : 1
    );

    // logging out adjustments
    scAdjustments.forEach((item) => {
        console.log(
            `${item.address}: ${item.percentage.toFixed(8)}% - +${formatEther(
                item.addedAmount
            )} SWPR`
        );
    });
    console.log();

    adjustWhitelist(
        adjustedScWhitelist,
        scAdjustments.map((item) => {
            return {
                account: getAddress(item.address),
                amount: formatUnits(item.newAmount, "wei"),
            };
        })
    );

    const wrongScsSwprAmount = getTotalSwprAmountInWhitelist(wrongScLeaves);
    console.log(
        "Wrong SWPR amount given out to SCs:",
        formatEther(wrongScsSwprAmount)
    );
    const adjustedScsSwprAmount =
        getTotalSwprAmountInWhitelist(adjustedScWhitelist);
    console.log(
        "Adjusted SWPR amount given out to SCs:",
        formatEther(adjustedScsSwprAmount)
    );
    console.log(
        "Extra SWPR to give out to SCs:",
        formatEther(adjustedScsSwprAmount.sub(wrongScsSwprAmount))
    );

    adjustVestedWhitelist(
        adjustedVestedWhitelist,
        eoaAdjustments.map((item) => {
            return {
                account: getAddress(item.address),
                amount: formatUnits(item.addedAmount, "wei"),
            };
        })
    );
    adjustVestedWhitelist(
        adjustedVestedWhitelist,
        scAdjustments.map((item) => {
            return {
                account: getAddress(item.address),
                amount: formatUnits(item.addedAmount, "wei"),
            };
        })
    );

    console.log();
    console.log(
        "Total extra SWPR to give away for adjustments:",
        formatEther(
            adjustedScsSwprAmount
                .sub(wrongScsSwprAmount)
                .add(adjustedEoasSwprAmount.sub(wrongEoasSwprAmount))
        )
    );
    console.log();

    const totalVestedSwprAmount = getTotalSwprAmountInWhitelist(
        adjustedVestedWhitelist
    );
    console.log(
        "Total vested SWPR after adjustments:",
        formatEther(totalVestedSwprAmount)
    );
    console.log(
        "Total unlocked SWPR after adjustments:",
        formatEther(adjustedEoasSwprAmount.add(adjustedScsSwprAmount))
    );

    console.log(
        "Total SWPR to give away after adjustments:",
        formatEther(
            adjustedEoasSwprAmount
                .add(adjustedScsSwprAmount)
                .add(totalVestedSwprAmount)
        )
    );
};

createWhitelist().catch((error) => {
    console.error("could not create whitelist", error);
});
