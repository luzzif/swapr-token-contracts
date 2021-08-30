import { BigNumber, constants, Contract, providers } from "ethers";
import {
    loadCache,
    MAINNET_PROVIDER,
    XDAI_PROVIDER,
    saveCache,
    DXD_MAINNET_ADDRESS,
    DXD_XDAI_ADDRESS,
    DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    DXD_AIRDROP_XDAI_SNAPSHOT_BLOCK,
    DXD_VESTING_FACTORY_ADDRESS,
    logInPlace,
    getEoaAddresses,
    getDeduplicatedAddresses,
    saveBalanceMapCache,
    loadBalanceMapCache,
    mergeBalanceMaps,
} from "../commons";
import { getHoneyswapDxdLiquidityProviders } from "./honeyswap-lps";
import { getUniswapV2DxdLiquidityProviders } from "./uniswap-v2";
import vestingFactoryAbi from "./abis/vesting-factory.json";
import erc20Abi from "../abis/erc20.json";
import { getAddress, parseEther } from "ethers/lib/utils";
import { getBalancerDxdLiquidityProviders } from "./balancer-lps";
import { getMesaDxdHolders } from "./mesa";
import { getSwaprDxdLiquidityProviders } from "./swapr";
import { getLoopringDxdHolders } from "./loopring";
import { getUniswapV3DxdLiquidityProviders } from "./uniswap-v3";

const EOA_CACHE_LOCATION = `${__dirname}/cache/eoas.json`;
const MAINNET_SC_CACHE_LOCATION = `${__dirname}/cache/mainnet-scs.json`;
const XDAI_SC_CACHE_LOCATION = `${__dirname}/cache/xdai-scs.json`;
const MAINNET_VESTING_CONTRACTS_CACHE_LOCATION = `${__dirname}/cache/mainnet-vesting-scs.json`;
const MAINNET_PURE_HOLDERS_CACHE_LOCATION = `${__dirname}/cache/mainnet-holders.json`;
const XDAI_PURE_HOLDERS_CACHE_LOCATION = `${__dirname}/cache/xdai-holders.json`;

// in order to be included in the airdrop, a minimum of 0.5 DXD has to be held
const MINIMUM_HOLDINGS = parseEther("0.5");

