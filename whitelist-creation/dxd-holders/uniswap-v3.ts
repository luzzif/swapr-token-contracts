import { BigNumber } from "ethers";
import { gql } from "graphql-request";
import {
    DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    DXD_MAINNET_ADDRESS,
    getAllDataFromSubgraph,
    UNISWAP_V3_MAINNET_SUBGRAPH_CLIENT,
} from "../commons";
import { Decimal } from "decimal.js-light";
import { getAddress, parseEther } from "ethers/lib/utils";

const LIQUIDITY_POSITIONS_TOKEN0_QUERY = gql`
    query getLiquidityPositionsToken0($lastId: ID) {
        data: positions(
            block: { number: ${DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK.toNumber()} }
            where: { liquidity_gt: 0, id_gt: $lastId, token0: "${DXD_MAINNET_ADDRESS.toLowerCase()}" }
        ) {
            id
            owner
            depositedToken: depositedToken0
        }
    }
`;

const LIQUIDITY_POSITIONS_TOKEN1_QUERY = gql`
    query getLiquidityPositionsToken1($lastId: ID) {
        data: positions(
            block: { number: ${DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK.toNumber()} }
            where: { liquidity_gt: 0, id_gt: $lastId, token1: "${DXD_MAINNET_ADDRESS.toLowerCase()}" }
        ) {
            id
            owner
            depositedToken: depositedToken1
        }
    }
`;

interface LiquidityPosition {
    id: string;
    owner: string;
    depositedToken: string;
}

const getSubgraphData = async (): Promise<{
    positionsByToken0: LiquidityPosition[];
    positionsByToken1: LiquidityPosition[];
}> => {
    const positionsByToken0 = await getAllDataFromSubgraph<LiquidityPosition>(
        UNISWAP_V3_MAINNET_SUBGRAPH_CLIENT,
        LIQUIDITY_POSITIONS_TOKEN0_QUERY
    );
    const positionsByToken1 = await getAllDataFromSubgraph<LiquidityPosition>(
        UNISWAP_V3_MAINNET_SUBGRAPH_CLIENT,
        LIQUIDITY_POSITIONS_TOKEN1_QUERY
    );

    return { positionsByToken0, positionsByToken1 };
};

export const getUniswapV3DxdLiquidityProviders = async (): Promise<{
    [address: string]: BigNumber;
}> => {
    const balanceMap: { [address: string]: BigNumber } = {};

    const { positionsByToken0, positionsByToken1 } = await getSubgraphData();

    positionsByToken0.forEach((position) => {
        const userAddress = getAddress(position.owner);
        const userBalance = parseEther(
            new Decimal(position.depositedToken).toFixed(18)
        );
        balanceMap[userAddress] = (
            balanceMap[userAddress] || BigNumber.from(0)
        ).add(userBalance);
    });

    positionsByToken1.forEach((position) => {
        const userAddress = getAddress(position.owner);
        const userBalance = parseEther(
            new Decimal(position.depositedToken).toFixed(18)
        );
        balanceMap[userAddress] = (
            balanceMap[userAddress] || BigNumber.from(0)
        ).add(userBalance);
    });

    return balanceMap;
};
