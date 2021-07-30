import { BigNumber } from "ethers";
import { gql } from "graphql-request";
import {
    DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    DXD_MAINNET_ADDRESS,
    getAllDataFromSubgraph,
    UNISWAP_V2_MAINNET_SUBGRAPH_CLIENT,
} from "../commons";
import { Decimal } from "decimal.js-light";
import { getAddress, parseEther } from "ethers/lib/utils";

const PAIRS_TOKEN0_QUERY = gql`
    query getPairsDxdToken0($lastId: ID) {
        data: pairs(
            block: { number: ${DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK.toNumber()} }
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
    query getPairsDxdToken1($lastId: ID) {
        data: pairs(
            block: { number: ${DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK.toNumber()} }
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
    query getLiquidityPositions($lastId: ID, $pairIds: [ID!]!) {
        data: liquidityPositions(
            block: { number: ${DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK.toNumber()} }
            where: { pair_in: $pairIds, id_gt: $lastId, liquidityTokenBalance_gt: 0 }
        ) {
            id
            user {
                address: id
            }
            liquidityTokenBalance
            pair {
                totalSupply
                reserve0
                reserve1
            }
        }
    }
`;

interface LiquidityPosition {
    id: string;
    user: { address: string };
    liquidityTokenBalance: string;
    pair: {
        totalSupply: string;
        reserve0: string;
        reserve1: string;
    };
}

const getSubgraphData = async (): Promise<{
    positionsByToken0: LiquidityPosition[];
    positionsByToken1: LiquidityPosition[];
}> => {
    const dxdPairsByToken0 = await getAllDataFromSubgraph<Pair>(
        UNISWAP_V2_MAINNET_SUBGRAPH_CLIENT,
        PAIRS_TOKEN0_QUERY
    );
    const positionsByToken0 = await getAllDataFromSubgraph<LiquidityPosition>(
        UNISWAP_V2_MAINNET_SUBGRAPH_CLIENT,
        LIQUIDITY_POSITIONS_QUERY,
        { pairIds: dxdPairsByToken0.map((pair) => pair.id) }
    );

    const dxdPairsByToken1 = await getAllDataFromSubgraph<Pair>(
        UNISWAP_V2_MAINNET_SUBGRAPH_CLIENT,
        PAIRS_TOKEN1_QUERY
    );
    const positionsByToken1 = await getAllDataFromSubgraph<LiquidityPosition>(
        UNISWAP_V2_MAINNET_SUBGRAPH_CLIENT,
        LIQUIDITY_POSITIONS_QUERY,
        { pairIds: dxdPairsByToken1.map((pair) => pair.id) }
    );

    return { positionsByToken0, positionsByToken1 };
};

export const getUniswapV2DxdLiquidityProviders = async (): Promise<{
    [address: string]: BigNumber;
}> => {
    const balanceMap: { [address: string]: BigNumber } = {};

    const { positionsByToken0, positionsByToken1 } = await getSubgraphData();

    positionsByToken0.forEach((position) => {
        const userAddress = getAddress(position.user.address);
        const userLpTokenBalance = new Decimal(position.liquidityTokenBalance);
        const pairTotalSupply = new Decimal(position.pair.totalSupply);
        const userPoolPercentage =
            userLpTokenBalance.dividedBy(pairTotalSupply);
        const userDxdHolding = new Decimal(position.pair.reserve0).mul(
            userPoolPercentage
        );
        balanceMap[userAddress] = (
            balanceMap[userAddress] || BigNumber.from(0)
        ).add(parseEther(userDxdHolding.toFixed(18)));
    });

    positionsByToken1.forEach((position) => {
        const userAddress = getAddress(position.user.address);
        const userLpTokenBalance = new Decimal(position.liquidityTokenBalance);
        const pairTotalSupply = new Decimal(position.pair.totalSupply);
        const userPoolPercentage =
            userLpTokenBalance.dividedBy(pairTotalSupply);
        const userDxdHolding = new Decimal(position.pair.reserve1).mul(
            userPoolPercentage
        );
        balanceMap[userAddress] = (
            balanceMap[userAddress] || BigNumber.from(0)
        ).add(parseEther(userDxdHolding.toFixed(18)));
    });

    return balanceMap;
};
