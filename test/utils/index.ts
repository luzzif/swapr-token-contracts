import { waffle } from "hardhat";

export const getEvmTimestamp = async (): Promise<number> => {
    const { timestamp } = await waffle.provider.getBlock("latest");
    return timestamp;
};

export const fastForwardTo = async (timestamp: number) => {
    await waffle.provider.send("evm_mine", [timestamp]);
};

export const fastForward = async (seconds: number) => {
    const { timestamp: evmTimestamp } = await waffle.provider.getBlock(
        "latest"
    );
    await waffle.provider.send("evm_mine", [evmTimestamp + seconds]);
};
