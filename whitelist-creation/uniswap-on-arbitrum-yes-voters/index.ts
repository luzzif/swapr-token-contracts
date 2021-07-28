import { gql } from "graphql-request";
import {
    getDeduplicatedAddresses,
    getEoaAddresses,
    loadCache,
    MAINNET_PROVIDER,
    saveCache,
    SNAPSHOT_CLIENT,
} from "../commons";

const EOA_CACHE_LOCATION = `${__dirname}/cache/eoas.json`;
const SC_CACHE_LOCATION = `${__dirname}/cache/scs.json`;

const VOTES_QUERY = gql`
    query getVotes($skip: Int!) {
        votes(
            first: 1000
            skip: $skip
            where: {
                proposal: "Qmehop1NNWP9VEf7tGLEAYRphVsXtdxkL7oKEhaXL2Xao6"
            }
        ) {
            choice
            voter
        }
    }
`;

interface Vote {
    choice: number;
    voter: string;
}

interface VotesQueryResult {
    votes: Vote[];
}

const getSubgraphData = async (): Promise<Vote[]> => {
    let allFound = false;
    let skip = 0;
    let votes: Vote[] = [];
    while (!allFound) {
        const result = await SNAPSHOT_CLIENT.request<VotesQueryResult>(
            VOTES_QUERY,
            { skip }
        );
        skip += 1000;
        votes.push(...result.votes);
        if (result.votes.length < 1000) {
            allFound = true;
        }
    }
    return votes;
};

export const getWhitelistUniswapOnArbitrumYes = async (): Promise<{
    eoas: string[];
    smartContracts: string[];
}> => {
    let eoas = loadCache(EOA_CACHE_LOCATION);
    let smartContracts = loadCache(SC_CACHE_LOCATION);
    if (eoas.length > 0 || smartContracts.length > 0) {
        console.log(
            `uniswap on arbitrum voters: ${eoas.length} eoas, ${smartContracts.length} scs`
        );
        return { eoas, smartContracts };
    }
    const votes = await getSubgraphData();
    const yesVoters = getDeduplicatedAddresses(
        votes
            .filter((vote) => vote.choice === 1) // first choice was yes
            .map((vote) => vote.voter)
    );

    const { smartContracts: rawSmartContracts, eoas: rawEoas } =
        await getEoaAddresses(yesVoters, MAINNET_PROVIDER);
    eoas = rawEoas;
    smartContracts = rawSmartContracts;

    console.log(
        `uniswap on arbitrum yes voters: ${eoas.length} eoas, ${smartContracts.length} scs`
    );
    saveCache(eoas, EOA_CACHE_LOCATION);
    saveCache(smartContracts, SC_CACHE_LOCATION);
    return { eoas, smartContracts };
};
