import { deployContract, MockProvider } from "ethereum-waffle";
import { SWPR } from "../../typechain";
import swprJson from "../../artifacts/contracts/SWPR.sol/SWPR.json";

export const fixture = async (_: any, provider: MockProvider) => {
    const [initialHolderAccount, claimerAccount] = provider.getWallets();

    const swpr = (await deployContract(initialHolderAccount, swprJson, [
        initialHolderAccount.address,
    ])) as SWPR;

    return {
        swpr,
        initialHolderAccount,
        claimerAccount,
    };
};
