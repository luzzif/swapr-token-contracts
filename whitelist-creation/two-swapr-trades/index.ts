import { gql } from "graphql-request";
import {
    getAllDataFromSubgraph,
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
import { providers } from "ethers";

const CACHE_LOCATION = `${__dirname}/cache.json`;

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
): Promise<Swap[]> => {
    const eaoAddresses = await getEoaAddresses(
        swaps.map((swap) => swap.from),
        provider
    );
    return swaps.filter((swap) => eaoAddresses.indexOf(swap.from) >= 0);
};

export const getWhitelistMoreThanOneSwaprTrade = async () => {
    let serialSwappers = loadCache(CACHE_LOCATION);
    if (serialSwappers.length > 0) {
        console.log(
            `number of addresses from cache with more than 1 swapr swap: ${serialSwappers.length}`
        );
        return serialSwappers;
    }

    console.log("fetching swapr mainnet swaps");
    const mainnetSwaps = await getAllDataFromSubgraph<Swap>(
        SWAPR_MAINNET_SUBGRAPH_CLIENT,
        SWAPS_QUERY,
        { block: MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK }
    );
    console.log(`fetched ${mainnetSwaps.length} swapr mainnet swaps`);
    const eoaMainnetSwaps = await getEoaSwaps(mainnetSwaps, MAINNET_PROVIDER);
    console.log(
        `removed ${
            mainnetSwaps.length - eoaMainnetSwaps.length
        } sc-made mainnet swaps`
    );

    console.log("fetching swapr xdai swaps");
    const xDaiSwaps = await getAllDataFromSubgraph<Swap>(
        SWAPR_XDAI_SUBGRAPH_CLIENT,
        SWAPS_QUERY,
        { block: MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK }
    );
    console.log(`fetched ${xDaiSwaps.length} swapr xdai swaps`);
    const eoaXDaiSwaps = await getEoaSwaps(xDaiSwaps, XDAI_PROVIDER);
    console.log(
        `removed ${xDaiSwaps.length - eoaXDaiSwaps.length} sc-made xdai swaps`
    );

    const allSwaps = eoaMainnetSwaps.concat(eoaXDaiSwaps);

    serialSwappers = Object.entries(
        allSwaps.reduce((accumulator: { [swapper: string]: number }, swap) => {
            const { from: swapper } = swap;
            accumulator[swapper] = (accumulator[swapper] || 0) + 1;
            return accumulator;
        }, {})
    ).reduce((accumulator: string[], [swapper, numberOfSwaps]) => {
        if (numberOfSwaps < 2) return accumulator;
        accumulator.push(swapper);
        return accumulator;
    }, []);

    console.log(
        `number of addresses that swapped more than once on swapr: ${serialSwappers.length}`
    );
    saveCache(serialSwappers, CACHE_LOCATION);
    return serialSwappers;
};
