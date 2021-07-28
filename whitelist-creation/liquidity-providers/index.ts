import { getAddress } from "ethers/lib/utils";
import { gql, GraphQLClient } from "graphql-request";
import {
    getAllDataFromSubgraph,
    getDeduplicatedAddresses,
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

const EOA_CACHE_LOCATION = `${__dirname}/cache/eoas.json`;
const MAINNET_SC_CACHE_LOCATION = `${__dirname}/cache/mainnet-scs.json`;
const XDAI_SC_CACHE_LOCATION = `${__dirname}/cache/xdai-scs.json`;

const BLACKLIST = [
    // mainnet
    "0xC6130400C1e3cD7b352Db75055dB9dD554E00Ef0", // Fee receiver
    "0xC088E949b9643D5C47A188084579b8d19b1B1112", // Swapr liquidity relayer
    "0x068a593Ed20FAc229C527BE81765C7Fc497c3fD8", // Staking rewards distribution
    "0x627FF06e3be50295D60Cda25b3b54Ff2962b4f20", // Staking rewards distribution

    // xDai
    "0x3921d59090810C1d52807cD8ca1Ea2289E1F89e6", // Swapr liquidity relayer
    "0x20f94f9Deee309175fD2Fc4eB6b641929e004c0e", // Staking rewards distribution
    "0x060B50b5686f09ed87a1E42EEBBd14D289530459", // Staking rewards distribution
    "0xc0ef25b17AC4012C2961f6C5E16919b994B2d982", // Staking rewards distribution
    "0x426025387dC8409d17e5eDD4B9d0dC48dc16dd5A", // Staking rewards distribution
    "0xae16C58658A38660D606048ee9F8f7C341265054", // Staking rewards distribution
    "0xFDd43efb428f07F2c9ee7F0a3D05CC5026016950", // Staking rewards distribution
    "0x12cCe3dDe34b4c2e86136ad35e9D8a5AE32b8a3A", // Staking rewards distribution
    "0xbC217036a149Ca04e583F6E301749b8e9164a2F9", // Staking rewards distribution
    "0xcfB3C713dd07D2464d538Fde811aed32ec1494Ee", // Staking rewards distribution
    "0x437b6719d1e3f3e88b5847EfE6bFfB5dfc89c398", // Staking rewards distribution
    "0x795af0b98d1e87f5042ee2a1d4ff7ccbdfe6703b", // Staking rewards distribution
    "0xB145FBA04C22CA35c2Dca96E6CBa2Ec2d7a71Ec8", // Staking rewards distribution
    "0xbde739025ee81371891e9fd994a2a36e20f19c53", // Staking rewards distribution
    "0x7e8CFc46A41DbfD3cC8956Ecff74D14e8fE80218", // Staking rewards distribution
    "0x9edacc52a9bb7e32ddd12308b817d8e65621bfab", // Staking rewards distribution
    "0x65f29020d07A6CFa3B0bF63d749934d5A6E6ea18", // Fee receiver
    "0x61e7864d7174D83e5771bD8E75f201D95D2110ED", // Looks like Aragon stuff
].map(getAddress);

const LIQUIDITY_POSITIONS_QUERY = gql`
    query getLiquidityPositions($lastId: ID, $block: Int!) {
        data: liquidityPositions(
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

const LIQUIDITY_MINING_POSITIONS_QUERY = gql`
    query getLiquidityMiningPositions($lastId: ID, $block: Int!) {
        data: liquidityMiningPositions(
            block: { number: $block }
            where: {
                user_not_in: ["0x0000000000000000000000000000000000000000"]
                id_gt: $lastId
                stakedAmount_gt: 0
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

const getAllLiquidityPositions = async (
    subgraphClient: GraphQLClient,
    block: number
): Promise<LiquidityPosition[]> => {
    const pureLiquidityPositions =
        await getAllDataFromSubgraph<LiquidityPosition>(
            subgraphClient,
            LIQUIDITY_POSITIONS_QUERY,
            { block }
        );
    const stakedLiquidityPositions =
        await getAllDataFromSubgraph<LiquidityPosition>(
            subgraphClient,
            LIQUIDITY_MINING_POSITIONS_QUERY,
            { block }
        );
    return [...pureLiquidityPositions, ...stakedLiquidityPositions];
};

export const getWhitelistLiquidityProviders = async (): Promise<{
    eoas: string[];
    mainnetSmartContracts: string[];
    xDaiSmartContracts: string[];
}> => {
    let eoas = loadCache(EOA_CACHE_LOCATION);
    let mainnetSmartContracts = loadCache(MAINNET_SC_CACHE_LOCATION);
    let xDaiSmartContracts = loadCache(XDAI_SC_CACHE_LOCATION);
    if (
        eoas.length > 0 ||
        mainnetSmartContracts.length > 0 ||
        xDaiSmartContracts.length > 0
    ) {
        console.log(
            `swapr lps: ${eoas.length} eoas, ${mainnetSmartContracts.length} mainnet scs, ${xDaiSmartContracts.length} xdai scs`
        );
        return {
            eoas,
            mainnetSmartContracts,
            xDaiSmartContracts,
        };
    }

    const mainnetLiquidityPositions = await getAllLiquidityPositions(
        SWAPR_MAINNET_SUBGRAPH_CLIENT,
        MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK
    );
    const mainnetLps = getDeduplicatedAddresses(
        mainnetLiquidityPositions
            .map((position) => getAddress(position.user.id)) // enforces checksumming, and consistent casing
            .filter((address) => BLACKLIST.indexOf(address) < 0)
    );
    const { eoas: rawMainnetEoas, smartContracts: rawMainnetSmartContracts } =
        await getEoaAddresses(mainnetLps, MAINNET_PROVIDER);

    const xDaiLiquidityPositions = await getAllLiquidityPositions(
        SWAPR_XDAI_SUBGRAPH_CLIENT,
        MARKETING_AIRDROP_XDAI_SNAPSHOT_BLOCK
    );
    const xDaiLps = getDeduplicatedAddresses(
        xDaiLiquidityPositions
            .map((position) => getAddress(position.user.id)) // enforces checksumming, and consistent casing
            .filter((address) => BLACKLIST.indexOf(address) < 0)
    );
    const { eoas: rawXDaiEoas, smartContracts: rawXDaiSmartContracts } =
        await getEoaAddresses(xDaiLps, XDAI_PROVIDER);

    eoas = getDeduplicatedAddresses([...rawMainnetEoas, ...rawXDaiEoas]);
    mainnetSmartContracts = rawMainnetSmartContracts;
    xDaiSmartContracts = rawXDaiSmartContracts;
    console.log(
        `swapr lps: ${eoas.length} eoas, ${mainnetSmartContracts.length} mainnet scs, ${xDaiSmartContracts.length} xdai scs`
    );
    saveCache(eoas, EOA_CACHE_LOCATION);
    saveCache(mainnetSmartContracts, MAINNET_SC_CACHE_LOCATION);
    saveCache(xDaiSmartContracts, XDAI_SC_CACHE_LOCATION);
    return { eoas, mainnetSmartContracts, xDaiSmartContracts };
};
