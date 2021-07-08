import { gql } from "graphql-request";
import { loadCache, saveCache, SNAPSHOT_CLIENT } from "../commons";

const CACHE_LOCATION = `${__dirname}/cache.json`;

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

export const getWhitelistUniswapOnArbitrumYes = async () => {
    let yesVoters = loadCache(CACHE_LOCATION);
    if (yesVoters.length > 0) {
        console.log(
            `number of addresses from cache that voted yes to uniswap on arbitrum: ${yesVoters.length}`
        );
        return yesVoters;
    }

    console.log("fetching uniswap on arbitrum votes");
    const votes = await getSubgraphData();
    console.log(`fetched ${votes.length} votes`);

    yesVoters = Array.from(
        new Set<string>(
            votes
                .filter((vote) => vote.choice === 1) // first choice was yes
                .map((vote) => vote.voter)
        )
    );

    console.log(
        `number of addresses that voted yes to uniswap on arbitrum: ${yesVoters.length}`
    );
    saveCache(yesVoters, CACHE_LOCATION);
    return yesVoters;
};
