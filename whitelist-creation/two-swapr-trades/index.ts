import { GraphQLClient, gql } from "graphql-request";
import {
    DATA_TIME_LIMIT,
    SWAPR_MAINNET_SUBGRAPH_CLIENT,
    SWAPR_XDAI_SUBGRAPH_CLIENT,
} from "../commons";

const SWAPS_QUERY = gql`
    query getSwaps( $lastId: ID) {
        swaps(
            where: {
                timestamp_lt: ${DATA_TIME_LIMIT}
                id_gt: $lastId
                from_not_in: [
                    "0x65f29020d07a6cfa3b0bf63d749934d5a6e6ea18"
                    "0xc6130400c1e3cd7b352db75055db9dd554e00ef0"
                ]
            }
            first: 1000
        ) {
            id
            from
        }
    }
`;

interface QueryResult {
    swaps: { id: string; from: string }[];
}

const getSubgraphData = async (
    subgraphClient: GraphQLClient
): Promise<{ id: string; from: string }[]> => {
    let allFound = false;
    let lastId = "";
    let data = [];
    while (!allFound) {
        const result = await subgraphClient.request<QueryResult>(SWAPS_QUERY, {
            lastId,
        });
        lastId = result.swaps[result.swaps.length - 1].id;
        data.push(...result.swaps);
        if (result.swaps.length < 1000) {
            allFound = true;
        }
    }
    return data;
};

// gets accounts who made 2 or more swapr trade until June 1st (valid for both xDai and mainnet)
export const getWhitelistMoreThanOneSwaprTrade = async () => {
    console.log("fetching mainnet swaps");
    const mainnetSwaps = await getSubgraphData(SWAPR_MAINNET_SUBGRAPH_CLIENT);
    console.log(`fetched ${mainnetSwaps.length} mainnet swaps`);

    console.log("fetching xDai swaps");
    const xDaiSwaps = await getSubgraphData(SWAPR_XDAI_SUBGRAPH_CLIENT);
    console.log(`fetched ${xDaiSwaps.length} xDai swaps`);

    const allSwaps = mainnetSwaps.concat(xDaiSwaps);

    return Object.entries(
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
};
