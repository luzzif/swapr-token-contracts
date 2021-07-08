import { gql } from "graphql-request";
import {
    getAllDataFromSubgraph,
    loadCache,
    MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK,
    saveCache,
    SWAPR_MAINNET_SUBGRAPH_CLIENT,
    SWAPR_XDAI_SUBGRAPH_CLIENT,
} from "../commons";

const CACHE_LOCATION = `${__dirname}/cache.json`;

const LIQUIDITY_POSITIONS_QUERY = gql`
    query getLiquidityPositions($lastId: ID, $block: Int!) {
        data: liquidityPositions(
            first: 1000
            block: { number: $block }
            where: {
                user_not_in: [
                    # Excluded are the 0 address (to which LP tokens are sent on first mint),
                    # the fee receiver address (obviously not eligible for airdrop) for
                    # both xDai and mainnet, and the DAO's avatar
                    "0x65f29020d07a6cfa3b0bf63d749934d5a6e6ea18"
                    "0xc6130400c1e3cd7b352db75055db9dd554e00ef0"
                    "0x519b70055af55a007110b4ff99b0ea33071c720a"
                    "0xe716ec63c5673b3a4732d22909b38d779fa47c3f"
                    "0x0000000000000000000000000000000000000000"
                ]
                id_gt: $lastId
                liquidityTokenBalance_gt: 0
            }
        ) {
            id
            user {
                id
            }
        }
    }
`;

interface LiquidityPosition {
    id: string;
    user: { id: string };
}

export const getWhitelistLiquidityProviders = async () => {
    let liquidityProviders = loadCache(CACHE_LOCATION);
    if (liquidityProviders.length > 0) {
        console.log(
            `number of addresses from cache that provided liquidity on swapr: ${liquidityProviders.length}`
        );
        return liquidityProviders;
    }

    console.log("fetching mainnet swapr liquidity positions");
    const mainnetLiquidityPositions =
        await getAllDataFromSubgraph<LiquidityPosition>(
            SWAPR_MAINNET_SUBGRAPH_CLIENT,
            LIQUIDITY_POSITIONS_QUERY,
            { block: MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK }
        );
    console.log(
        `fetched ${mainnetLiquidityPositions.length} mainnet swapr liquidity positions`
    );

    console.log("fetching xdai swapr liquidity positions");
    const xDaiLiquidityPositions =
        await getAllDataFromSubgraph<LiquidityPosition>(
            SWAPR_XDAI_SUBGRAPH_CLIENT,
            LIQUIDITY_POSITIONS_QUERY,
            { block: MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK }
        );
    console.log(
        `fetched ${xDaiLiquidityPositions.length} xdai swapr liquidity positions`
    );

    liquidityProviders = Array.from(
        new Set<string>(
            mainnetLiquidityPositions
                .map((position) => position.user.id)
                .concat(
                    xDaiLiquidityPositions.map((position) => position.user.id)
                )
        )
    );
    console.log(
        `number of addresses that provided liquidity on swapr: ${liquidityProviders.length}`
    );
    saveCache(liquidityProviders, CACHE_LOCATION);
    return liquidityProviders;
};
