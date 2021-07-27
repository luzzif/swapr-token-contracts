// taken from https://github.com/hexyls/omen-airdrop/blob/master/index.js

import {
    getEoaAddresses,
    loadCache,
    logInPlace,
    MAINNET_PROVIDER,
    MARKETING_AIRDROP_TIME_LIMIT,
    saveCache,
    XDAI_PROVIDER,
} from "../commons";
import { request, gql } from "graphql-request";
import { constants, ethers, providers, utils } from "ethers";
import url from "url";
import { Client } from "jayson";
import { Interface } from "ethers/lib/utils";

const EOA_CACHE_LOCATION = `${__dirname}/cache/eoas.json`;
const MAINNET_SC_CACHE_LOCATION = `${__dirname}/cache/mainnet-scs.json`;
const XDAI_SC_CACHE_LOCATION = `${__dirname}/cache/xdai-scs.json`;

const GRAPH_MAINNET_HTTP =
    "https://api.thegraph.com/subgraphs/name/protofire/omen";
const GRAPH_XDAI_HTTP =
    "https://api.thegraph.com/subgraphs/name/protofire/omen-xdai";
const CPK_INTERFACE = new Interface([
    "function getOwners() public view returns (address[] memory)",
]);

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
const wait = () => new Promise((resolve) => setTimeout(resolve, 500, {}));
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
    const minSpend = 100;
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

interface ResponseItem {
    result: string;
}

export const getCPKOwners = async (
    cpkAddresses: string[],
    provider: providers.JsonRpcProvider
): Promise<string[]> => {
    const owners: string[] = [];
    const chunkSize = 1000;
    const chunksAmount = Math.ceil(cpkAddresses.length / chunkSize);
    const { host, pathname } = new url.URL(provider.connection.url);
    const jsonRpcClient = Client.https({
        host,
        path: pathname,
    });
    for (let i = 0; i < chunksAmount; i++) {
        const sliceEnd = Math.min(
            i * chunkSize + chunkSize,
            cpkAddresses.length
        );
        const slice = cpkAddresses.slice(i * chunkSize, sliceEnd);
        const callsBatch = slice.map((address) =>
            jsonRpcClient.request("eth_call", [
                {
                    to: address,
                    data: CPK_INTERFACE.encodeFunctionData("getOwners()"),
                },
            ])
        );
        const batchCallResponse: ResponseItem[] = await new Promise(
            (resolve, reject) => {
                jsonRpcClient.request(
                    callsBatch,
                    (error: Error, response: any) => {
                        if (error) reject(error);
                        else resolve(response);
                    }
                );
            }
        );
        batchCallResponse.forEach((responseItem, index) => {
            const address = slice[index];
            try {
                const result = CPK_INTERFACE.decodeFunctionResult(
                    "getOwners()",
                    responseItem.result
                );
                owners.push(...result[0]);
            } catch (error) {}
        });
        logInPlace(
            `detecting cpk owners: ${(
                (sliceEnd / cpkAddresses.length) *
                100
            ).toFixed(2)}%`
        );
    }
    console.log();
    return owners;
};

export const getWhitelistOmenUsers = async (): Promise<{
    eoas: string[];
    mainnetSmartContracts: string[];
    xDaiSmartContracts: string[];
}> => {
    let eoas = loadCache(EOA_CACHE_LOCATION);
    let mainnetSmartContracts = loadCache(MAINNET_SC_CACHE_LOCATION);
    let xDaiSmartContracts = loadCache(XDAI_SC_CACHE_LOCATION);
    if (
        eoas.length > 0 ||
        mainnetSmartContracts.length > 0 ||
        xDaiSmartContracts.length > 0
    ) {
        console.log(
            `omen users from cache: ${eoas.length} eoas, ${mainnetSmartContracts.length} mainnet smart contracts, ${xDaiSmartContracts.length} xdai smart contracts`
        );
        return { eoas, mainnetSmartContracts, xDaiSmartContracts };
    }

    const mainnetData = await getAddresses(GRAPH_MAINNET_HTTP, mainnetProvider);
    const xdaiData = await getAddresses(GRAPH_XDAI_HTTP, xdaiProvider);

    const mainnetPotentialProxies = Array.from(
        new Set([...mainnetData.users, ...mainnetData.lps])
    );
    const mainnetProxyOwners = Array.from(
        new Set(
            await getCPKOwners(
                mainnetPotentialProxies as string[],
                MAINNET_PROVIDER
            )
        )
    );
    const { eoas: rawMainnetEoas, smartContracts: rawMainnetSmartContracts } =
        await getEoaAddresses(mainnetProxyOwners, MAINNET_PROVIDER);

    const xDaiPotentialProxies = Array.from(
        new Set([...xdaiData.users, ...xdaiData.lps])
    );
    const xDaiProxyOwners = Array.from(
        new Set(
            await getCPKOwners(xDaiPotentialProxies as string[], XDAI_PROVIDER)
        )
    );
    const { eoas: rawXDaiEoas, smartContracts: rawXDaiSmartContracts } =
        await getEoaAddresses(xDaiProxyOwners, XDAI_PROVIDER);

    eoas = [...rawMainnetEoas, ...rawXDaiEoas];
    mainnetSmartContracts = rawMainnetSmartContracts;
    xDaiSmartContracts = rawXDaiSmartContracts;

    console.log(
        `omen users: ${eoas.length} eoas, ${mainnetSmartContracts.length} mainnets scs, ${xDaiSmartContracts.length} xdai scs`
    );
    console.log();
    saveCache(eoas, EOA_CACHE_LOCATION);
    saveCache(mainnetSmartContracts, MAINNET_SC_CACHE_LOCATION);
    saveCache(xDaiSmartContracts, XDAI_SC_CACHE_LOCATION);
    return { eoas, mainnetSmartContracts, xDaiSmartContracts };
};
