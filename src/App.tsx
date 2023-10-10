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
  // sepolia network
  // const chainId = 11155111;
  // const entrypoint = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  // const webauthnValidator = "0x2E9bB461FD23135E0462656cCC996fA6084af079";
  // const accountFactory = "0x6cBd0B9c0e1E0355586699a462Eb873275A9d85c";
  // const rpc = "https://sepolia.infura.io/v3/60eeb7d98424454697e964bfa9b5d22f";
  // // const bundler = "https://api.stackup.sh/v1/node/e7df182ab48c66ff91b252d35f50772493461bcece1b3bf10ff63f3f532af9e8";
  // // const bundler = "https://eth-sepolia.g.alchemy.com/v2/q-MHAuolMYrrvwMlB8xlKluDd3lbM6sC"
  // const bundler = "http://127.0.0.1:14337/1337"
  // const paymaster = "https://api.stackup.sh/v1/paymaster/e7df182ab48c66ff91b252d35f50772493461bcece1b3bf10ff63f3f532af9e8";

  // iotex testnet
  const chainId = 4690;
  const entrypoint = "0xc3527348De07d591c9d567ce1998eFA2031B8675";
  const webauthnValidator = "0xe2C03A87C78783d85C263B020E9AeFDa3525d69c";
  const accountFactory = "0x6D7746E6fFfaddC9E71f7f633b85A1053EABdc10";
  const rpc = "https://babel-api.testnet.iotex.io";
  const bundler = "https://bundler.testnet.w3bstream.com";
  const paymaster = "https://paymaster.testnet.w3bstream.com/rpc/d98ecac885f4406d87517263b83cb237";

  useEffect(() => {
    const storedKeyJson = localStorage.getItem("smart-accounts:key");
    if (storedKeyJson != null) {
      base.storedPasskeys = JSON.parse(storedKeyJson);
    }
    const account = localStorage.getItem(`smart-accounts:account:${chainId}`);
    if (account != null) {
      base.account = account;
    }
  }, [base]);

  const createPasskey = async () => {
    const credential = await createPasskeyCredential("SmartAccounts");
    localStorage.setItem("smart-accounts:key", JSON.stringify(credential));
    localStorage.removeItem(`smart-accounts:account:${chainId}`);
    base.account = '';
    base.storedPasskeys = credential;
  };

  const createAccount = async () => {
    if (!base.storedPasskeys) {
      throw Error('create passkeys first');
    }
    const signer = new WebauthnSigner(
      base.storedPasskeys.registration,
      webauthnValidator
    );

    const client = await Client.init(rpc, {
      entryPoint: entrypoint,
      overrideBundlerRpc: bundler,
    });
    const accountBuilder = await SmartAccount.init(signer, rpc, {
      overrideBundlerRpc: bundler,
      entryPoint: entrypoint,
      factory: accountFactory,
      paymasterMiddleware: Presets.Middleware.verifyingPaymaster(
        paymaster,
        { "type": "payg" }
      ),
    });

    // const userop = await accountBuilder.buildOp(entrypoint, chainId);
    // console.log(userop);
    const response = await client.sendUserOperation(accountBuilder);
    console.log(`create account ophash: ${response.userOpHash}`);
    const userOperationEvent = await response.wait();
    console.log(`create account txhash: ${userOperationEvent?.transactionHash}`);
    localStorage.setItem(`smart-accounts:account:${chainId}`, accountBuilder.getSender());
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
