import { BigNumber } from "ethers";
import { gql, GraphQLClient } from "graphql-request";
import {
    DXD_MAINNET_ADDRESS,
    DXD_XDAI_ADDRESS,
    getAllDataFromSubgraph,
    SUSHISWAP_MAINNET_SUBGRAPH_CLIENT,
    SUSHISWAP_XDAI_SUBGRAPH_CLIENT,
} from "../commons";

const PAIRS_TOKEN0_QUERY = gql`
    query getPairsDxdToken0($lastId: ID, $block: Int!, $tokenAddress: Bytes!) {
        data: pairs(
            block: { number: $block }
            where: { token0: $tokenAddress, id_gt: $lastId }
        ) {
            id
        }
    }
`;

const PAIRS_TOKEN1_QUERY = gql`
    query getPairsDxdToken1($lastId: ID, $block: Int!, $tokenAddress: Bytes!) {
        data: pairs(
            block: { number: $block }
            where: { token1: $tokenAddress, id_gt: $lastId }
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
            where: { pair_in: $pairIds }
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

const getSubgraphData = async (
    subgraphClient: GraphQLClient,
    block: number,
    tokenAddress: string
): Promise<LiquidityPosition[]> => {
    const dxdPairsByToken0 = await getAllDataFromSubgraph<Pair>(
        subgraphClient,
        PAIRS_TOKEN0_QUERY,
        { block, tokenAddress }
    );
    const dxdPairsByToken1 = await getAllDataFromSubgraph<Pair>(
        subgraphClient,
        PAIRS_TOKEN1_QUERY,
        { block, tokenAddress }
    );
    const uniswapV2DxdPairs = dxdPairsByToken0.concat(dxdPairsByToken1);

    return getAllDataFromSubgraph<LiquidityPosition>(
        subgraphClient,
        LIQUIDITY_POSITIONS_QUERY,
        { block, pairIds: uniswapV2DxdPairs.map((pair) => pair.id) }
    );
};

export const getSushiswapDxdLiquidityProviders = async (
    mainnetBlock: BigNumber,
    xDaiBlock: BigNumber
) => {
    console.log("fetching mainnet sushi dxd lps");
    const mainnetLiquidityProviders = await getSubgraphData(
        SUSHISWAP_MAINNET_SUBGRAPH_CLIENT,
        mainnetBlock.toNumber(),
        DXD_MAINNET_ADDRESS.toLowerCase()
    );
    console.log(
        `fetched ${mainnetLiquidityProviders.length} mainnet sushi dxd lps`
    );

    console.log("fetching xdai sushi dxd lps");
    const xDaiLiquidityProviders = await getSubgraphData(
        SUSHISWAP_XDAI_SUBGRAPH_CLIENT,
        xDaiBlock.toNumber(),
        DXD_XDAI_ADDRESS.toLowerCase()
    );
    console.log(`fetched ${xDaiLiquidityProviders.length} xdai sushi dxd lps`);

    const dedupedLiquidityProviders = Array.from(
        new Set<string>(
            mainnetLiquidityProviders
                .concat(xDaiLiquidityProviders)
                .map((lp) => lp.user.address)
        )
    );
    console.log(`fetched ${dedupedLiquidityProviders.length} sushi dxd lps`);
    console.log();
    return dedupedLiquidityProviders;
};
