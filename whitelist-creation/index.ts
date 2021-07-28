import { getWhitelistMoreThanOneSwaprTrade } from "./two-swapr-trades";
import { getWhitelistLiquidityProviders } from "./liquidity-providers";
import { getWhitelistUniswapOnArbitrumYes } from "./uniswap-on-arbitrum-yes-voters";
import { getWhitelistMoreThanOneBanklessDaoVote } from "./two-bankless-dao-votes";
import { getWhitelistOmenUsers } from "./omen-users";
import { getWhitelistDexGuruTraders } from "./dex-guru-traders";
import { getWhitelistDxdHolders } from "./dxd-holders";
import { getWhitelistPoapHolders } from "./poap-holders";
import { getWhitelistXSdtHolders } from "./xsdt-holders";
import { getWhitelist1InchVoters } from "./1inch-governance-voters";
import { BigNumber } from "ethers";
import { Leaf, MerkleTree } from "../merkle-tree";
import { getAddress, parseEther } from "ethers/lib/utils";
import { outputJSONSync } from "fs-extra";

const MARKETING_AIRDROP_EOA_JSON_LOCATION = `${__dirname}/cache/marketing-airdrop-eoa-leaves.json`;
const MARKETING_AIRDROP_SC_JSON_LOCATION = `${__dirname}/cache/marketing-airdrop-sc-leaves.json`;
const DXD_AIRDROP_EOA_JSON_LOCATION = `${__dirname}/cache/dxd-airdrop-eoa-leaves.json`;
const DXD_AIRDROP_SC_JSON_LOCATION = `${__dirname}/cache/dxd-airdrop-sc-leaves.json`;

export const exportJsonLeaves = (leaves: Leaf[], location: string) => {
    outputJSONSync(location, leaves, { spaces: 4 });
};

const getMerkleTreeLeaves = async (
    overallAmount: BigNumber,
    eoas: string[],
    smartContracts: string[]
): Promise<{ eoaLeaves: Leaf[]; smartContractLeaves: Leaf[] }> => {
    const amountPerUser = overallAmount.div(
        eoas.length + smartContracts.length
    );
    return {
        eoaLeaves: eoas.map((account) => ({
            account: getAddress(account),
            amount: amountPerUser.toString(),
        })),
        smartContractLeaves: smartContracts.map((account) => ({
            account: getAddress(account),
            amount: amountPerUser.toString(),
        })),
    };
};

