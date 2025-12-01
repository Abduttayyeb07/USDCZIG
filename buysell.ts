import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { GasPrice, coins } from "@cosmjs/stargate";
import dotenv from "dotenv";
import { Buffer } from "buffer";
(globalThis as any).Buffer = Buffer;

dotenv.config();

// ---------------- ENV ----------------
const RPC = process.env.HTTP_RPC || "https://zigchain-mainnet-rpc-sanatry-01.wickhub.cc";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const WALLET_ADDR = process.env.WALLET_ADDRESS || "";

const POOL_CONTRACT = process.env.POOL_CONTRACT || ""; // YOUR POOL CONTRACT
const USDT_DENOM = process.env.USDT_DENOM || "ibc/YOUR_USDT_DENOM";
const UZIG_DENOM = process.env.UZIG_DENOM || "uzig";

const GAS_PRICE = GasPrice.fromString("0.025uzig");
const DECIMALS = 6;

// Amounts
const ONE_USDT = (1 * 10 ** DECIMALS).toString();
const TWENTY_ZIG = (20 * 10 ** DECIMALS).toString();

// -------------------------------------

async function getClient() {
  if (!PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY");
  const pk = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY.slice(2) : PRIVATE_KEY;

  const wallet = await DirectSecp256k1Wallet.fromKey(Buffer.from(pk, "hex"), "zig");
  const client = await SigningCosmWasmClient.connectWithSigner(RPC, wallet, {
    gasPrice: GAS_PRICE,
  });

  return client;
}

async function executeSwap(offerDenom: string, offerAmount: string) {
  try {
    const client = await getClient();

    const msg = {
      swap: {
        offer_asset: {
          amount: offerAmount,
          info: { native_token: { denom: offerDenom } },
        },
        max_spread: "0.005",
        to: WALLET_ADDR,
      },
    };

    const funds = coins(offerAmount, offerDenom);

    const res = await client.execute(
      WALLET_ADDR,
      POOL_CONTRACT,
      msg,
      "auto",
      undefined,
      funds
    );

    console.log("TX:", res.transactionHash);
    return res.transactionHash;
  } catch (err: any) {
    console.error("Swap failed:", err.message || err);
    return null;
  }
}

async function buyZig() {
  console.log("🟢 BUY ZIG: Selling 1 USDT...");
  await executeSwap(USDT_DENOM, ONE_USDT);
}

async function sellZig() {
  console.log("🔴 SELL ZIG: Selling 20 ZIG...");
  await executeSwap(UZIG_DENOM, TWENTY_ZIG);
}

async function loop() {
  console.log("🔥 Volume Bot Started — Running every 20 seconds");

  while (true) {
    // Step 1: Sell 1 USDT → get ZIG
    await buyZig();

    // Wait 20 seconds
    await new Promise((resolve) => setTimeout(resolve, 20_000));

    // Step 2: Sell 20 ZIG → get USDT
    await sellZig();

    // Wait 20 seconds
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
}

loop().catch(console.error);
