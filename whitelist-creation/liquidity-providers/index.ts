import { providers } from "ethers";
import { gql } from "graphql-request";
import {
    getAllDataFromSubgraph,
    getEoaAddresses,
    loadCache,
    MAINNET_PROVIDER,
    MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK,
    saveCache,
    SWAPR_MAINNET_SUBGRAPH_CLIENT,
    SWAPR_XDAI_SUBGRAPH_CLIENT,
    XDAI_PROVIDER,
} from "../commons";

const CACHE_LOCATION = `${__dirname}/cache.json`;

const LIQUIDITY_POSITIONS_QUERY = gql`
    query getLiquidityPositions($lastId: ID, $block: Int!) {
        data: liquidityPositions(
            first: 1000
            block: { number: $block }
            where: {
                user_not_in: ["0x0000000000000000000000000000000000000000"]
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

const getEoaLiquidityPositions = async (
    liquidityPositions: LiquidityPosition[],
    provider: providers.JsonRpcProvider
): Promise<{ eoaPositions: LiquidityPosition[]; smartContracts: string[] }> => {
    const { eoas: eaoAddresses, smartContracts } = await getEoaAddresses(
        liquidityPositions.map(
            (liquidityPosition) => liquidityPosition.user.id
        ),
        provider
    );
    return {
        eoaPositions: liquidityPositions.filter(
            (liquidityPosition) =>
                eaoAddresses.indexOf(liquidityPosition.user.id) >= 0
        ),
        smartContracts,
    };
};

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
    const {
        eoaPositions: eoaMainnetLiquidityPositions,
        smartContracts: mainnetSmartContracts,
    } = await getEoaLiquidityPositions(
        mainnetLiquidityPositions,
        MAINNET_PROVIDER
    );
    console.log(
        `removed ${
            mainnetLiquidityPositions.length -
            eoaMainnetLiquidityPositions.length
        } SCs`
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
    const {
        eoaPositions: eoaXdaiLiquidityPositions,
        smartContracts: xDaiSmartContracts,
    } = await getEoaLiquidityPositions(
        mainnetLiquidityPositions,
        MAINNET_PROVIDER
    );
    console.log(
        `removed ${
            xDaiLiquidityPositions.length - eoaXdaiLiquidityPositions.length
        } SCs`
    );

    liquidityProviders = Array.from(
        new Set<string>(
            eoaMainnetLiquidityPositions
                .map((position) => position.user.id)
                .concat(
                    eoaXdaiLiquidityPositions.map(
                        (position) => position.user.id
                    )
                )
        )
    );
    console.log(
        `number of addresses that provided liquidity on swapr: ${liquidityProviders.length}`
    );
    console.log();
    saveCache(liquidityProviders, CACHE_LOCATION);
    saveCache(
        mainnetSmartContracts,
        `${__dirname}/smart-contracts.mainnet.json`
    );
    saveCache(xDaiSmartContracts, `${__dirname}/smart-contracts.xdai.json`);
    return liquidityProviders;
};
