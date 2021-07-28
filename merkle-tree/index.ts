import { solidityKeccak256, solidityPack } from "ethers/lib/utils";
import { MerkleTree as MerkleTreeJS } from "merkletreejs";

const hashLeaf = (leaf: Leaf) => {
    return solidityKeccak256(
        ["bytes"],
        [solidityPack(["address", "uint256"], [leaf.account, leaf.amount])]
    );
};

export interface Leaf {
    account: string;
    amount: string;
}

export class MerkleTree {
    private tree: MerkleTreeJS;

    constructor(leaves: Leaf[]) {
        this.tree = new MerkleTreeJS(
            leaves.map((leaf) => {
                // preparing the leaves
                return hashLeaf(leaf).replace("0x", "");
            }),
            (data: Buffer) =>
                // leaves hashing
                solidityKeccak256(
                    ["bytes"],
                    [`0x${data.toString("hex")}`]
                ).replace("0x", ""),
            { sortPairs: true }
        );
    }

    get root(): string {
        return this.tree.getHexRoot();
    }

    getProof(leaf: Leaf): string[] {
        return this.tree.getHexProof(hashLeaf(leaf));
    }
}
