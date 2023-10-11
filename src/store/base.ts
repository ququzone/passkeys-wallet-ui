import { RegistrationEncoded } from "@passwordless-id/webauthn/dist/esm/types";
import { ethers } from "ethers";
import { makeAutoObservable } from "mobx";

export class BaseStore {
  constructor() {
    makeAutoObservable(this);
  }

  stage = 0;
  creatingAccount = false;
  creatingSessionKey = false;
  mintingNFT = false;
  account = '';
  messages: string[] = [];
  storedPasskeys: { challenge: string; registration: RegistrationEncoded; } | null = null;
  ecdsaWallet: ethers.Wallet | null = null;
}
