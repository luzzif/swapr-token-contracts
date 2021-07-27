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

const EOA_CACHE_LOCATION = `${__dirname}/cache/eoas.json`;
const SC_CACHE_LOCATION = `${__dirname}/cache/scs.json`;

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
        logInPlace(`reconstructing xsdt balance map: ${progress}%`);
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
    logInPlace("reconstructing xsdt balance map: 100%");
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

export const getWhitelistXSdtHolders = async (): Promise<{
    eoas: string[];
    smartContracts: string[];
}> => {
    let eoas = await loadCache(EOA_CACHE_LOCATION);
    let smartContracts = await loadCache(SC_CACHE_LOCATION);
    if (eoas.length > 0 || smartContracts.length > 0) {
        console.log(
            `xsdt holders from cache: ${eoas.length} eoas, ${smartContracts.length} scs`
        );
        return { eoas, smartContracts };
    }

    const xsdtHolders = await getXSdtTokenHoldersWithBalances();
    const holders = Array.from(
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
    const { eoas: rawEoas, smartContracts: rawSmartContracts } =
        await getEoaAddresses(holders, MAINNET_PROVIDER);
    eoas = rawEoas;
    smartContracts = rawSmartContracts;
    console.log(
        `xsdt holders: ${eoas.length} eoas, ${smartContracts.length} scs`
    );
    saveCache(eoas, EOA_CACHE_LOCATION);
    saveCache(smartContracts, SC_CACHE_LOCATION);
    console.log();
    return { eoas, smartContracts };
};
