import { BigNumber } from "ethers";
import { gql, GraphQLClient } from "graphql-request";
import {
    DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    DXD_AIRDROP_XDAI_SNAPSHOT_BLOCK,
    DXD_MAINNET_ADDRESS,
    DXD_XDAI_ADDRESS,
    getAllDataFromSubgraph,
    SWAPR_MAINNET_SUBGRAPH_CLIENT,
    SWAPR_XDAI_SUBGRAPH_CLIENT,
} from "../commons";
import { Decimal } from "decimal.js-light";
import { getAddress, parseEther } from "ethers/lib/utils";

const PAIRS_TOKEN0_QUERY = gql`
    query getPairsDxdToken0($block: Int!, $address: String!, $lastId: ID) {
        data: pairs(
            block: { number: $block }
            where: { token0: $address, id_gt: $lastId }
        ) {
            id
        }
    }
`;

const PAIRS_TOKEN1_QUERY = gql`
    query getPairsDxdToken1($block: Int!, $address: String!, $lastId: ID) {
        data: pairs(
            block: { number: $block }
            where: { token1: $address, id_gt: $lastId }
        ) {
            id
        }
    }
`;

interface Pair {
    id: string;
}

const LIQUIDITY_POSITIONS_QUERY = gql`
    query getLiquidityPositions($block: Int!, $lastId: ID, $pairIds: [ID!]!) {
        data: liquidityPositions(
            block: { number: $block }
            where: {
                pair_in: $pairIds
                id_gt: $lastId
                liquidityTokenBalance_gt: 0
            }
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

const LIQUIDITY_MINING_POSITIONS_QUERY = gql`
    query getLiquidityMiningPositions(
        $lastId: ID
        $block: Int!
        $pairIds: [ID!]!
    ) {
        data: liquidityMiningPositions(
            block: { number: $block }
            where: {
                user_not_in: ["0x0000000000000000000000000000000000000000"]
                id_gt: $lastId
                targetedPair_in: $pairIds
                stakedAmount_gt: 0
            }
        ) {
            id
            user {
                address: id
            }
            liquidityTokenBalance: stakedAmount
            pair: targetedPair {
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

const getSubgraphData = async (
    subgraphClient: GraphQLClient,
    dxdAddress: string,
    block: number
): Promise<{
    positionsByToken0: LiquidityPosition[];
    positionsByToken1: LiquidityPosition[];
}> => {
    const dxdPairsByToken0 = await getAllDataFromSubgraph<Pair>(
        subgraphClient,
        PAIRS_TOKEN0_QUERY,
        { block, address: dxdAddress.toLowerCase() }
    );
    const standardPositionsByToken0 =
        await getAllDataFromSubgraph<LiquidityPosition>(
            subgraphClient,
            LIQUIDITY_POSITIONS_QUERY,
            { block, pairIds: dxdPairsByToken0.map((pair) => pair.id) }
        );
    const stakedPositionsByToken0 =
        await getAllDataFromSubgraph<LiquidityPosition>(
            subgraphClient,
            LIQUIDITY_MINING_POSITIONS_QUERY,
            { block, pairIds: dxdPairsByToken0.map((pair) => pair.id) }
        );
    // merging standard and staked positions
    const positionsByToken0: LiquidityPosition[] = standardPositionsByToken0;
    stakedPositionsByToken0.forEach((stakedPosition) => {
        const index = positionsByToken0.findIndex(
            (p) =>
                getAddress(p.user.address) ===
                getAddress(stakedPosition.user.address)
        );
        if (index >= 0)
            positionsByToken0[index].liquidityTokenBalance = new Decimal(
                positionsByToken0[index].liquidityTokenBalance
            )
                .plus(stakedPosition.liquidityTokenBalance)
                .toString();
    }, []);

    const dxdPairsByToken1 = await getAllDataFromSubgraph<Pair>(
        subgraphClient,
        PAIRS_TOKEN1_QUERY,
        { block, address: dxdAddress.toLowerCase() }
    );
    const standardPositionsByToken1 =
        await getAllDataFromSubgraph<LiquidityPosition>(
            subgraphClient,
            LIQUIDITY_POSITIONS_QUERY,
            { block, pairIds: dxdPairsByToken1.map((pair) => pair.id) }
        );
    const stakedPositionsByToken1 =
        await getAllDataFromSubgraph<LiquidityPosition>(
            subgraphClient,
            LIQUIDITY_MINING_POSITIONS_QUERY,
            { block, pairIds: dxdPairsByToken1.map((pair) => pair.id) }
        );
    // merging standard and staked positions
    const positionsByToken1: LiquidityPosition[] = standardPositionsByToken1;
    stakedPositionsByToken1.forEach((stakedPosition) => {
        const index = positionsByToken1.findIndex(
            (p) =>
                getAddress(p.user.address) ===
                getAddress(stakedPosition.user.address)
        );
        if (index >= 0)
            positionsByToken1[index].liquidityTokenBalance = new Decimal(
                positionsByToken1[index].liquidityTokenBalance
            )
                .plus(stakedPosition.liquidityTokenBalance)
                .toString();
    }, []);

    return { positionsByToken0, positionsByToken1 };
};

const getBalanceMap = (
    positionsByToken0: LiquidityPosition[],
    positionsByToken1: LiquidityPosition[]
): { [address: string]: BigNumber } => {
    const balanceMap: { [address: string]: BigNumber } = {};

    positionsByToken0.forEach((position) => {
        const userAddress = position.user.address;
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
        const userAddress = position.user.address;
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

export const getSwaprDxdLiquidityProviders = async (): Promise<{
    xDaiHolders: { [address: string]: BigNumber };
    mainnetHolders: { [address: string]: BigNumber };
}> => {
    const {
        positionsByToken0: mainnetToken0Positions,
        positionsByToken1: mainnetToken1Positions,
    } = await getSubgraphData(
        SWAPR_MAINNET_SUBGRAPH_CLIENT,
        DXD_MAINNET_ADDRESS,
        DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK.toNumber()
    );
    const mainnetHolders = getBalanceMap(
        mainnetToken0Positions,
        mainnetToken1Positions
    );

    const {
        positionsByToken0: xDaiToken0Positions,
        positionsByToken1: xDaiToken1Positions,
    } = await getSubgraphData(
        SWAPR_XDAI_SUBGRAPH_CLIENT,
        DXD_XDAI_ADDRESS,
        DXD_AIRDROP_XDAI_SNAPSHOT_BLOCK.toNumber()
    );
    const xDaiHolders = getBalanceMap(xDaiToken0Positions, xDaiToken1Positions);

    return { xDaiHolders, mainnetHolders };
};
