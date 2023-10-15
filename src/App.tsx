import { observer } from "mobx-react-lite";
import { useStore } from "./store";
import { createPasskeyCredential } from "./utils/webauthn";
import { useEffect } from "react";
import { WebauthnSigner } from "./utils/userop";
import { Client, Presets } from "userop";
import { SmartAccount } from "smart-accounts";
import { SessionKeySigner } from "smart-accounts";

import { Heading, Center, Box, Button, Stack, StackDivider, Text, Wrap, WrapItem, Link } from "@chakra-ui/react";
import { BigNumber, ethers } from "ethers";
import { hexZeroPad } from "ethers/lib/utils";

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
  const sessionKeyValidator = "0x9c0bCB161986d50013783003FDef76f1d3548F3A";
  const accountFactory = "0xdC0a3eF76617794a944BAA1A21e863b1d9d94d8C";
  const nftAddr = "0xA3Ce183b2EA38053f85A160857E6f6A8C10EF5f7";
  const rpc = "https://babel-api.testnet.iotex.io";
  const bundler = "https://bundler.testnet.w3bstream.com";
  const paymaster = "https://paymaster.testnet.w3bstream.com/rpc/d98ecac885f4406d87517263b83cb237";

  useEffect(() => {
    const storedKeyJson = localStorage.getItem("smart-accounts:key");
    if (storedKeyJson) {
      base.storedPasskeys = JSON.parse(storedKeyJson);
      base.stage = 1;
    }
    const account = localStorage.getItem(`smart-accounts:account:${chainId}`);
    if (account) {
      base.account = account;
      base.stage = 2;
    }
    if (base.ecdsaWallet) {
      base.stage = 3;
    }
  }, [base]);

  const createPasskey = async () => {
    const credential = await createPasskeyCredential("SmartAccounts");
    localStorage.setItem("smart-accounts:key", JSON.stringify(credential));
    localStorage.removeItem(`smart-accounts:account:${chainId}`);
    base.account = '';
    base.stage = 1;
    base.storedPasskeys = credential;
  };

  const createAccount = async () => {
    if (!base.storedPasskeys) {
      throw Error('create passkeys first');
    }
    base.creatingAccount = true
    try {
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
      base.messages.push({text: `create account opHash: ${response.userOpHash}`});
      const userOperationEvent = await response.wait();
      base.messages.push({
        text: 'create account txHash: ',
        link: {
          text: userOperationEvent!.transactionHash,
          href: `https://testnet.iotexscan.io/tx/${userOperationEvent?.transactionHash}`
        }
      });
      localStorage.setItem(`smart-accounts:account:${chainId}`, accountBuilder.getSender());
      base.account = accountBuilder.getSender();
      base.stage = 2;
    } finally {
      base.creatingAccount = false;
    }
  };

  const createSessionKey = async () => {
    if (!base.storedPasskeys || !base.account) {
      throw Error('create passkeys or account first');
    }
    base.creatingSessionKey = true;
    try {
      base.ecdsaWallet = ethers.Wallet.createRandom();

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

      const validAfter = Math.floor(new Date().getTime() / 1000);
      // three hours
      const validUntil = validAfter + 10800;

      const validatorData = ethers.utils.solidityPack(
        ["bytes20", "bytes6", "bytes6"],
        [base.ecdsaWallet.address , hexZeroPad(BigNumber.from(validUntil).toHexString(), 6), hexZeroPad(BigNumber.from(validAfter).toHexString(), 6)]
      )

      const enableValidator = new ethers.utils.Interface(["function enableValidator(address,bytes)"]);
      const enableValidatorCallData = enableValidator.encodeFunctionData("enableValidator", [
        sessionKeyValidator,
        validatorData 
      ]);
      const execute = new ethers.utils.Interface(["function execute(address,uint256,bytes)"]);
      const executeCallData = execute.encodeFunctionData("execute", [
        base.account,
        0,
        enableValidatorCallData 
      ]);
      accountBuilder.setCallData(executeCallData);

      const response = await client.sendUserOperation(accountBuilder);
      base.messages.push({text: `create session key opHash: ${response.userOpHash}`});
      const userOperationEvent = await response.wait();
      base.messages.push({
        text: 'create session key txHash: ',
        link: {
          text: userOperationEvent!.transactionHash,
          href: `https://testnet.iotexscan.io/tx/${userOperationEvent?.transactionHash}`
        }
      });
      base.stage = 3;
    } finally {
      base.creatingSessionKey = false;
    }
  }

  const mintNFT = async () => {
    if (!base.storedPasskeys || !base.account || !base.ecdsaWallet) {
      throw Error('create passkeys or account first');
    }
    base.mintingNFT = true;
    try {
      const signer = new SessionKeySigner(
        base.ecdsaWallet,
        sessionKeyValidator
      );

      const client = await Client.init(rpc, {
        entryPoint: entrypoint,
        overrideBundlerRpc: bundler,
      });
      const accountBuilder = await SmartAccount.new(base.account, signer, rpc, {
        overrideBundlerRpc: bundler,
        entryPoint: entrypoint,
        factory: accountFactory,
        paymasterMiddleware: Presets.Middleware.verifyingPaymaster(
          paymaster,
          { "type": "payg" }
        ),
      });
      const execute = new ethers.utils.Interface(["function execute(address,uint256,bytes)"]);
      const executeCallData = execute.encodeFunctionData("execute", [
        nftAddr,
        0,
        "0x1249c58b" 
      ]);
      accountBuilder.setCallData(executeCallData);

      const response = await client.sendUserOperation(accountBuilder);
      base.messages.push({text: `mint nft opHash: ${response.userOpHash}`});
      const userOperationEvent = await response.wait();
      base.messages.push({
        text: 'mint nft txHash: ',
        link: {
          text: userOperationEvent!.transactionHash,
          href: `https://testnet.iotexscan.io/tx/${userOperationEvent?.transactionHash}`
        }
      });
      base.stage = 3;
    } finally {
      base.mintingNFT = false;
    }
  }

  return (
    <Center p="10">
      <Box borderWidth='1px' borderRadius='lg' p='6'>
        <Heading size='md'>Passkeys Account Abstraction demo</Heading>
        <Stack divider={<StackDivider />} spacing='4' paddingTop='6'>
          <Box p='2'>
            <Heading size='xs' textTransform='uppercase'>
              Account
            </Heading>
            <Box paddingTop='3'>
              <Text>
                Passkeys: {base.storedPasskeys? ( base.storedPasskeys.registration.credential.id ) : 'None'}
              </Text>
              <Text>
                Created Account: {base.account? ( <Link color="teal.500" isExternal href={"https://testnet.iotexscan.io/address/" + base.account}>{base.account}</Link> ) : 'None'}
              </Text>
              <Text>
                Session key: {base.ecdsaWallet? ( base.ecdsaWallet.address ) : 'None'}
              </Text>
            </Box>
          </Box>
          <Box p='2'>
            <Heading size='xs' textTransform='uppercase'>
              Message
            </Heading>
            <Box paddingTop='3'>
              {base.messages.map((message, i) => 
                <Text key={"message-" + i}>{message.text} {message.link && <Link color="teal.500" isExternal href={message.link.href}>{message.link.text}</Link>}</Text>)
              }
            </Box>
          </Box>
          <Box p='2'>
            <Wrap spacing={4}>
              <WrapItem>
                {base.stage == 1?
                  <Button colorScheme="blue" onClick={createPasskey}>Create Passkeys</Button> :
                  <Button colorScheme="gray" onClick={createPasskey}>Create Passkeys</Button>
                }
              </WrapItem>
              {base.stage == 1 &&
              <WrapItem>
                <Button isLoading={base.creatingAccount} loadingText="Creating Passkeys Account" colorScheme='red' onClick={createAccount}>Create Passkeys Account</Button>
              </WrapItem>
              }
              {base.stage == 2 &&
              <WrapItem>
                <Button isLoading={base.creatingSessionKey} loadingText="Creating Session Key" colorScheme='orange' onClick={createSessionKey}>Create Session Key</Button>
              </WrapItem>
              }
              {base.stage == 3 &&
              <WrapItem>
                <Button isLoading={base.mintingNFT} loadingText="Minting NFT with Session Key" colorScheme='yellow' onClick={mintNFT}>Mint NFT with Session Key</Button>
              </WrapItem>
              }
            </Wrap>
          </Box>
          <Box p='2'>
            <Stack direction='row' justify='center'>
              <Text>Made by <Link isExternal color="teal.500" href="https://github.com/ququzone/smart-accounts">Smart Accounts</Link></Text>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Center>
  );
});

export default App;
