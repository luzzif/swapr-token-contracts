import { BigNumber } from "ethers";
import { gql } from "graphql-request";
import {
    DXD_MAINNET_ADDRESS,
    getAllDataFromSubgraph,
    UNISWAP_MAINNET_SUBGRAPH_CLIENT,
} from "../commons";

const PAIRS_TOKEN0_QUERY = gql`
    query getPairsDxdToken0($lastId: ID, $block: Int!) {
        data: pairs(
            block: { number: $block }
            where: {
                token0: "${DXD_MAINNET_ADDRESS.toLowerCase()}"
                id_gt: $lastId
            }
        ) {
            id
        }
    }
`;

const PAIRS_TOKEN1_QUERY = gql`
    query getPairsDxdToken1($lastId: ID, $block: Int!) {
        data: pairs(
            block: { number: $block }
            where: {
                token1: "${DXD_MAINNET_ADDRESS.toLowerCase()}"
                id_gt: $lastId
            }
        ) {
            id
        }
    }
`;

interface Pair {
    id: string;
}

const LIQUIDITY_POSITIONS_QUERY = gql`
    query getLpsDxdToken1($lastId: ID, $block: Int!, $pairIds: [ID!]!) {
        data: liquidityPositions(
            block: { number: $block }
            where: { pair_in: $pairIds, id_gt: $lastId }
            liquidityTokenBalance_gt: 0
        ) {
            id
            user {
                address: id
            }
        }
    }
`;

interface LiquidityPosition {
    id: string;
    user: { address: string };
}

const getSubgraphData = async (block: number): Promise<LiquidityPosition[]> => {
    const dxdPairsByToken0 = await getAllDataFromSubgraph<Pair>(
        UNISWAP_MAINNET_SUBGRAPH_CLIENT,
        PAIRS_TOKEN0_QUERY,
        { block }
    );
    const dxdPairsByToken1 = await getAllDataFromSubgraph<Pair>(
        UNISWAP_MAINNET_SUBGRAPH_CLIENT,
        PAIRS_TOKEN1_QUERY,
        { block }
    );
    const uniswapV2DxdPairs = dxdPairsByToken0.concat(dxdPairsByToken1);

    return getAllDataFromSubgraph<LiquidityPosition>(
        UNISWAP_MAINNET_SUBGRAPH_CLIENT,
        LIQUIDITY_POSITIONS_QUERY,
        { block, pairIds: uniswapV2DxdPairs.map((pair) => pair.id) }
    );
};

export const getUniswapV2DxdLiquidityProviders = async (block: BigNumber) => {
    console.log("fetching mainnet uniswap v2 dxd lps");
    const liquidityProviders = await getSubgraphData(block.toNumber());
    const dedupedLiquidityProviders = Array.from(
        new Set<string>(
            liquidityProviders.map((lp) => {
                return lp.user.address;
            })
        )
    );
    console.log(
        `fetched ${dedupedLiquidityProviders.length} mainnet uniswap v2 dxd lps`
    );
    console.log();
    return dedupedLiquidityProviders;
};
