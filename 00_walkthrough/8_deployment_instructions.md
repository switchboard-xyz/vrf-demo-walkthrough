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
`F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy`.

```diff
const vrfAccount = await VrfAccount.create(switchboard.program, {
    keypair: vrfKeypair,
    authority: vrfClientKey,
-    queue: switchboard.queue,
+    queue: new QueueAccount(switchboard.program, publicKey: new PublicKey("F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy")),
    callback: {
    programId: program.programId,
    accounts: [
        { pubkey: vrfClientKey, isSigner: false, isWritable: true },
        { pubkey: vrfKeypair.publicKey, isSigner: false, isWritable: false },
    ],
    ixData: new anchor.BorshInstructionCoder(program.idl).encode(
        "consumeRandomness",
        ""
    ),
    },
});
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

The switchboard-v2 rust crate defaults to mainnet. For our testing we imported
the crate with the devnet feature flag which means we were validating
Switchboard account owners against the Switchboard devnet program ID. To deploy
to mainnet, we will need to disable this feature so we instead validate against
the mainnet program ID. Make the following update in
`programs/vrf-client/Cargo.toml`

```diff
[dependencies]
anchor-lang = "0.25.0"
anchor-spl = "^0.25.0"
solana-program = "~1.10.29"
- switchboard-v2 = { version = "^0.1.20", features = ["devnet"] }
+ switchboard-v2 = { version = "^0.1.20" }
bytemuck = "1.7.2"
```

Run the following command to deploy your program to mainnet

```bash
anchor deploy
```

## Next: [#9 More Info](/00_walkthrough/9_more_info.md)
