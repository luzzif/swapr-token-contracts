import { BigNumber } from "ethers";
import { gql } from "graphql-request";
import {
    BALANCER_MAINNET_SUBGRAPH_CLIENT,
    DXD_MAINNET_ADDRESS,
    getAllDataFromSubgraph,
} from "../commons";

const POOLS_QUERY = gql`
    query getPools($block: Int!, $lastId: ID) {
        data: pools(
            block: { number: $block }
            where: {
                tokensList_contains: [
                    "${DXD_MAINNET_ADDRESS.toLowerCase()}"
                ]
                liquidity_gt: 0
                id_gt: $lastId
            }
        ) {
            id
        }
    }
`;

interface Pool {
    id: string;
}

const LIQUIDITY_PROVIDERS_QUERY = gql`
    query getLps($block: Int!, $poolIds: [ID!]!, $lastId: ID) {
        data: poolShares(
            block: { number: $block }
            where: { poolId_in: $poolIds, balance_gt: 0, id_gt: $lastId }
        ) {
            id
            userAddress {
                id
            }
        }
    }
`;

interface LiquidityProvider {
    id: string;
    userAddress: { id: string };
}

const getSubgraphData = async (
    block: BigNumber
): Promise<LiquidityProvider[]> => {
    const pools = await getAllDataFromSubgraph<Pool>(
        BALANCER_MAINNET_SUBGRAPH_CLIENT,
        POOLS_QUERY,
        { block: block.toNumber() }
    );

    return getAllDataFromSubgraph<LiquidityProvider>(
        BALANCER_MAINNET_SUBGRAPH_CLIENT,
        LIQUIDITY_PROVIDERS_QUERY,
        { block: block.toNumber(), poolIds: pools.map((pool) => pool.id) }
    );
};

export const getBalancerDxdLiquidityProviders = async (block: BigNumber) => {
    console.log("fetching mainnet balancer dxd lps");
    const balancerLiquidityProviders = await getSubgraphData(block);

    const dedupedLiquidityProviders = Array.from(
        new Set<string>(
            balancerLiquidityProviders.map((lp) => {
                return lp.userAddress.id;
            })
        )
    );

    console.log(
        `fetched ${dedupedLiquidityProviders.length} mainnet balancer dxd lps`
    );
    console.log();
    return dedupedLiquidityProviders;
};
