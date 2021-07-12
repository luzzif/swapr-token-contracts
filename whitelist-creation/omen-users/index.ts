// taken from https://github.com/hexyls/omen-airdrop/blob/master/index.js

import {
    getEoaAddresses,
    loadCache,
    MAINNET_PROVIDER,
    MARKETING_AIRDROP_TIME_LIMIT,
    saveCache,
    XDAI_PROVIDER,
} from "../commons";
import { request, gql } from "graphql-request";
import { ethers, utils } from "ethers";

const CACHE_LOCATION = `${__dirname}/cache.json`;

const GRAPH_MAINNET_HTTP =
    "https://api.thegraph.com/subgraphs/name/protofire/omen";
const GRAPH_XDAI_HTTP =
    "https://api.thegraph.com/subgraphs/name/protofire/omen-xdai";

// queries
const userQuery = gql`
  query Trades($first: Int, $skip: Int) {
    fpmmTrades(first: $first, skip: $skip, where: { type: "Buy", creationTimestamp_lte: ${MARKETING_AIRDROP_TIME_LIMIT} }) {
      creator {
        id
      }
      collateralAmountUSD
      transactionHash
    }
  }`;

const lpQuery = gql`
  query Lps($first: Int, $skip: Int) {
    fpmmLiquidities(first: $first, skip: $skip, where: { creationTimestamp_lte: ${MARKETING_AIRDROP_TIME_LIMIT} }) {
      funder {
        id
      }
      transactionHash
    }
  }`;

// utils
const wait = () => new Promise((resolve) => setTimeout(resolve, 500));
const mainnetProvider = new ethers.providers.JsonRpcBatchProvider(
    "https://mainnet.infura.io/v3/9c6788bb15234036991db4637638429f"
);
const xdaiProvider = new ethers.providers.JsonRpcBatchProvider(
    "https://rpc.xdaichain.com/"
);
// FPMMDeterministicFactory addresses
const blacklist: { [address: string]: boolean } = {
    "0x89023DEb1d9a9a62fF3A5ca8F23Be8d87A576220": true,
    "0x9083A2B699c0a4AD06F63580BDE2635d26a3eeF0": true,
};

// paginate through a graphql query
const paginate = async (url: any, query: any, fn: any) => {
    const first = 100;
    let skip = 0;
    let processing = true;
    while (processing) {
        const data = await request(url, query, { first, skip });
        const key = Object.keys(data)[0];
        await fn(data[key]);
        if (data[key].length < first) {
            processing = false;
        }
        skip += first;
        await wait();
    }
};

const processUsers = async (url: any) => {
    // users on Omen before May 1st, 2021 as long as that user’s predictions have totalled at least $25.
    let accounts: { [account: string]: number } = {};

    await paginate(url, userQuery, async (data: any) => {
        // tally user spend across all trades
        accounts = data.reduce(
            (
                prev: any,
                {
                    creator,
                    collateralAmountUSD,
                }: { creator: any; collateralAmountUSD: string }
            ) => {
                const address = utils.getAddress(creator.id);
                const currentAmountUSD = prev[address];
                const tradeAmountUSD = Number(collateralAmountUSD);
                if (currentAmountUSD) {
                    return {
                        ...prev,
                        [address]: currentAmountUSD + tradeAmountUSD,
                    };
                }
                return { ...prev, [address]: tradeAmountUSD };
            },
            accounts
        );
    });

    // filter out addresses that spent less than the minimum
    const minSpend = 25;
    const eligibleAddresses = Object.keys(accounts).filter(
        (account: string) =>
            accounts[account] >= minSpend && !blacklist[account]
    );

    return eligibleAddresses;
};

const realitioAbi = [
    "event LogNewQuestion(bytes32 indexed question_id, address indexed user, uint256 template_id, string question, bytes32 indexed content_hash, address arbitrator, uint32 timeout, uint32 opening_ts, uint256 nonce, uint256 created)",
];

