import { gql } from "graphql-request";
import {
    loadCache,
    MARKETING_AIRDROP_TIME_LIMIT,
    saveCache,
    SNAPSHOT_CLIENT,
} from "../commons";

const CACHE_LOCATION = `${__dirname}/cache.json`;

const PROPOSALS_QUERY = gql`
    query getProposals($skip: Int!) {
        proposals(
            first: 1000
            skip: $skip
            where: { space: "banklessvault.eth", created_lte: ${MARKETING_AIRDROP_TIME_LIMIT} }
        ) {
            id
        }
    }
`;

interface Proposal {
    id: string;
}

interface ProposalsQueryResult {
    proposals: Proposal[];
}

const VOTES_QUERY = gql`
    query getVotes($skip: Int!, $proposalIds: [String!]!) {
        votes(first: 1000, skip: $skip, where: { proposal_in: $proposalIds }) {
            id
            voter
        }
    }
`;

interface Vote {
    id: string;
    voter: string;
}

interface VotesQueryResult {
    votes: Vote[];
}

const getSubgraphData = async (): Promise<Vote[]> => {
    let allFound = false;
    let skip = 0;
    let proposals: Proposal[] = [];
    while (!allFound) {
        const result = await SNAPSHOT_CLIENT.request<ProposalsQueryResult>(
            PROPOSALS_QUERY,
            { skip }
        );
        skip += 1000;
        proposals.push(...result.proposals);
        if (result.proposals.length < 1000) {
            allFound = true;
        }
    }

    allFound = false;
    skip = 0;
    let votes: Vote[] = [];
    while (!allFound) {
        const result = await SNAPSHOT_CLIENT.request<VotesQueryResult>(
            VOTES_QUERY,
            {
                skip,
                proposalIds: proposals.map((proposal) => proposal.id),
            }
        );
        skip += 1000;
        votes.push(...result.votes);
        if (result.votes.length < 1000) {
            allFound = true;
        }
    }

    return votes;
};

export const getWhitelistMoreThanOneBanklessDaoVote = async () => {
    let eligibleVoters = loadCache(CACHE_LOCATION);
    if (eligibleVoters.length > 0) {
        console.log(
            `number of bankless dao voters from cache that voted more than once: ${eligibleVoters.length}`
        );
        return eligibleVoters;
    }

    console.log("fetching bankless dao votes");
    const votes = await getSubgraphData();
    console.log(`fetched ${votes.length} votes`);

    eligibleVoters = Object.entries(
        votes.reduce((accumulator: { [voter: string]: number }, vote) => {
            const { voter } = vote;
            accumulator[voter] = (accumulator[voter] || 0) + 1;
            return accumulator;
        }, {})
    ).reduce((accumulator: string[], [swapper, numberOfVotes]) => {
        if (numberOfVotes < 2) return accumulator;
        accumulator.push(swapper);
        return accumulator;
    }, []);

    console.log(
        `number of addresses that voted more than once on bankless dao: ${eligibleVoters.length}`
    );
    saveCache(eligibleVoters, CACHE_LOCATION);
    return eligibleVoters;
};
