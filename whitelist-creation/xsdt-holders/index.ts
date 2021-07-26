import { BigNumber, constants, Contract } from "ethers";
import {
    loadCache,
    MAINNET_PROVIDER,
    saveCache,
    XSDT_MAINNET_ADDRESS,
    MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    logInPlace,
    getEoaAddresses,
} from "../commons";
import erc20Abi from "../abis/erc20.json";
import { parseEther } from "ethers/lib/utils";

// in order to be included in the airdrop, a minimum of 100 xSDT
// has to be held (worth ~100USD at the time of the snapshot)
const MINIMUM_HOLDINGS = parseEther("100");

const STATIC_AIRDROP_RECIPIENT_BLACKLIST = [
    "0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf", // Polygon bridge
    "0x221738f73fA4bfCA91918E77d112b87D918c751f", // StakeDAO NFT palace
];

const getXSdtTokenHoldersWithBalances = async () => {
    const holdersMap: {
        [address: string]: BigNumber;
    } = {};
    const erc20Contract = new Contract(
        XSDT_MAINNET_ADDRESS,
        erc20Abi,
        MAINNET_PROVIDER
    );

    const startingBlock = BigNumber.from("12051153"); // xsdt token deployment block
    const endingBlock = MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK;
    let lastAnalyzedBlock = startingBlock;
    const transferFilter = erc20Contract.filters.Transfer();
    const range =
        MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK - startingBlock.toNumber();
    while (lastAnalyzedBlock.lt(endingBlock)) {
        const toBlock = lastAnalyzedBlock.add(10000);
        const currentCheckpoint = lastAnalyzedBlock
            .sub(startingBlock)
            .toNumber();
        const progress = ((currentCheckpoint / range) * 100).toFixed(2);
        logInPlace(`reconstructing dxd balance map: ${progress}%`);
        const events = await erc20Contract.queryFilter(
            transferFilter,
            lastAnalyzedBlock.toHexString(),
            toBlock.toHexString()
        );
        events.forEach((event) => {
            const [from, to, value] = event.args!;
            if ((value as BigNumber).isZero()) return;
            if (from === constants.AddressZero) {
                holdersMap[to] = (holdersMap[to] || BigNumber.from(0)).add(
                    value
                );
            } else if (to === constants.AddressZero) {
                holdersMap[from] = holdersMap[from].sub(value);
            } else {
                holdersMap[from] = holdersMap[from].sub(value);
                holdersMap[to] = (holdersMap[to] || BigNumber.from(0)).add(
                    value
                );
            }
        });
        lastAnalyzedBlock = toBlock;
    }
    logInPlace("reconstructing dxd balance map: 100%");
    console.log();
    return Object.entries(holdersMap)
        .filter(([, balance]) => !balance.isZero())
        .reduce(
            (
                accumulator: { [address: string]: BigNumber },
                [address, balance]
            ) => {
                accumulator[address] = balance;
                return accumulator;
            },
            {}
        );
};

export const getWhitelistXSdtHolders = async () => {
    let eligibleXSdtHolders = await loadCache(`${__dirname}/cache.json`);
    if (eligibleXSdtHolders.length > 0) {
        console.log(
            `number of eligible xsdt holders from cache: ${eligibleXSdtHolders.length}`
        );
        return eligibleXSdtHolders;
    }

    const xsdtHolders = await getXSdtTokenHoldersWithBalances();
    eligibleXSdtHolders = Array.from(
        new Set(
            Object.entries(xsdtHolders)
                .filter(
                    ([address, balance]) =>
                        STATIC_AIRDROP_RECIPIENT_BLACKLIST.indexOf(address) <
                            0 && balance.gte(MINIMUM_HOLDINGS)
                )
                .map(([address]) => address)
        )
    );
    const { smartContracts } = await getEoaAddresses(
        eligibleXSdtHolders,
        MAINNET_PROVIDER
    );
    saveCache(eligibleXSdtHolders, `${__dirname}/cache.json`);
    saveCache(smartContracts, `${__dirname}/smart-contracts.mainnet.json`);
    console.log();
    return eligibleXSdtHolders;
};
