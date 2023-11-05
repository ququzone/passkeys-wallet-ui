import { RegistrationEncoded } from "@passwordless-id/webauthn/dist/esm/types";
import { ethers } from "ethers";
import { makeAutoObservable } from "mobx";

export interface Message {
  text: string,
  link?: {
    text: string,
    href: string,
  }
}

export class BaseStore {
  constructor() {
    makeAutoObservable(this);
  }

  stage = 0;
  creatingAccount = false;
  creatingSessionKey = false;
  mintingNFT = false;
  account = '';
  messages: Message[] = [];
  storedPasskeys: { challenge: string; registration: RegistrationEncoded; } | null = null;
  ecdsaWallet: ethers.Wallet | null = null;
  parent = true;
}
