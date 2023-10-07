import { makeAutoObservable } from "mobx";

export class BaseStore {
  constructor() {
    makeAutoObservable(this);
  }

  key: string = '';
  signature: string = '';
}