const createWhitelist = async () => {
    // Accounts that voted more than a certain amount on 1Inch governance
    const { eoas: oneInchEoas, smartContracts: oneInchSmartContracts } =
        await getWhitelist1InchVoters();
    const {
        eoaLeaves: oneInchEoaLeaves,
        smartContractLeaves: oneInchSmartContractLeaves,
    } = await getMerkleTreeLeaves(
        parseEther("873000"),
        oneInchEoas,
        oneInchSmartContracts
    );

    // Accounts that hold more than a certain amount of xSDT
    const { eoas: xSdtEoas, smartContracts: xSdtSmartContracts } =
        await getWhitelistXSdtHolders();
    const {
        eoaLeaves: xSdtEoaLeaves,
        smartContractLeaves: xSdtSmartContractLeaves,
    } = await getMerkleTreeLeaves(
        parseEther("214000"),
        xSdtEoas,
        xSdtSmartContracts
    );

    // Accounts that hold DXdao-issued POAPs
    const {
        eoas: poapEoas,
        mainnetSmartContracts: poapMainnetSmartContracts,
        xDaiSmartContracts: poapXDaiSmartContracts,
    } = await getWhitelistPoapHolders();
    if (poapXDaiSmartContracts.length > 0)
        throw new Error("xdai smart contracts detected");
    const {
        eoaLeaves: poapEoaLeaves,
        smartContractLeaves: poapSmartContractLeaves,
    } = await getMerkleTreeLeaves(
        parseEther("74000"),
        poapEoas,
        poapMainnetSmartContracts
    );

    // Accounts that traded more than a certain amount on dex.guru
    const { eoas: dexGuruEoas, smartContracts: dexGuruSmartContracts } =
        await getWhitelistDexGuruTraders();
    const {
        eoaLeaves: dexGuruEoaLeaves,
        smartContractLeaves: dexGuruSmartContractLeaves,
    } = await getMerkleTreeLeaves(
        parseEther("121900"),
        dexGuruEoas,
        dexGuruSmartContracts
    );

    // Accounts that traded more than a certain amount on dex.guru
    const {
        eoas: omenEoas,
        xDaiSmartContracts: omenXDaiSmartContracts,
        mainnetSmartContracts: omenMainnetSmartContracts,
    } = await getWhitelistOmenUsers();
    if (omenXDaiSmartContracts.length > 0)
        throw new Error("xdai smart contracts detected");
    const {
        eoaLeaves: omenEoaLeaves,
        smartContractLeaves: omenSmartContractLeaves,
    } = await getMerkleTreeLeaves(
        parseEther("515600"),
        omenEoas,
        omenMainnetSmartContracts
    );

    // Accounts that voted yes to Uniswap on Arbitrum
    const {
        eoas: uniswapOnArbitrumEoas,
        smartContracts: uniswapOnArbitrumSmartContracts,
    } = await getWhitelistUniswapOnArbitrumYes();
    const {
        eoaLeaves: uniswapOnArbitrumEoaLeaves,
        smartContractLeaves: uniswapOnArbitrumSmartContractLeaves,
    } = await getMerkleTreeLeaves(
        parseEther("359500"),
        uniswapOnArbitrumEoas,
        uniswapOnArbitrumSmartContracts
    );

    // Accounts that voted on Bankless DAO proposals
    const {
        eoas: banklessVoterEoas,
        smartContracts: banklessVoterSmartContracts,
    } = await getWhitelistMoreThanOneBanklessDaoVote();
    const {
        eoaLeaves: banklessVoterEoaLeaves,
        smartContractLeaves: banklessVoterSmartContractLeaves,
    } = await getMerkleTreeLeaves(
        parseEther("376000"),
        banklessVoterEoas,
        banklessVoterSmartContracts
    );

    // Accounts that swapped on Swapr more than a certain amount
    const {
        eoas: swaprSwapperEoas,
        mainnetSmartContracts: swaprSwapperMainnetSmartContracts,
        xDaiSmartContracts: swaprSwapperXDaiSmartContracts,
    } = await getWhitelistMoreThanOneSwaprTrade();
    if (swaprSwapperXDaiSmartContracts.length > 0)
        throw new Error("xdai smart contracts detected");
    const {
        eoaLeaves: swaprSwapperEoaLeaves,
        smartContractLeaves: swaprSwapperSmartContractLeaves,
    } = await getMerkleTreeLeaves(
        parseEther("376000"),
        swaprSwapperEoas,
        swaprSwapperMainnetSmartContracts
    );

    // Accounts that provided liquidity on Swapr
    const {
        eoas: swaprLpEoas,
        mainnetSmartContracts: swaprLpMainnetSmartContracts,
        xDaiSmartContracts: swaprLpXDaiSmartContracts,
    } = await getWhitelistLiquidityProviders();
    if (swaprLpXDaiSmartContracts.length > 0)
        throw new Error("xdai smart contracts detected");
    const {
        eoaLeaves: swaprLpEoaLeaves,
        smartContractLeaves: swaprLpSmartContractLeaves,
    } = await getMerkleTreeLeaves(
        parseEther("90000"),
        swaprLpEoas,
        swaprLpMainnetSmartContracts
    );

    const marketingAirdropEoaLeaves = [
        ...oneInchEoaLeaves,
        ...xSdtEoaLeaves,
        ...poapEoaLeaves,
        ...dexGuruEoaLeaves,
        ...omenEoaLeaves,
        ...uniswapOnArbitrumEoaLeaves,
        ...banklessVoterEoaLeaves,
        ...swaprSwapperEoaLeaves,
        ...swaprLpEoaLeaves,
    ];
    exportJsonLeaves(
        marketingAirdropEoaLeaves,
        MARKETING_AIRDROP_EOA_JSON_LOCATION
    );
    const marketingAirdropEoaTree = new MerkleTree(marketingAirdropEoaLeaves);
    console.log("marketing airdrop eoa root", marketingAirdropEoaTree.root);

    const marketingAirdropSmartContractLeaves = [
        ...oneInchSmartContractLeaves,
        ...xSdtSmartContractLeaves,
        ...poapSmartContractLeaves,
        ...dexGuruSmartContractLeaves,
        ...omenSmartContractLeaves,
        ...uniswapOnArbitrumSmartContractLeaves,
        ...banklessVoterSmartContractLeaves,
        ...swaprSwapperSmartContractLeaves,
        ...swaprLpSmartContractLeaves,
    ];
    exportJsonLeaves(
        marketingAirdropSmartContractLeaves,
        MARKETING_AIRDROP_SC_JSON_LOCATION
    );
    const marketingAirdropSmartContractTree = new MerkleTree(
        marketingAirdropSmartContractLeaves
    );
    console.log(
        "marketing airdrop sc root",
        marketingAirdropSmartContractTree.root
    );

    const {
        eoas: dxdEoas,
        mainnetSmartContracts: dxdMainnetSmartContracts,
        xDaiSmartContracts: dxdXDaiSmartContracts,
    } = await getWhitelistDxdHolders();
    if (dxdXDaiSmartContracts.length > 0)
        throw new Error("xdai smart contracts detected");
    const {
        eoaLeaves: dxdEoaLeaves,
        smartContractLeaves: dxdSmartContractLeaves,
    } = await getMerkleTreeLeaves(
        parseEther("8000000"),
        dxdEoas,
        dxdMainnetSmartContracts
    );
    exportJsonLeaves(dxdEoaLeaves, DXD_AIRDROP_EOA_JSON_LOCATION);
    exportJsonLeaves(dxdSmartContractLeaves, DXD_AIRDROP_SC_JSON_LOCATION);
    const dxdAirdropEoaTree = new MerkleTree(dxdEoaLeaves);
    console.log("dxd airdrop eoa root", dxdAirdropEoaTree.root);
    const dxdAirdropSmartContractTree = new MerkleTree(dxdSmartContractLeaves);
    console.log("dxd airdrop sc root", dxdAirdropSmartContractTree.root);
};

createWhitelist().catch((error) => {
    console.error("could not create whitelist", error);
});
