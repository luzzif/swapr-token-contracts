import { BigNumber, ethers, providers } from "ethers";
import { GraphQLClient } from "graphql-request";
import fs from "fs";
import { Client } from "jayson";
import url from "url";

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

export const POAP_XDAI_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/poap-xyz/poap-xdai"
);

export const POAP_MAINNET_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/poap-xyz/poap"
);

export const MAINNET_PROVIDER_URL =
    "https://eth-mainnet.alchemyapi.io/v2/b0J9XCEKwD1oWmA14bbtTfnZk9N8vCF-";
export const MAINNET_PROVIDER = new ethers.providers.JsonRpcProvider(
    MAINNET_PROVIDER_URL
);

export const XDAI_PROVIDER_URL = "https://xdai-archive.blockscout.com";
export const XDAI_PROVIDER = new ethers.providers.JsonRpcProvider(
    XDAI_PROVIDER_URL
);

export const MARKETING_AIRDROP_TIME_LIMIT = 1625097600; // Jul-01-2021 12:00:00 AM UTC
export const MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK = 12738515; // Jul-01-2021 12:01:53 AM +UTC
export const MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK = 16851527; // Jul-01-2021 12:05:55 AM +UTC
export const DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK = BigNumber.from("12738515"); // block mined on Jun-30-2021 10:00:04 PM +UTC
export const DXD_AIRDROP_XDAI_SNAPSHOT_BLOCK = BigNumber.from("16851527"); // block published on July-01-2021 12:07:20 AM +2 UTC
export const DXD_MAINNET_ADDRESS = "0xa1d65E8fB6e87b60FECCBc582F7f97804B725521";
export const DXD_XDAI_ADDRESS = "0xb90D6bec20993Be5d72A5ab353343f7a0281f158";
export const XSDT_MAINNET_ADDRESS =
    "0xac14864ce5a98af3248ffbf549441b04421247d3";
export const MOONISWAP_FACTORY_MAINNET_ADDRESS =
    "0xbAF9A5d4b0052359326A6CDAb54BABAa3a3A9643";

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

interface ResponseItem {
    result: string;
}

export const getEoaAddresses = async (
    addresses: string[],
    provider: providers.JsonRpcProvider
): Promise<string[]> => {
    const eoas: string[] = [];
    const chunkSize = 1000;
    const chunksAmount = Math.ceil(addresses.length / chunkSize);
    const { host, pathname } = new url.URL(provider.connection.url);
    const jsonRpcClient = Client.https({
        host,
        path: pathname,
    });
    for (let i = 0; i < chunksAmount; i++) {
        const sliceEnd = Math.min(i * chunkSize + chunkSize, addresses.length);
        const slice = addresses.slice(i * chunkSize, sliceEnd);
        const callsBatch = slice.map((address) =>
            jsonRpcClient.request("eth_getCode", [address])
        );
        const batchCallResponse: ResponseItem[] = await new Promise(
            (resolve, reject) => {
                jsonRpcClient.request(
                    callsBatch,
                    (error: Error, response: any) => {
                        if (error) reject(error);
                        else resolve(response);
                    }
                );
            }
        );
        batchCallResponse.forEach((responseItem, index) => {
            if (responseItem.result === "0x") eoas.push(slice[index]);
        });
        logInPlace(
            `detecting smart contracts: ${(
                (sliceEnd / addresses.length) *
                100
            ).toFixed(2)}%`
        );
    }
    console.log();
    return eoas;
};
