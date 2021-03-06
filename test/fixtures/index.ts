import { deployContract, MockProvider } from "ethereum-waffle";
import { SWPR } from "../../typechain";
import swprJson from "../../artifacts/contracts/SWPR.sol/SWPR.json";

export const fixture = async (_: any, provider: MockProvider) => {
    const [initialHolderAccount, claimerAccount] = provider.getWallets();

    const swpr = (await deployContract(initialHolderAccount, swprJson, [
        initialHolderAccount.address,
    ])) as unknown as SWPR;

    return {
        swpr,
        initialHolderAccount,
        claimerAccount,
    };
};

export const fixtureOnlyToken = async (_: any, provider: MockProvider) => {
    const initialHolderAccount = provider.getWallets()[9];

    const swpr = (await deployContract(initialHolderAccount, swprJson, [
        initialHolderAccount.address,
    ])) as unknown as SWPR;

    return {
        swpr,
        initialHolderAccount,
    };
};
