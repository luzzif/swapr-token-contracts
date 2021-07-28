import mooniswapFactoryAbi from "./mooniswap-factory-abi.json";
import { Contract, BigNumber } from "ethers";
import {
    getEoaAddresses,
    loadCache,
    logInPlace,
    MAINNET_PROVIDER,
    MARKETING_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
    MOONISWAP_FACTORY_MAINNET_ADDRESS,
    saveCache,
} from "../commons";

const EOA_CACHE_LOCATION = `${__dirname}/cache/eoas.json`;
const SC_CACHE_LOCATION = `${__dirname}/cache/scs.json`;

const STATIC_AIRDROP_RECIPIENT_BLACKLIST = [
    "0x133745D183212aaf1Ed6Bc745230BB6ECf466bE5", // Old, unused Yearn strategy
    "0xB12F6A5776EDd2e923fD1Ce93041B2000A22dDc7", // Old, unused Yearn strategy
    "0xae49cEd7165ECee62AFc684aE145aAAd77E85a6F", // Old, unused Yearn strategy
    "0x8F6A193C8B3c949E1046f1547C3A3f0836944E4b", // xINCHs token contract
    "0x6B33f15360cedBFB8F60539ec828ef52910acA9b", // xINCHb token contract
].map((address) => address.toLowerCase());

export const getWhitelist1InchVoters = async (): Promise<{
    eoas: string[];
    smartContracts: string[];
}> => {
    let eoas = await loadCache(EOA_CACHE_LOCATION);
    let smartContracts = await loadCache(SC_CACHE_LOCATION);
    if (eoas.length > 0 || smartContracts.length > 0) {
        console.log(
            `1inch voters: ${eoas.length} eoas, ${smartContracts.length} scs`
        );
        return { eoas, smartContracts };
    }

    const voteCounter: { [voter: string]: Set<string> } = {};
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
            voteCounter[from] = (voteCounter[from] || new Set<string>()).add(
                event.transactionHash
            );
        });

        lastAnalyzedBlock = toBlock;
    }
    logInPlace("fetching 1inch governance voters: 100%");
    console.log();

    const voters = Object.entries(voteCounter)
        .filter(
            ([address, transactionHashes]) =>
                STATIC_AIRDROP_RECIPIENT_BLACKLIST.indexOf(
                    address.toLowerCase()
                ) <= 0 && transactionHashes.size > 2
        )
        .map(([voter]) => voter);
    const { eoas: rawEoas, smartContracts: rawSmartContracts } =
        await getEoaAddresses(voters, MAINNET_PROVIDER);
    eoas = rawEoas;
    smartContracts = rawSmartContracts;
    console.log(
        `1inch voters: ${eoas.length} eoas, ${smartContracts.length} scs`
    );
    saveCache(eoas, EOA_CACHE_LOCATION);
    saveCache(smartContracts, SC_CACHE_LOCATION);

    return { eoas, smartContracts };
};
