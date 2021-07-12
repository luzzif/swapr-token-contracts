import mooniswapFactoryAbi from "./mooniswap-factory-abi.json";
import { Contract, BigNumber, providers, constants } from "ethers";
import {
    getEoaAddresses,
    loadCache,
    logInPlace,
    MAINNET_PROVIDER,
    MAINNET_PROVIDER_URL,
    MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    MOONISWAP_FACTORY_MAINNET_ADDRESS,
    saveCache,
} from "../commons";

const CACHE_LOCATION = `${__dirname}/cache.json`;

export const getWhitelist1InchVoters = async (): Promise<string[]> => {
    let eoaVoters = await loadCache(CACHE_LOCATION);
    if (eoaVoters.length > 0) {
        console.log(`number of 1inch voters from cache: ${eoaVoters.length}`);
        return eoaVoters;
    }

    const uniqueVoters = new Set<string>();
    const mooniswapFactoryContract = new Contract(
        MOONISWAP_FACTORY_MAINNET_ADDRESS,
        mooniswapFactoryAbi,
        MAINNET_PROVIDER
    );

    const startingBlock = BigNumber.from("11607841"); // mooniswap factory deployment block

    let lastAnalyzedBlock = startingBlock;
    while (lastAnalyzedBlock.lt(MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK)) {
        const toBlock = lastAnalyzedBlock.add(10000);
        logInPlace(
            `fetching 1inch governance voters: ${(
                ((lastAnalyzedBlock.toNumber() - startingBlock.toNumber()) /
                    (MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK -
                        startingBlock.toNumber())) *
                100
            ).toFixed(2)}%`
        );
        const events1 = await mooniswapFactoryContract.queryFilter(
            mooniswapFactoryContract.filters.DefaultFeeVoteUpdate(),
            lastAnalyzedBlock.toHexString(),
            toBlock.toHexString()
        );
        const events2 = await mooniswapFactoryContract.queryFilter(
            mooniswapFactoryContract.filters.DefaultSlippageFeeVoteUpdate(),
            lastAnalyzedBlock.toHexString(),
            toBlock.toHexString()
        );
        const events3 = await mooniswapFactoryContract.queryFilter(
            mooniswapFactoryContract.filters.DefaultDecayPeriodVoteUpdate(),
            lastAnalyzedBlock.toHexString(),
            toBlock.toHexString()
        );
        const events4 = await mooniswapFactoryContract.queryFilter(
            mooniswapFactoryContract.filters.ReferralShareVoteUpdate(),
            lastAnalyzedBlock.toHexString(),
            toBlock.toHexString()
        );
        const events5 = await mooniswapFactoryContract.queryFilter(
            mooniswapFactoryContract.filters.GovernanceShareVoteUpdate(),
            lastAnalyzedBlock.toHexString(),
            toBlock.toHexString()
        );

        const events = [
            ...events1,
            ...events2,
            ...events3,
            ...events4,
            ...events5,
        ];

        events.forEach((event) => {
            const [from] = event.args!;
            uniqueVoters.add(from);
        });

        lastAnalyzedBlock = toBlock;
    }
    logInPlace("reconstructing balance map: 100%");
    console.log();

    const voters = Array.from(uniqueVoters);
    eoaVoters = await getEoaAddresses(voters, MAINNET_PROVIDER);
    console.log(
        `number of 1inch voters: ${voters.length} (${
            voters.length - eoaVoters.length
        } sc voters removed)`
    );
    saveCache(eoaVoters, CACHE_LOCATION);

    return eoaVoters;
};
