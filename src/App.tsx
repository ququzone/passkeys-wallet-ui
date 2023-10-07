import { observer } from "mobx-react-lite";
import { useStore } from "./store";
import "./App.css";
import { createPasskeyCredential, getPublicKeyFromBytes, authentication } from "./utils/webauthn";

const App = observer(() => {
  const { base } = useStore();

  const getPasskey = async () => {
    const storedKeyJson = localStorage.getItem("smart-accounts:key");
    if (storedKeyJson != null) {
      const storedKey = JSON.parse(storedKeyJson);
      const pubKey = await getPublicKeyFromBytes(storedKey.registration);
      base.key = `${storedKey.registration.credential.id}-${pubKey}`;
    }
  };

  const createPasskey = async () => {
    const cert = await createPasskeyCredential("SmartAccounts");
    localStorage.setItem("smart-accounts:key", JSON.stringify(cert));
    console.log(cert);
  };

  const signMessage = async () => {
    const storedKeyJson = localStorage.getItem("smart-accounts:key");
    if (storedKeyJson != null) {
      const message = '0x4a00c3f66a03ce511192d5a3087131d3e659049dbd4e5130c67a0176479cf2c0';
      const storedKey = JSON.parse(storedKeyJson);
      const sig = await authentication(storedKey.registration.credential.id, message);
      base.signature = sig;
      return;
    }
    throw new Error('No passkeys');
  };

  return (
    <>
      <h1>Passkeys demo</h1>
      <p>
        Created passkeys: {base.key}
      </p>
      <p>
        Signature: {base.signature}
      </p>
      <div className="card">
        <p>
          <button onClick={createPasskey}>Create Passkeys</button>
        </p>
        <p>
          <button onClick={getPasskey}>Get stored passkeys</button>
        </p>
        <p>
          <button onClick={signMessage}>Sign message</button>
        </p>
      </div>
    </>
  );
});

export default App;
