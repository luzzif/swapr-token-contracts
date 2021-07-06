import { gql } from "graphql-request";
import { SNAPSHOT_CLIENT } from "../commons";

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

// gets accounts who made 2 or more swapr trade until June 1st (valid for both xDai and mainnet)
export const getWhitelistUniswapOnArbitrumYes = async () => {
    console.log("fetching uniswap on arbitrum votes");
    const votes = await getSubgraphData();
    console.log(`fetched ${votes.length} votes`);

    const yesVotes = votes.filter((vote) => vote.choice === 1); // first choice was yes
    console.log(`filtered out ${votes.length - yesVotes.length} no votes`);

    return yesVotes;
};
