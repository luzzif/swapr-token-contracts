import Decimal from "decimal.js-light";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { gql } from "graphql-request";
import {
    BALANCER_MAINNET_SUBGRAPH_CLIENT,
    DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    DXD_MAINNET_ADDRESS,
    getAllDataFromSubgraph,
} from "../commons";

const POOLS_QUERY = gql`
    query getPools($lastId: ID) {
        data: pools(
            block: { number: ${DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK.toNumber()} }
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
    query getLps($poolIds: [ID!]!, $lastId: ID) {
        data: poolShares(
            block: { number: ${DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK.toNumber()} }
            where: { poolId_in: $poolIds, balance_gt: 0, id_gt: $lastId }
        ) {
            id
            poolId {
                totalShares
                tokens(where: {address: "${DXD_MAINNET_ADDRESS.toLowerCase()}"}) {
                    balance
                }
            }
            userAddress {
                id
            }
            balance
        }
    }
`;

interface LiquidityProvider {
    id: string;
    userAddress: { id: string };
    poolId: { totalShares: string; tokens: { balance: string }[] };
    balance: string;
}

const getSubgraphData = async (): Promise<LiquidityProvider[]> => {
    const pools = await getAllDataFromSubgraph<Pool>(
        BALANCER_MAINNET_SUBGRAPH_CLIENT,
        POOLS_QUERY
    );

    return getAllDataFromSubgraph<LiquidityProvider>(
        BALANCER_MAINNET_SUBGRAPH_CLIENT,
        LIQUIDITY_PROVIDERS_QUERY,
        { poolIds: pools.map((pool) => pool.id) }
    );
};

export const getBalancerDxdLiquidityProviders = async () => {
    const balanceMap: { [address: string]: BigNumber } = {};

    const liquidityProviders = await getSubgraphData();
    liquidityProviders.forEach((position) => {
        const userAddress = position.userAddress.id;
        const userLpTokenBalance = new Decimal(position.balance);
        const pairTotalSupply = new Decimal(position.poolId.totalShares);
        const userPoolPercentage =
            userLpTokenBalance.dividedBy(pairTotalSupply);
        if (position.poolId.tokens.length !== 1)
            throw new Error("expected only one dxd token in the pool");
        const userDxdHolding = new Decimal(
            position.poolId.tokens[0].balance
        ).mul(userPoolPercentage);
        balanceMap[userAddress] = (
            balanceMap[userAddress] || BigNumber.from(0)
        ).add(parseEther(userDxdHolding.toFixed(18)));
    });

    return balanceMap;
};
