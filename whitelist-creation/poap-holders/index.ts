import { gql, GraphQLClient } from "graphql-request";
import {
    getEoaAddresses,
    loadCache,
    MAINNET_PROVIDER,
    MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK,
    POAP_MAINNET_SUBGRAPH_CLIENT,
    POAP_XDAI_SUBGRAPH_CLIENT,
    saveCache,
    XDAI_PROVIDER,
} from "../commons";

const CACHE_LOCATION = `${__dirname}/cache.json`;

const HOLDERS_QUERY = gql`
    query getHolders($block: Int!) {
        events(
            block: { number: $block }
            where: { id_in: [1783, 2052, 2049, 1199] }
        ) {
            tokens(first: 1000) {
                owner {
                    id
                }
            }
        }
    }
`;

interface Poap {
    owner: { id: string };
}

interface Event {
    tokens: Poap[];
}

interface QueryResult {
    events: Event[];
}

const getSubgraphData = async (
    subgraphClient: GraphQLClient,
    block: number
): Promise<string[]> => {
    const result = await subgraphClient.request<QueryResult>(HOLDERS_QUERY, {
        block,
    });
    return result.events.flatMap((event) => {
        if (event.tokens.length === 1000)
            throw new Error("pagination might be needed");
        return event.tokens.map((token) => token.owner.id);
    });
};

export const getWhitelistPoapHolders = async () => {
    let poapHolders = loadCache(CACHE_LOCATION);
    if (poapHolders.length > 0) {
        console.log(`number of poap holders from cache: ${poapHolders.length}`);
        return poapHolders;
    }

    console.log("fetching mainnet poap holders");
    const mainnetHolders = await getSubgraphData(
        POAP_MAINNET_SUBGRAPH_CLIENT,
        MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK
    );
    const { eoas: eoaMainnetHolders, smartContracts: mainnetSmartContracts } =
        await getEoaAddresses(mainnetHolders, MAINNET_PROVIDER);
    console.log(
        `fetched ${eoaMainnetHolders.length} mainnet poap holders (removed ${
            mainnetHolders.length - eoaMainnetHolders.length
        } SCs)`
    );

    console.log("fetching xdai poap holders");
    const xDaiHolders = await getSubgraphData(
        POAP_XDAI_SUBGRAPH_CLIENT,
        MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK
    );
    const { eoas: eoaXdaiHolders, smartContracts: xDaiSmartContracts } =
        await getEoaAddresses(xDaiHolders, XDAI_PROVIDER);
    console.log(
        `fetched ${eoaXdaiHolders.length} xdai poap holders (removed ${
            xDaiHolders.length - eoaXdaiHolders.length
        } SCs)`
    );
    poapHolders = Array.from(
        new Set<string>(eoaMainnetHolders.concat(eoaXdaiHolders))
    );
    console.log(`number of unique poap holders: ${poapHolders.length}`);
    console.log();
    saveCache(poapHolders, CACHE_LOCATION);
    saveCache(
        mainnetSmartContracts,
        `${__dirname}/smart-contracts.mainnet.json`
    );
    saveCache(xDaiSmartContracts, `${__dirname}/smart-contracts.xdai.json`);
    return poapHolders;
};