const STATIC_AIRDROP_RECIPIENT_BLACKLIST = [
    "0xBd12eBb77eF167a5FF93b7E572b33f2526aE3fd0", // DXD vesting contract for DXdao
    "0x6F400810b62df8E13fded51bE75fF5393eaa841F", // Mesa
    "0x519b70055af55A007110B4Ff99b0eA33071c720a", // DXdao's avatar
    "0x1c9052e823b5f4611EF7D5fB4153995b040ccbf5", // Uniswap v2 ETHDXD pair
    "0x8d12A197cB00D4747a1fe03395095ce2A5CC6819", // EtherDelta
    "0x2a0c0DBEcC7E4D658f48E01e3fA353F44050c208", // IDEX
    "0xa1d65E8fB6e87b60FECCBc582F7f97804B725521", // DXD itself
    "0xAf71d6c242A00E8364Ea0eF3c007f3413E975011", // Balancer ETHDXD 20/80 pool
    "0x9e04b421149043C04B33865D5ecd8f6C87F174b6", // Balancer 8-asset pool with DXD
    "0xB53AcBbe6Db0F80F9DaB5B9DC9E95E2e2393F000", // Balancer ETHDXD 50/50 pool
    "0xC59b0e4De5F1248C1140964E0fF287B192407E0C", // Conditional tokens framework
    "0xbBD31abb1E767C2771de21954728D75BC29333d8", // Balancer DXDLRC 50/50 pool
    "0xb0Dc4B36e0B4d2e3566D2328F6806EA0B76b4F13", // Swapr DXDETH pool
    "0xae8E0495b5784Ce114A5A5095a00C19780984cAf", // Swapr DXDUSDC pool
    "0x674bdf20A0F284D710BC40872100128e2d66Bd3f", // Loopring exchange v2 deposits
    "0x67BF56E4Cb13363Cc1a5f243E51354e7B72a8930", // Swapr DXDUSDT pair
    "0x88ad09518695c6c3712AC10a214bE5109a655671", // xDai bridge
    "0xf20945FabEA49511671895d91DF9A4a4e1be4d12", // Bancor pool
    "0x3328f5f2cEcAF00a2443082B657CedEAf70bfAEf", // GPv2 settlement
    "0xFad25176C366957ED4C592d21b21eec176D70630", // Uniswap v3 ETHDXD pool
    "0x068a593Ed20FAc229C527BE81765C7Fc497c3fD8", // Farming on Swapr with DXD and WETH as reward (locked)
    "0x627FF06e3be50295D60Cda25b3b54Ff2962b4f20", // Farming on Swapr with DXD and WETH as reward (unlocked)
    "0x745c1E2417455814C9359366d281b4A650A6AC61", // Uniswap v1 pair
    "0xE5c405C5578d84c5231D3a9a29Ef4374423fA0c2", // Custodian contract
    "0xdD9f24EfC84D93deeF3c8745c837ab63E80Abd27", // Governance leftover exchanger contract (not sure what it's about)
    "0x6709a35B20211479849F70E19Bc248481a448FA5", // Random bridge contract
    "0x43212005A9ed2Dab40b7901662965FB282664091", // Random bridge contract
    "0x9008D19f58AAbD9eD0D60971565AA8510560ab41", // GPv2 settlement
    "0xce0BB1a5e9c723fe189D9Bf5457DEd9b21E40f9E", // Gnosis protocol relayer
    "0xC6130400C1e3cD7b352Db75055dB9dD554E00Ef0", // Swapr fee receiver

    // xDai
    "0x1bDe964eCd52429004CbC5812C07C28bEC9147e9", // Swapr ETHDXD pool
    "0x9D7c92ad2bEcBc3899B83F3E3146bdF339202A80", // Honeyswap DXDXDAI pool
    "0xC0089390a8969330600bD9545897Dc8eb490Ef88", // Swapr DXDXDAI pool
    "0xD49c2798F2b2DBb12570cdf3dC18d6DC900b422C", // Swapr DXDAGVE pool
    "0xe716EC63C5673B3a4732D22909b38d779fa47c3F", // xDXdao avatar
    "0x060B50b5686f09ed87a1E42EEBBd14D289530459", // Farming campaign
    "0xc0ef25b17AC4012C2961f6C5E16919b994B2d982", // Farming campaign
    "0xB145FBA04C22CA35c2Dca96E6CBa2Ec2d7a71Ec8", // Farming campaign
    "0x25B06305CC4ec6AfCF3E7c0b673da1EF8ae26313", // Mesa
    "0xA369a0b81ee984a470EA0acf41EF9DdcDB5f7B46", // Gnosis protocol relayer
    "0x65f29020d07A6CFa3B0bF63d749934d5A6E6ea18", // Swapr fee receiver
    "0x61e7864d7174d83e5771bd8e75f201d95d2110ed", // Aragon stuff
    "0x3224f5E36a8EcC2782D2ffBAED7Ae3103F0Dd955", // Swapr liquidity relayer
    "0xA5570b7673Ed7aB8f5CbB7a7aE9c4808BA00C00b", // Elk finance stuff
].map(getAddress);