const processLps = async (url: any, provider: any) => {
    // market creators / liquidity providers on Omen before May 1st, 2021
    let accounts = new Set();

    await paginate(url, lpQuery, async (data: any) => {
        await Promise.all(
            data.map(async (item: any) => {
                const address: string = utils.getAddress(item.funder.id);
                if (blacklist[address]) {
                    // if the address is FPMMDeterministicFactory, check the tx for the proxy address
                    let receipt;
                    while (!receipt) {
                        try {
                            receipt = await provider.getTransactionReceipt(
                                item.transactionHash
                            );
                        } catch (e) {}
                        await wait();
                    }
                    const iface = new utils.Interface(realitioAbi);
                    const event = receipt.logs
                        .map((log: any) => {
                            try {
                                return iface.parseLog(log);
                            } catch (e) {}
                        })
                        .find((log: any) => log);
                    if (event) {
                        const safeAddress = event.args.user;
                        accounts.add(safeAddress);
                    }
                } else {
                    accounts.add(address);
                }
            })
        );
    });

    return Array.from(accounts);
};

const getAddresses = async (url: any, provider: any) => {
    const users = await processUsers(url);
    const lps = await processLps(url, provider);
    return { users, lps };
};

const getProxyOwner = async (proxyAddress: any) => {
    const proxyAbi = [
        "function getOwners() public view returns (address[] memory)",
    ];
    let owners;
    try {
        const proxy = new ethers.Contract(
            proxyAddress,
            proxyAbi,
            mainnetProvider
        );
        owners = await proxy.getOwners();
    } catch (e) {}

    if (!owners) {
        try {
            const proxy = new ethers.Contract(
                proxyAddress,
                proxyAbi,
                xdaiProvider
            );
            owners = await proxy.getOwners();
        } catch (e) {}
    }
    return owners && owners[0];
};

const getOwner = async (proxyAddress: any) => {
    // get the owner of a proxy
    const owner = await getProxyOwner(proxyAddress);

    if (!owner) {
        // user has no proxy, likely interacted directly with a market
        return proxyAddress;
    }

    // we must handle proxies that are also owned by proxies
    const double = await getProxyOwner(owner);
    if (double) {
        return double;
    }

    return owner;
};

const getOwners = async (proxies: any): Promise<string[]> => {
    const owners = new Set<string>();
    await Promise.all(
        proxies.map(async (proxy: any) => {
            const owner = await getOwner(proxy);
            owners.add(owner);
        })
    );
    return Array.from(owners);
};

export const getWhitelistOmenUsers = async () => {
    let totalUsers = loadCache(CACHE_LOCATION);
    if (totalUsers.length > 0) {
        console.log(
            `number of omen users from cache that spent more than 25usd: ${totalUsers.length}`
        );
        return totalUsers;
    }

    console.log("fetching mainnet omen user addresses");
    const mainnetData = await getAddresses(GRAPH_MAINNET_HTTP, mainnetProvider);
    console.log("fetching xdai omen user addresses");
    const xdaiData = await getAddresses(GRAPH_XDAI_HTTP, xdaiProvider);

    console.log("fetching proxy owners for mainnet users");
    const mainnetPotentialProxies = Array.from(
        new Set([...mainnetData.users, ...mainnetData.lps])
    );
    const eaoMainnetUsers = await getEoaAddresses(
        Array.from(new Set(await getOwners(mainnetPotentialProxies))),
        MAINNET_PROVIDER
    );
    console.log(
        `fetched ${eaoMainnetUsers.length} mainnet omen users (removed ${
            mainnetPotentialProxies.length - eaoMainnetUsers.length
        } sc users)`
    );

    console.log("fetching proxy owners for xdai users");
    const xDaiPotentialProxies = Array.from(
        new Set([...xdaiData.users, ...xdaiData.lps])
    );
    const eaoXDaiUsers = await getEoaAddresses(
        Array.from(new Set(await getOwners(xDaiPotentialProxies))),
        XDAI_PROVIDER
    );
    console.log(
        `fetched ${eaoXDaiUsers.length} xdai omen users (removed ${
            xDaiPotentialProxies.length - eaoXDaiUsers.length
        } sc users)`
    );

    totalUsers = eaoMainnetUsers.concat(eaoXDaiUsers);

    console.log(
        `number of unique addresses that spent more than 25 usd on omen: ${totalUsers.length}`
    );
    saveCache(totalUsers, CACHE_LOCATION);
    return totalUsers;
};
