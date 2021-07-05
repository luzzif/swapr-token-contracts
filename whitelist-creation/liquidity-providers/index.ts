import { GraphQLClient, gql } from "graphql-request";
import {
    DATA_TIME_LIMIT,
    SWAPR_MAINNET_SUBGRAPH_CLIENT,
    SWAPR_XDAI_SUBGRAPH_CLIENT,
} from "../commons";

const MINTS_QUERY = gql`
    query getSwaps($upperTimeBound: BigInt!, $lastId: ID) {
        mints(
            where: {
                timestamp_lt: $upperTimeBound
                to_not_in: [
                    # Excluded are the 0 address (to which LP tokens are sent on first mint),
                    # the fee receiver address (obviously not eligible for airdrop) for
                    # both xDai and mainnet, and the DAO's avatar
                    "0x65f29020d07a6cfa3b0bf63d749934d5a6e6ea18"
                    "0xc6130400c1e3cd7b352db75055db9dd554e00ef0"
                    "0x519b70055af55a007110b4ff99b0ea33071c720a"
                    "0xe716ec63c5673b3a4732d22909b38d779fa47c3f"
                    "0x0000000000000000000000000000000000000000"
                ]
            }
            first: 1000
        ) {
            id
            to
        }
    }
`;

interface Mint {
    id: string;
    to: string;
}

interface QueryResult {
    mints: Mint[];
}

const getSubgraphData = async (
    subgraphClient: GraphQLClient
): Promise<Mint[]> => {
    let allFound = false;
    let lastId = "";
    let data = [];
    while (!allFound) {
        const result = await subgraphClient.request<QueryResult>(MINTS_QUERY, {
            lastId,
            upperTimeBound: DATA_TIME_LIMIT,
        });
        lastId = result.mints[result.mints.length - 1].id;
        data.push(...result.mints);
        if (result.mints.length < 1000) {
            allFound = true;
        }
    }
    return data;
};

// gets accounts who made 2 or more swapr trade until June 1st (valid for both xDai and mainnet)
export const getWhitelistLiquidityProviders = async () => {
    console.log("fetching mainnet mints");
    const mainnetMints = await getSubgraphData(SWAPR_MAINNET_SUBGRAPH_CLIENT);
    console.log(`fetched ${mainnetMints.length} mainnet mints`);

    console.log("fetching xDai mints");
    const xDaiMints = await getSubgraphData(SWAPR_XDAI_SUBGRAPH_CLIENT);
    console.log(`fetched ${xDaiMints.length} xDai mints`);

    const allMints = mainnetMints.concat(xDaiMints);

    const liquidityProviders = new Set<string>();
    allMints.forEach((mint) => {
        liquidityProviders.add(mint.to);
    });
    return Array.from(liquidityProviders);
};