const getDxdTokenHoldersWithBalances = async (
    provider: providers.JsonRpcProvider,
    dxdAddress: string,
    startingBlock: BigNumber,
    endingBlock: BigNumber
) => {
    const holdersMap: {
        [address: string]: BigNumber;
    } = {};
    const erc20Contract = new Contract(dxdAddress, erc20Abi, provider);

    let lastAnalyzedBlock = startingBlock;
    const transferFilter = erc20Contract.filters.Transfer();
    const range = endingBlock.sub(startingBlock).toNumber();
    while (lastAnalyzedBlock.lt(endingBlock)) {
        const toBlock = lastAnalyzedBlock.add(10000);
        const currentCheckpoint = lastAnalyzedBlock
            .sub(startingBlock)
            .toNumber();
        const progress = ((currentCheckpoint / range) * 100).toFixed(2);
        logInPlace(`reconstructing dxd balance map: ${progress}%`);
        const events = await erc20Contract.queryFilter(
            transferFilter,
            lastAnalyzedBlock.toHexString(),
            toBlock.toHexString()
        );
        events.forEach((event) => {
            const [from, to, value] = event.args!;
            if ((value as BigNumber).isZero()) return;
            if (from === constants.AddressZero) {
                holdersMap[to] = (holdersMap[to] || BigNumber.from(0)).add(
                    value
                );
            } else if (to === constants.AddressZero) {
                holdersMap[from] = holdersMap[from].sub(value);
            } else {
                holdersMap[from] = holdersMap[from].sub(value);
                holdersMap[to] = (holdersMap[to] || BigNumber.from(0)).add(
                    value
                );
            }
        });
        lastAnalyzedBlock = toBlock;
    }
    logInPlace("");
    console.log();
    return Object.entries(holdersMap)
        .filter(([, balance]) => !balance.isZero())
        .reduce(
            (
                accumulator: { [address: string]: BigNumber },
                [address, balance]
            ) => {
                accumulator[getAddress(address)] = balance;
                return accumulator;
            },
            {}
        );
};

const getMainnetDxdVestingContractAddresses = async () => {
    let addresses = loadCache(MAINNET_VESTING_CONTRACTS_CACHE_LOCATION);
    if (addresses.length > 0) return addresses;
    const vestingContractAddresses = new Set<string>();
    const vestingFactoryContract = new Contract(
        DXD_VESTING_FACTORY_ADDRESS,
        vestingFactoryAbi,
        MAINNET_PROVIDER
    );
    const startingBlock = BigNumber.from(10699672); // vesting factory deployment block
    const endingBlock = DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK;
    let lastAnalyzedBlock = startingBlock;
    while (lastAnalyzedBlock.lt(endingBlock)) {
        const toBlock = lastAnalyzedBlock.add(10000);
        logInPlace(
            `getting vesting contracts creations: ${(
                ((lastAnalyzedBlock.toNumber() - startingBlock.toNumber()) /
                    (endingBlock.toNumber() - startingBlock.toNumber())) *
                100
            ).toFixed(2)}%`
        );
        const events = await vestingFactoryContract.queryFilter(
            vestingFactoryContract.filters.VestingCreated(),
            startingBlock.toHexString(),
            toBlock.toHexString()
        );

        events.forEach((event) => {
            vestingContractAddresses.add(getAddress(event.args![0] as string));
        });

        lastAnalyzedBlock = toBlock;
    }
    logInPlace("");
    console.log();
    console.log(`detected ${vestingContractAddresses.size} vesting contracts`);

    addresses = Array.from(vestingContractAddresses);
    saveCache(addresses, MAINNET_VESTING_CONTRACTS_CACHE_LOCATION);
    return addresses;
};

