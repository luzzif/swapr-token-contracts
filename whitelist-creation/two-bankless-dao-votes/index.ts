import { gql } from "graphql-request";
import {
    getDeduplicatedAddresses,
    getEoaAddresses,
    loadCache,
    MAINNET_PROVIDER,
    MARKETING_AIRDROP_TIME_LIMIT,
    saveCache,
    SNAPSHOT_CLIENT,
} from "../commons";

const EOA_CACHE_LOCATION = `${__dirname}/cache/eoas.json`;
const SC_CACHE_LOCATION = `${__dirname}/cache/scs.json`;

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

export const getWhitelistMoreThanOneBanklessDaoVote = async (): Promise<{
    eoas: string[];
    smartContracts: string[];
}> => {
    let eoas = loadCache(EOA_CACHE_LOCATION);
    let smartContracts = loadCache(SC_CACHE_LOCATION);
    if (eoas.length > 0 || smartContracts.length > 0) {
        console.log(
            `bankless dao voters: ${eoas.length} eoas, ${smartContracts.length} scs`
        );
        return { eoas, smartContracts };
    }
    const votes = await getSubgraphData();
    const rawVoters = getDeduplicatedAddresses(
        Object.entries(
            votes.reduce((accumulator: { [voter: string]: number }, vote) => {
                const { voter } = vote;
                accumulator[voter] = (accumulator[voter] || 0) + 1;
                return accumulator;
            }, {})
        ).reduce((accumulator: string[], [swapper, numberOfVotes]) => {
            if (numberOfVotes < 2) return accumulator;
            accumulator.push(swapper);
            return accumulator;
        }, [])
    );

    const { smartContracts: rawSmartContracts, eoas: rawEoas } =
        await getEoaAddresses(rawVoters, MAINNET_PROVIDER);
    eoas = rawEoas;
    smartContracts = rawSmartContracts;

    console.log(
        `bankless dao voters: ${eoas.length} eoas, ${smartContracts.length} scs`
    );
    saveCache(rawEoas, EOA_CACHE_LOCATION);
    saveCache(rawSmartContracts, SC_CACHE_LOCATION);
    return { eoas, smartContracts };
};
