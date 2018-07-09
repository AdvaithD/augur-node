import { Augur } from "augur.js";
import { ErrorCallback } from "../types";

let monitorEthereumNodeHealthId: NodeJS.Timer;

export function monitorEthereumNodeHealth(augur: Augur, errorCallback: ErrorCallback | undefined) {
  const networkId: string = augur.rpc.getNetworkID();
  const universe: string = augur.contracts.addresses[networkId].Universe;
  const controller: string = augur.contracts.addresses[networkId].Controller;
  if (monitorEthereumNodeHealthId) {
    clearInterval(monitorEthereumNodeHealthId);
  }
  try {
    monitorEthereumNodeHealthId = setInterval(() => {
      augur.api.Universe.getController({ tx: { to: universe } }, (err: Error, universeController: string) => {
        if (err) {
          clearInterval(monitorEthereumNodeHealthId);
          if (errorCallback) errorCallback(err);
        }
        if (universeController !== controller) {
          clearInterval(monitorEthereumNodeHealthId);
          if (errorCallback) errorCallback(new Error(`Controller mismatch. Configured: ${controller} Found: ${universeController}`));
        }
      });
    }, 5000);
  } catch (err) {
    console.log(err);
  }
}
