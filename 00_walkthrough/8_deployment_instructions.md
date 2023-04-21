# Deployment Instructions

```bash
$ git checkout tags/8
```

## Deploying to Devnet

Update the cluster in `Anchor.toml` to devnet

```diff
[provider]
- cluster = "localnet"
+ cluster = "devnet"
wallet = "~/.config/solana/id.json"
```

In our test we use the SwitchboardTestContext to load our personal Switchboard
environment. If you are deploying to devnet you may not want to run your own
oracles and instead can opt in to using the Switchboard DAO queues. When
creating a VRF Account, use Switchboard's devnet permissionless queue located at
`uPeRMdfPmrPqgRWSrjAnAkH78RqAhe5kXoW6vBYRqFX`.

```diff
describe("vrf-client", () => {
     ixData: vrfIxCoder.encode("consumeRandomness", ""), // pass any params for instruction here
   };

-  let switchboard: sbv2.SwitchboardTestContext;
+  let switchboard: {
+    program: sbv2.SwitchboardProgram;
+    queue: sbv2.QueueAccount;
+  };
   let oracle: NodeOracle;
   let vrfAccount: sbv2.VrfAccount;

   before(async () => {
-    switchboard = await sbv2.SwitchboardTestContext.loadFromProvider(
-      provider,
-      {
-        // You can provide a keypair to so the PDA schemes dont change between test runs
-        name: "Test Queue",
-        keypair: sbv2.SwitchboardTestContext.loadKeypair(
-          "~/.keypairs/queue.json"
-        ),
-        queueSize: 10,
-        reward: 0,
-        minStake: 0,
-        oracleTimeout: 900,
-        unpermissionedFeeds: true,
-        unpermissionedVrf: true,
-        enableBufferRelayers: true,
-        oracle: {
-          name: "Test Oracle",
-          enable: true,
-          stakingWalletKeypair: sbv2.SwitchboardTestContext.loadKeypair(
-            "~/.keypairs/oracleWallet.json"
-          ),
-        },
-      }
+    const switchboardProgram = await sbv2.SwitchboardProgram.fromProvider(
+      provider
     );
-
-    oracle = await NodeOracle.fromReleaseChannel({
-      chain: "solana",
-      releaseChannel: "testnet",
-      network: "localnet", // disables production capabilities like monitoring and alerts
-      rpcUrl: switchboard.program.connection.rpcEndpoint,
-      oracleKey: switchboard.oracle.publicKey.toBase58(),
-      secretPath: switchboard.walletPath,
-      silent: false, // set to true to suppress oracle logs in the console
-      envVariables: {
-        VERBOSE: "1",
-        DEBUG: "1",
-        DISABLE_NONCE_QUEUE: "1",
-        DISABLE_METRICS: "1",
-      },
-    });
-
-    await oracle.startAndAwait();
-  });
-
-  after(async () => {
-    oracle?.stop();
+    const [queueAccount, queue] = await sbv2.QueueAccount.load(
+      switchboardProgram,
+      "uPeRMdfPmrPqgRWSrjAnAkH78RqAhe5kXoW6vBYRqFX"
+    );
+    switchboard = { program: switchboardProgram, queue: queueAccount };
   });

   it("init_client", async () => {

```

Run the following command to deploy your program to devnet

```bash
anchor deploy
```

## Deploying to Mainnet

Update the cluster in `Anchor.toml` to mainnet

```diff
[provider]
- cluster = "localnet"
+ cluster = "mainnet"
wallet = "~/.config/solana/id.json"
```

Like above, you will want to create VRF Accounts for a mainnet queue. You may
use Switchboard's mainnet permissionless queue located at
`3HBb2DQqDfuMdzWxNk1Eo9RTMkFYmuEAd32RiLKn9pAn`.

Run the following command to deploy your program to mainnet

```bash
anchor deploy
```

## Next: [#9 More Info](/00_walkthrough/9_more_info.md)
