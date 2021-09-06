import { deployContract, MockProvider } from "ethereum-waffle";
import { SWPR } from "../../typechain";
import swprJson from "../../artifacts/contracts/swpr/SWPR.sol/SWPR.json";

export const fixture = async (_: any, provider: MockProvider) => {
    const [initialHolderAccount, claimerAccount] = provider.getWallets();

    const swpr = (await deployContract(
        initialHolderAccount,
        swprJson,
        []
    )) as unknown as SWPR;
    await swpr.initialize(
        initialHolderAccount.address,
        initialHolderAccount.address
    );

    return {
        swpr,
        initialHolderAccount,
        claimerAccount,
    };
};

export const fixtureOnlyToken = async (_: any, provider: MockProvider) => {
    const initialHolderAccount = provider.getWallets()[9];

    const swpr = (await deployContract(
        initialHolderAccount,
        swprJson,
        []
    )) as unknown as SWPR;
    await swpr.initialize(
        initialHolderAccount.address,
        initialHolderAccount.address
    );

    return {
        swpr,
        initialHolderAccount,
    };
};
