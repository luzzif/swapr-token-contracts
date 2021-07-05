import fs from "fs";

// uses the report downloaded from https://snapshot.org/#/uniswap/proposal/Qmehop1NNWP9VEf7tGLEAYRphVsXtdxkL7oKEhaXL2Xao6
export const getWhitelistUniswapOnArbitrumYes = async () => {
    const voters = new Set<string>();

    const allVotersRaw = (
        await fs.readFileSync(
            `${__dirname}/snapshot-report-uniswap-on-arbitrum.csv`
        )
    )
        .toString()
        .split("\n");

    allVotersRaw.shift(); // remove header line

    allVotersRaw
        .map((row) => {
            const [voter, choice] = row.split(",");
            return { voter, votedInFavor: choice === "1" };
        })
        .filter((wrappedVoter) => wrappedVoter.votedInFavor)
        .forEach((wrappedVoter) => {
            voters.add(wrappedVoter.voter); // removes any eventual duplicate
        });

    return Array.from(voters);
};
