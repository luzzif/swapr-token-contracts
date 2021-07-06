import { GraphQLClient } from "graphql-request";

export const SWAPR_MAINNET_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/luzzif/swapr-mainnet-alpha"
);

export const SWAPR_XDAI_SUBGRAPH_CLIENT = new GraphQLClient(
    "https://api.thegraph.com/subgraphs/name/luzzif/swapr-xdai"
);

export const SNAPSHOT_CLIENT = new GraphQLClient(
    "https://hub.snapshot.page/graphql"
);

// all the airdrop data is limited to before June 1st
export const DATA_TIME_LIMIT = 1622498400;
