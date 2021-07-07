import { DateTime } from "luxon";
import fetch from "node-fetch";
import { DATA_TIME_LIMIT } from "../commons";

interface Trader {
    address: string;
    stats: { tradeCount: { taker: number } };
}

interface DexGuruApiResponse {
    page: number;
    pageCount: number;
    traders: Trader[];
}

export const getWhitelistDexGuruTraders = async () => {
    const from = DateTime.now()
        .startOf("year")
        .startOf("day")
        .toFormat("yyyy-MM-dd");
    const to = DateTime.fromSeconds(DATA_TIME_LIMIT).toFormat("yyyy-MM-dd");

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
        console.log(`fetched page ${page}/${pageCount} of dex.guru traders`);

        json.traders
            .filter((trader) => trader.stats.tradeCount.taker > 2)
            .forEach((trader) => traders.add(trader.address));
    } while (page < pageCount);

    return Array.from(traders);
};
