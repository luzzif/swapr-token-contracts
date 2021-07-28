import { gql, GraphQLClient } from "graphql-request";
import {
    getDeduplicatedAddresses,
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

const EOA_CACHE_LOCATION = `${__dirname}/cache/eoas.json`;
const MAINNET_SC_CACHE_LOCATION = `${__dirname}/cache/mainnet-scs.json`;
const XDAI_SC_CACHE_LOCATION = `${__dirname}/cache/xdai-scs.json`;

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

export const getWhitelistPoapHolders = async (): Promise<{
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
            `poap holders from cache: ${eoas.length} eoas, ${mainnetSmartContracts.length} mainnet scs, ${xDaiSmartContracts.length} xdai scs`
        );
        return { eoas, mainnetSmartContracts, xDaiSmartContracts };
    }

    const mainnetHolders = await getSubgraphData(
        POAP_MAINNET_SUBGRAPH_CLIENT,
        MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK
    );
    const { eoas: rawMainnetEoas, smartContracts: rawMainnetSmartContracts } =
        await getEoaAddresses(mainnetHolders, MAINNET_PROVIDER);

    const xDaiHolders = await getSubgraphData(
        POAP_XDAI_SUBGRAPH_CLIENT,
        MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK
    );
    const { eoas: rawXdaiEoas, smartContracts: rawXDaiSmartContracts } =
        await getEoaAddresses(xDaiHolders, XDAI_PROVIDER);

    eoas = getDeduplicatedAddresses([...rawMainnetEoas, ...rawXdaiEoas]);
    mainnetSmartContracts = rawMainnetSmartContracts;
    xDaiSmartContracts = rawXDaiSmartContracts;
    console.log(
        `poap holders: ${eoas.length} eoas, ${mainnetSmartContracts.length} mainnet scs, ${xDaiSmartContracts.length} xdai scs`
    );
    saveCache(eoas, EOA_CACHE_LOCATION);
    saveCache(mainnetSmartContracts, MAINNET_SC_CACHE_LOCATION);
    saveCache(xDaiSmartContracts, XDAI_SC_CACHE_LOCATION);
    return { eoas, mainnetSmartContracts, xDaiSmartContracts };
};
