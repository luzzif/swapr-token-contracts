import { task } from "hardhat/config";
import { MerkleTree } from "../merkle-tree";
import airdropData from "../airdrop-data.json";

interface TaskArguments {
    account: string;
    amount: string;
}

task(
    "get-proof",
    "Get a test data Merkle proof for the leaf constructed with the given parameters."
)
    .addParam("account", "The account for which to get the Merkle proof")
    .addParam("amount", "The amount for which to get the Merkle proof")
    .setAction(async (taskArguments: TaskArguments) => {
        const { account, amount } = taskArguments;
        const merkleTree = new MerkleTree(airdropData);
        console.log(`proof: ${merkleTree.getProof({ account, amount })}`);
    });
