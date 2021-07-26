import erc20Abi from "./erc20-abi.json";
import { Contract, BigNumber, providers, constants } from "ethers";
import { getEoaAddresses, logInPlace } from "../commons";
import { parseEther } from "ethers/lib/utils";

export const getErc20Holders = async (
    erc20TokenAddress: string,
    startingBlock: BigNumber,
    endingBlock: BigNumber,
    provider: providers.JsonRpcProvider,
    tokenSymbol: string,
    minimumBalance: number
): Promise<{ eoas: string[]; smartContracts: string[] }> => {
    const holdersMap: {
        [address: string]: BigNumber;
    } = {};
    const erc20Contract = new Contract(erc20TokenAddress, erc20Abi, provider);

    let lastAnalyzedBlock = startingBlock;
    while (lastAnalyzedBlock.lt(endingBlock)) {
        const toBlock = lastAnalyzedBlock.add(10000);
        logInPlace(
            `reconstructing balance map: ${(
                ((lastAnalyzedBlock.toNumber() - startingBlock.toNumber()) /
                    (endingBlock.toNumber() - startingBlock.toNumber())) *
                100
            ).toFixed(2)}%`
        );
        const events = await erc20Contract.queryFilter(
            erc20Contract.filters.Transfer(),
            lastAnalyzedBlock.toHexString(),
            toBlock.toHexString()
        );

        events.forEach((event) => {
            const [from, to, value] = event.args!;
            if ((value as BigNumber).isZero()) {
                return;
            }
            if (from === constants.AddressZero) {
                // tokens were minted
                holdersMap[to] = (holdersMap[to] || BigNumber.from(0)).add(
                    value
                );
            } else if (to === constants.AddressZero) {
                // tokens were burned
                holdersMap[from] = holdersMap[from].sub(value);
            } else {
                holdersMap[from] = holdersMap[from].sub(value);
                holdersMap[to] = (holdersMap[to] || BigNumber.from(0)).add(
                    value
                );
            }
        });

        lastAnalyzedBlock = toBlock;
    }
    logInPlace("reconstructing balance map: 100%");
    console.log();

    const parsedMinimumAmount = parseEther(minimumBalance.toString());
    const nonZeroHolders = Array.from(
        Object.entries(holdersMap).reduce(
            (accumulator: Set<string>, [holder, amount]) => {
                if (amount.gte(parsedMinimumAmount)) accumulator.add(holder);
                return accumulator;
            },
            new Set<string>()
        )
    );
    const { eoas: eoaNonZeroHolders, smartContracts } = await getEoaAddresses(
        nonZeroHolders,
        provider
    );
    console.log(
        `fetched ${eoaNonZeroHolders.length} ${tokenSymbol} holders (${
            nonZeroHolders.length - eoaNonZeroHolders.length
        } SCs removed)`
    );

    return { eoas: eoaNonZeroHolders, smartContracts };
};
