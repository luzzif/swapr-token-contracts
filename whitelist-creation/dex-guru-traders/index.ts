import { DateTime } from "luxon";
import fetch from "node-fetch";
import {
    getEoaAddresses,
    loadCache,
    logInPlace,
    MAINNET_PROVIDER,
    MARKETING_AIRDROP_TIME_LIMIT,
    saveCache,
} from "../commons";

interface Trader {
    address: string;
    stats: { tradeCount: { taker: number } };
}

interface DexGuruApiResponse {
    page: number;
    pageCount: number;
    traders: Trader[];
}

const EOA_CACHE_LOCATION = `${__dirname}/cache/eoas.json`;
const SC_CACHE_LOCATION = `${__dirname}/cache/scs.json`;

export const getWhitelistDexGuruTraders = async (): Promise<{
    eoas: string[];
    smartContracts: string[];
}> => {
    let eoas = loadCache(EOA_CACHE_LOCATION);
    let smartContracts = loadCache(SC_CACHE_LOCATION);
    if (eoas.length > 0 || smartContracts.length > 0) {
        console.log(
            `dex.guru traders from cache: ${eoas.length} eoas, ${smartContracts.length} scs`
        );
        return { eoas, smartContracts };
    }

    const from = "2021/01/01";
    const to = DateTime.fromSeconds(MARKETING_AIRDROP_TIME_LIMIT).toFormat(
        "yyyy-MM-dd"
    );

    let page = 0;
    let pageCount;
    let traders = new Set<string>();
    do {
        page++;
        const response = await fetch(
            `https://api.0xtracker.com/traders?statsPeriodFrom=${from}&statsPeriodTo=${to}&apps=b9701f26-7f5f-481a-8ed7-1621f6b864db&limit=50&page=${page}`
        );
        if (!response.ok)
            throw new Error("could not fetch dex.guru traders data");
        const json = (await response.json()) as DexGuruApiResponse;
        pageCount = json.pageCount;
        logInPlace(`fetched dex.guru traders page ${page}/${pageCount}`);

        json.traders
            .filter((trader) => trader.stats.tradeCount.taker > 2)
            .forEach((trader) => traders.add(trader.address));
    } while (page < pageCount);
    console.log();

    const { eoas: rawEoas, smartContracts: rawSmartContracts } =
        await getEoaAddresses(Array.from(traders), MAINNET_PROVIDER);
    eoas = rawEoas;
    smartContracts = rawSmartContracts;
    console.log(
        `dex.guru traders: ${eoas.length} eoas, ${smartContracts.length} scs`
    );
    console.log();
    saveCache(eoas, EOA_CACHE_LOCATION);
    saveCache(smartContracts, SC_CACHE_LOCATION);
    return { eoas, smartContracts };
};
