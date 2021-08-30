import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { gql } from "graphql-request";
import {
    LOOPRING_EXCHANGE_V2_SUBGRAPH_CLIENT,
    DXD_LOOPRING_TOKEN_ID,
    getAllDataFromSubgraph,
    DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK,
} from "../commons";

const HOLDERS_QUERY = gql`
    query getHolders($block: Int!, $lastId: String) {
        data: accounts(
            where: { id_gt: $lastId }
        ) {
            id
            address
            balances(block: { number: $block }, where: { token: "${DXD_LOOPRING_TOKEN_ID}", balance_gt: 0 }) {
                balance
            }
        }
    }
`;

interface Holder {
    id: string;
    address: string;
    balances: { balance: string }[];
}

const getSubgraphData = async (): Promise<Holder[]> => {
    const mixedHolders = await getAllDataFromSubgraph<Holder>(
        LOOPRING_EXCHANGE_V2_SUBGRAPH_CLIENT,
        HOLDERS_QUERY,
        { block: DXD_AIRDROP_MAINNET_SNAPSHOT_BLOCK.toNumber() }
    );
    return mixedHolders.filter((holder) => holder.balances.length === 1);
};

export const getLoopringDxdHolders = async () => {
    const balanceMap: { [address: string]: BigNumber } = {};

    const holders = await getSubgraphData();
    holders.forEach((holder) => {
        balanceMap[getAddress(holder.address)] = BigNumber.from(
            holder.balances[0].balance
        ); // balance is in wei, no need to parse
    });

    return balanceMap;
};
