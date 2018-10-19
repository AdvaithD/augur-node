import { Augur } from "augur.js";
import * as Knex from "knex";
import { BigNumber } from "bignumber.js";
import { FormattedEventLog, MarketsRow, CompleteSetsRow, ErrorCallback } from "../../types";
import { numTicksToTickSize } from "../../utils/convert-fixed-point-to-decimal";
import { augurEmitter } from "../../events";
import { SubscriptionEventNames } from "../../constants";
import { updateOpenInterest } from "./order-filled/update-volumetrics";

export async function processCompleteSetsPurchasedOrSoldLog(db: Knex, augur: Augur, log: FormattedEventLog) {
  const marketId = log.market;
  const marketsRow: MarketsRow<BigNumber>|undefined = await db.first("minPrice", "maxPrice", "numTicks").from("markets").where({ marketId });

  if (!marketsRow) throw new Error("market min price, max price, category, and/or num ticks not found");
  const minPrice = marketsRow.minPrice!;
  const maxPrice = marketsRow.maxPrice!;
  const numTicks = marketsRow.numTicks!;
  const tickSize = numTicksToTickSize(numTicks, minPrice, maxPrice);
  const numCompleteSets = augur.utils.convertOnChainAmountToDisplayAmount(new BigNumber(log.numCompleteSets, 10), tickSize).toString();
  const completeSetPurchasedData: CompleteSetsRow<string> = {
    marketId,
    account: log.account,
    blockNumber: log.blockNumber,
    universe: log.universe,
    eventName: log.eventName,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    tradeGroupId: log.tradeGroupId,
    numCompleteSets,
    numPurchasedOrSold: numCompleteSets,
  };
  const eventName = log.eventName as keyof typeof SubscriptionEventNames;
  await db.insert(completeSetPurchasedData).into("completeSets")
  augurEmitter.emit(SubscriptionEventNames[eventName], completeSetPurchasedData);
  updateOpenInterest(db, marketId);
}

export async function processCompleteSetsPurchasedOrSoldLogRemoval(db: Knex, augur: Augur, log: FormattedEventLog) {
  await db.from("completeSets").where({ transactionHash: log.transactionHash, logIndex: log.logIndex }).del();

    const eventName = log.eventName as keyof typeof SubscriptionEventNames;
    augurEmitter.emit(SubscriptionEventNames[eventName], log);
    await updateOpenInterest(db, log.market);

}
