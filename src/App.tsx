import { observer } from "mobx-react-lite";
import { useStore } from "./store";
import "./App.css";
import { createPasskeyCredential } from "./utils/webauthn";
import { useEffect } from "react";
import { WebauthnSigner } from "./utils/userop";
import { Client, Presets } from "userop";
import { SmartAccount } from "smart-accounts/src/userop-builder";

const App = observer(() => {
  const { base } = useStore();

  useEffect(() => {
    const storedKeyJson = localStorage.getItem("smart-accounts:key");
    if (storedKeyJson != null) {
      base.storedPasskeys = JSON.parse(storedKeyJson);
    }
  }, [base]);

  const createPasskey = async () => {
    const credential = await createPasskeyCredential("SmartAccounts");
    localStorage.setItem("smart-accounts:key", JSON.stringify(credential));
    base.storedPasskeys = credential;
  };

  const createAccount = async () => {
    if (!base.storedPasskeys) {
      throw Error('create passkeys first');
    }
    const signer = new WebauthnSigner(
      base.storedPasskeys.registration,
      "0xe2C03A87C78783d85C263B020E9AeFDa3525d69c"
    )

    const client = await Client.init("https://babel-api.testnet.iotex.io", {
      entryPoint: "0xc3527348De07d591c9d567ce1998eFA2031B8675",
      overrideBundlerRpc: "https://bundler.testnet.w3bstream.com",
    })
    const accountBuilder = await SmartAccount.init(signer, "https://babel-api.testnet.iotex.io", {
      overrideBundlerRpc: "https://bundler.testnet.w3bstream.com",
      entryPoint: "0xc3527348De07d591c9d567ce1998eFA2031B8675",
      factory: "0x6D7746E6fFfaddC9E71f7f633b85A1053EABdc10",
      paymasterMiddleware: Presets.Middleware.verifyingPaymaster(
        "https://paymaster.testnet.w3bstream.com/rpc/d98ecac885f4406d87517263b83cb237",
        ""
      ),
    })
    // stub signature
    accountBuilder.setSignature("0x" + "0".repeat(1280));

    const response = await client.sendUserOperation(accountBuilder)
    console.log(`create account ophash: ${response.userOpHash}`);
    const userOperationEvent = await response.wait();
    console.log(`create account txhash: ${userOperationEvent?.transactionHash}`);
    localStorage.setItem("smart-accounts:account:4690", accountBuilder.getSender());
    base.account = accountBuilder.getSender();
  };

  return (
    <>
      <h1>Passkeys demo</h1>
      <p>
        Created Passkeys: {base.storedPasskeys? ( base.storedPasskeys.registration.credential.id ) : 'None'}
      </p>
      <p>
        Created Account: {base.account? ( base.account ) : 'None'}
      </p>
      <div className="card">
        <p>
          <button onClick={createPasskey}>Create Passkeys</button>
        </p>
        <p>
          <button onClick={createAccount}>Create Passkeys Account</button>
        </p>
      </div>
    </>
  );
});

export default App;
