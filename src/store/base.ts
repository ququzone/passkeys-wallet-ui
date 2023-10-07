import { RegistrationEncoded } from "@passwordless-id/webauthn/dist/esm/types";
import { makeAutoObservable } from "mobx";

export class BaseStore {
  constructor() {
    makeAutoObservable(this);
  }

  account = '';
  storedPasskeys: { challenge: string; registration: RegistrationEncoded; } | null = null;
  signature: string = '';
}
