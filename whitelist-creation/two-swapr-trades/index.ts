import { gql } from "graphql-request";
import {
    getAllDataFromSubgraph,
    getDeduplicatedAddresses,
    getEoaAddresses,
    loadCache,
    MAINNET_PROVIDER,
    MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK,
    saveCache,
    SWAPR_MAINNET_SUBGRAPH_CLIENT,
    SWAPR_XDAI_SUBGRAPH_CLIENT,
    XDAI_PROVIDER,
} from "../commons";
import { BigNumber, providers } from "ethers";
import { getAddress } from "ethers/lib/utils";

const EOA_CACHE_LOCATION = `${__dirname}/cache/eoas.json`;
const MAINNET_SC_CACHE_LOCATION = `${__dirname}/cache/mainnet-scs.json`;
const XDAI_SC_CACHE_LOCATION = `${__dirname}/cache/xdai-scs.json`;

const SWAPS_QUERY = gql`
    query getSwaps($lastId: ID, $block: Int!) {
        data: swaps(
            first: 1000
            block: { number: $block }
            where: {
                id_gt: $lastId
                from_not_in: [
                    "0x65f29020d07a6cfa3b0bf63d749934d5a6e6ea18"
                    "0xc6130400c1e3cd7b352db75055db9dd554e00ef0"
                ]
            }
        ) {
            id
            from
        }
    }
`;

interface Swap {
    id: string;
    from: string;
}

const getEoaSwaps = async (
    swaps: Swap[],
    provider: providers.JsonRpcProvider
): Promise<{ eoaSwaps: Swap[]; smartContracts: string[] }> => {
    const { eoas: eaoAddresses, smartContracts } = await getEoaAddresses(
        swaps.map((swap) => swap.from),
        provider
    );
    return {
        eoaSwaps: swaps.filter((swap) => eaoAddresses.indexOf(swap.from) >= 0),
        smartContracts,
    };
};

export const getWhitelistMoreThanOneSwaprTrade = async (): Promise<{
    eoas: string[];
    mainnetSmartContracts: string[];
    xDaiSmartContracts: string[];
}> => {
    let eoas = loadCache(EOA_CACHE_LOCATION);
    let mainnetSmartContracts = loadCache(MAINNET_SC_CACHE_LOCATION);
    let xDaiSmartContracts = loadCache(XDAI_SC_CACHE_LOCATION);
    if (
        eoas.length > 0 ||
        mainnetSmartContracts.length > 0 ||
        xDaiSmartContracts.length > 0
    ) {
        console.log(
            `swapr swappers: ${eoas.length} eoas, ${mainnetSmartContracts.length} mainnet scs, ${xDaiSmartContracts.length} xdai scs`
        );
        return { eoas, mainnetSmartContracts, xDaiSmartContracts };
    }

    const mainnetSwaps = await getAllDataFromSubgraph<Swap>(
        SWAPR_MAINNET_SUBGRAPH_CLIENT,
        SWAPS_QUERY,
        { block: MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK }
    );
    const mainnetSwappers = mainnetSwaps.map((swap) => getAddress(swap.from));
    const xDaiSwaps = await getAllDataFromSubgraph<Swap>(
        SWAPR_XDAI_SUBGRAPH_CLIENT,
        SWAPS_QUERY,
        { block: MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK }
    );
    const xDaiSwappers = xDaiSwaps.map((swap) => getAddress(swap.from));

    const allSwappers = [...mainnetSwappers, ...xDaiSwappers];
    const filteredSwappers = getDeduplicatedAddresses(
        Object.entries(
            allSwappers.reduce(
                (accumulator: { [address: string]: number }, swapper) => {
                    accumulator[swapper] = (accumulator[swapper] || 0) + 1;
                    return accumulator;
                },
                {}
            )
        )
            .filter(([, numberOfSwaps]) => numberOfSwaps > 1)
            .map(([address]) => address)
    );

    const { mainnetFilteredSwappers, xDaiFilteredSwappers } =
        filteredSwappers.reduce(
            (
                accumulator: {
                    mainnetFilteredSwappers: string[];
                    xDaiFilteredSwappers: string[];
                },
                swapper
            ) => {
                if (mainnetSwappers.indexOf(getAddress(swapper)) >= 0)
                    accumulator.mainnetFilteredSwappers.push(swapper);
                else accumulator.xDaiFilteredSwappers.push(swapper);
                return accumulator;
            },
            { mainnetFilteredSwappers: [], xDaiFilteredSwappers: [] }
        );

    const { eoas: rawMainnetEoas, smartContracts: rawMainnetSmartContracts } =
        await getEoaAddresses(mainnetFilteredSwappers, MAINNET_PROVIDER);
    const { eoas: rawXDaiEoas, smartContracts: rawXDaiSmartContracts } =
        await getEoaAddresses(xDaiFilteredSwappers, XDAI_PROVIDER);

    eoas = getDeduplicatedAddresses([...rawMainnetEoas, ...rawXDaiEoas]);
    mainnetSmartContracts = rawMainnetSmartContracts;
    xDaiSmartContracts = rawXDaiSmartContracts;

    console.log(
        `swapr swappers: ${eoas.length} eoas, ${mainnetSmartContracts.length} mainnet scs, ${xDaiSmartContracts.length} xdai scs`
    );
    console.log();
    saveCache(eoas, EOA_CACHE_LOCATION);
    saveCache(mainnetSmartContracts, MAINNET_SC_CACHE_LOCATION);
    saveCache(xDaiSmartContracts, XDAI_SC_CACHE_LOCATION);
    return { eoas, mainnetSmartContracts, xDaiSmartContracts };
};
