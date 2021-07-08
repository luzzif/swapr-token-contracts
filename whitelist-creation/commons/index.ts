import { BigNumber, ethers } from "ethers";
import { GraphQLClient } from "graphql-request";
import fs from "fs";

export const UNISWAP_MAINNET_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2"
);

export const HONEYSWAP_XDAI_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/1hive/honeyswap-xdai"
);

export const SUSHISWAP_MAINNET_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/sushiswap/exchange"
);

export const SUSHISWAP_XDAI_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/sushiswap/xdai-exchange"
);

export const BALANCER_MAINNET_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer"
);

export const SWAPR_MAINNET_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/luzzif/swapr-mainnet-alpha"
);

export const SWAPR_XDAI_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/luzzif/swapr-xdai"
);

export const SNAPSHOT_CLIENT = new GraphQLClient(
    "https://hub.snapshot.page/graphql"
);

export const MAINNET_PROVIDER = new ethers.providers.AlchemyProvider(
    "mainnet",
    "b0J9XCEKwD1oWmA14bbtTfnZk9N8vCF-"
);

export const XDAI_PROVIDER = new ethers.providers.JsonRpcProvider(
    "https://xdai-archive.blockscout.com"
);

// all the airdrop data is limited to before June 1st
export const DATA_TIME_LIMIT = 1622498400;
export const MAINNET_SNAPSHOT_BLOCK = BigNumber.from("12737970"); // block mined on Jun-30-2021 10:00:04 PM +UTC
export const XDAI_SNAPSHOT_BLOCK = BigNumber.from("16850349"); // block published on July-01-2021 12:07:20 AM +2 UTC
export const DXD_MAINNET_ADDRESS = "0xa1d65E8fB6e87b60FECCBc582F7f97804B725521";
export const DXD_XDAI_ADDRESS = "0xb90D6bec20993Be5d72A5ab353343f7a0281f158";

export const saveCache = (addresses: string[], location: string) => {
    fs.writeFileSync(location, JSON.stringify(addresses, null, 4));
};

export const loadCache = (location: string): string[] => {
    if (!fs.existsSync(location)) return [];
    return JSON.parse(fs.readFileSync(location).toString());
};

export const logInPlace = (message: string) => {
    process.stdout.clearLine(-1);
    process.stdout.cursorTo(0);
    process.stdout.write(message);
};

export const getAllDataFromSubgraph = async <T>(
    subgraphClient: GraphQLClient,
    query: string,
    variables: object = {}
): Promise<Array<T>> => {
    let lastId = "";
    let allFound = false;
    let data = [];
    while (!allFound) {
        const result = await subgraphClient.request(query, {
            ...variables,
            lastId,
        });
        if (result.data.length === 0) {
            allFound = true;
            break;
        }
        lastId = result.data[result.data.length - 1].id;
        data.push(...result.data);
    }
    return data;
};