export const getWhitelistedDxdHoldersBalanceMap = async (): Promise<{
    eoas: { [address: string]: BigNumber };
    mainnetSmartContracts: { [address: string]: BigNumber };
    xDaiSmartContracts: { [address: string]: BigNumber };
}> => {
    let eoas = loadBalanceMapCache(EOA_CACHE_LOCATION);
    let mainnetSmartContracts = loadBalanceMapCache(MAINNET_SC_CACHE_LOCATION);
    let xDaiSmartContracts = loadBalanceMapCache(XDAI_SC_CACHE_LOCATION);
    // load data from cache if available
    if (
        Object.keys(eoas).length > 0 ||
        Object.keys(mainnetSmartContracts).length > 0 ||
        Object.keys(xDaiSmartContracts).length > 0
    ) {
        console.log(
            `dxd holders: ${Object.keys(eoas).length} eoas, ${
                Object.keys(mainnetSmartContracts).length
            } mainnet scs, ${Object.keys(xDaiSmartContracts).length} xdai scs`
        );
        return { eoas, mainnetSmartContracts, xDaiSmartContracts };
    }

    const uniswapV3LpBalances = await getUniswapV3DxdLiquidityProviders();
    const {
        xDaiHolders: xDaiSwaprBalances,
        mainnetHolders: mainnetSwaprBalances,
    } = await getSwaprDxdLiquidityProviders();
    const loopringBalances = await getLoopringDxdHolders();
    const {
        xDaiHolders: xDaiMesaBalances,
        mainnetHolders: mainnetMesaBalances,
    } = await getMesaDxdHolders();
    const honeyswapLpBalances = await getHoneyswapDxdLiquidityProviders();
    const uniswapV2LpBalances = await getUniswapV2DxdLiquidityProviders();
    const balancerLpBalances = await getBalancerDxdLiquidityProviders();

    const vestingContractAddresses = (
        await getMainnetDxdVestingContractAddresses()
    ).map(getAddress);
    const blacklist = getDeduplicatedAddresses([
        ...STATIC_AIRDROP_RECIPIENT_BLACKLIST,
        ...vestingContractAddresses,
    ]);

    // fetch "pure" xDai holders. I.e. addresses that currently hold
    // DXD (doesn't account for liquidity deposited in protocols etc)
    let pureXDaiHolders = loadBalanceMapCache(XDAI_PURE_HOLDERS_CACHE_LOCATION);
    if (!pureXDaiHolders || Object.keys(pureXDaiHolders).length === 0) {
        pureXDaiHolders = await getDxdTokenHoldersWithBalances(
            XDAI_PROVIDER,
            DXD_XDAI_ADDRESS,
            BigNumber.from("15040609"), // dxd token proxy deployment block
            DXD_AIRDROP_XDAI_SNAPSHOT_BLOCK
        );
        saveBalanceMapCache(pureXDaiHolders, XDAI_PURE_HOLDERS_CACHE_LOCATION);
    }

    // merge together data from pure holders, Mesa, Swapr and Honeyswap
    // protocols on xDai to get a better picture
    const allXDaiHolders: { [address: string]: BigNumber } = {};
    mergeBalanceMaps(allXDaiHolders, pureXDaiHolders);
    mergeBalanceMaps(allXDaiHolders, xDaiMesaBalances);
    mergeBalanceMaps(allXDaiHolders, xDaiSwaprBalances);
    mergeBalanceMaps(allXDaiHolders, honeyswapLpBalances);

    // get deduplicated addresses that are not on the blacklist
    const notOnBlacklistXDaiAddresses = getDeduplicatedAddresses(
        Object.entries(allXDaiHolders)
            .filter(([address]) => blacklist.indexOf(getAddress(address)) < 0)
            .map(([address]) => getAddress(address))
    );
    // separate eoas from smart contracts for non-blacklisted addresses
    const { smartContracts: rawXDaiSmartContracts, eoas: rawXDaiEoas } =
        await getEoaAddresses(notOnBlacklistXDaiAddresses, XDAI_PROVIDER);

    // fetch "pure" mainnet holders. I.e. addresses that currently hold
    // DXD (doesn't account for liquidity deposited in protocols etc)
    let pureMainnetHolders = loadBalanceMapCache(
        MAINNET_PURE_HOLDERS_CACHE_LOCATION
    );
    if (!pureMainnetHolders || Object.keys(pureMainnetHolders).length === 0) {
        pureMainnetHolders = await getDxdTokenHoldersWithBalances(
            MAINNET_PROVIDER,
            DXD_MAINNET_ADDRESS,
            BigNumber.from("10012634"), // dxd token deployment block
            DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK
        );
        saveBalanceMapCache(
            pureMainnetHolders,
            MAINNET_PURE_HOLDERS_CACHE_LOCATION
        );
    }

    // merge together data from pure holders, Mesa, Swapr, Loopring, Uniswap v2
    // and Balancer v1 protocols on mainnet to get a better picture
    const allMainnetHolders: { [address: string]: BigNumber } = {};
    mergeBalanceMaps(allMainnetHolders, pureMainnetHolders);
    mergeBalanceMaps(allMainnetHolders, mainnetMesaBalances);
    mergeBalanceMaps(allMainnetHolders, mainnetSwaprBalances);
    mergeBalanceMaps(allMainnetHolders, loopringBalances);
    mergeBalanceMaps(allMainnetHolders, uniswapV2LpBalances);
    mergeBalanceMaps(allMainnetHolders, uniswapV3LpBalances);
    mergeBalanceMaps(allMainnetHolders, balancerLpBalances);

    // get deduplicated addresses that are not on the blacklist
    const notOnBlacklistMainnetAddresses = getDeduplicatedAddresses(
        Object.entries(allMainnetHolders)
            .filter(([address]) => blacklist.indexOf(getAddress(address)) < 0)
            .map(([address]) => getAddress(address))
    );
    // separate eoas from smart contracts for non-blacklisted addresses
    const { smartContracts: rawMainnetSmartContracts, eoas: rawMainnetEoas } =
        await getEoaAddresses(notOnBlacklistMainnetAddresses, MAINNET_PROVIDER);

    // get a cross-chain balances map
    const crossChainBalanceMap = allMainnetHolders;
    mergeBalanceMaps(crossChainBalanceMap, allXDaiHolders);

    // filter out accounts that hold less than the minimum threshold and/or are blacklisted
    const eligibleAddressesMap = Object.entries(crossChainBalanceMap).reduce(
        (accumulator: { [address: string]: BigNumber }, [address, balance]) => {
            if (
                blacklist.indexOf(getAddress(address)) < 0 &&
                balance.gt(MINIMUM_HOLDINGS)
            )
                accumulator[getAddress(address)] = balance;
            return accumulator;
        },
        {}
    );
    const eligibleAddresses = Object.keys(eligibleAddressesMap);

    // cross-reference data from eligible addresses and eoas across chains to
    // determine which eoas are eligible for the airdrop
    eoas = getDeduplicatedAddresses(
        [...rawMainnetEoas, ...rawXDaiEoas].filter(
            (address) => eligibleAddresses.indexOf(getAddress(address)) >= 0
        )
    ).reduce((accumulator: { [address: string]: BigNumber }, address) => {
        const checksummedAddress = getAddress(address);
        accumulator[checksummedAddress] =
            eligibleAddressesMap[checksummedAddress];
        return accumulator;
    }, {});

    // cross-reference data from eligible addresses and mainnet scs to
    // determine which mainnet scs are eligible for the airdrop
    mainnetSmartContracts = getDeduplicatedAddresses(
        rawMainnetSmartContracts.filter(
            (address) => eligibleAddresses.indexOf(getAddress(address)) >= 0
        )
    ).reduce((accumulator: { [address: string]: BigNumber }, address) => {
        const checksummedAddress = getAddress(address);
        accumulator[checksummedAddress] =
            eligibleAddressesMap[checksummedAddress];
        return accumulator;
    }, {});

    // cross-reference data from eligible addresses and xdai scs to
    // determine which xdai scs are eligible for the airdrop
    xDaiSmartContracts = getDeduplicatedAddresses(
        rawXDaiSmartContracts.filter(
            (address) => eligibleAddresses.indexOf(getAddress(address)) >= 0
        )
    ).reduce((accumulator: { [address: string]: BigNumber }, address) => {
        const checksummedAddress = getAddress(address);
        accumulator[checksummedAddress] =
            eligibleAddressesMap[checksummedAddress];
        return accumulator;
    }, {});

    console.log(
        `dxd holders: ${Object.keys(eoas).length} eoas, ${
            Object.keys(mainnetSmartContracts).length
        } mainnet scs, ${Object.keys(xDaiSmartContracts).length} xdai scs`
    );

    saveBalanceMapCache(eoas, EOA_CACHE_LOCATION);
    saveBalanceMapCache(mainnetSmartContracts, MAINNET_SC_CACHE_LOCATION);
    saveBalanceMapCache(xDaiSmartContracts, XDAI_SC_CACHE_LOCATION);

    return { eoas, mainnetSmartContracts, xDaiSmartContracts };
};
