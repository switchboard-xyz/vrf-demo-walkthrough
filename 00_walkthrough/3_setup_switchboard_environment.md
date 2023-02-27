# Setup Switchboard Environment

```bash
$ git checkout tags/3
```

In your Anchor.toml, add the following to clone the switchboard program and
context when using a localnet environment:

```toml
[test]
startup_wait = 10000

[test.validator]
url = "https://api.devnet.solana.com"

[[test.validator.clone]] # switchboardProgramId
address = "2TfB33aLaneQb5TNVwyDz3jSZXS6jdW2ARw1Dgf84XCG"

[[test.validator.clone]] # switchboardIdlAddress
address = "CKwZcshn4XDvhaWVH9EXnk3iu19t6t5xP2Sy2pD6TRDp"

[[test.validator.clone]] # switchboardProgramState
address = "BYM81n8HvTJuqZU1PmTVcwZ9G8uoji7FKM6EaPkwphPt"

[[test.validator.clone]] # switchboardVault
address = "FVLfR6C2ckZhbSwBzZY4CX7YBcddUSge5BNeGQv5eKhy"

```

Now let's update our test and print out our oracle queue to the console.

Open `tests/vrf-client.ts` and add the following before hook. This will:

- Create a new Switchboard queue and oracle
- Startup a Docker container in the background with your newly created oracle
- Wait for the Docker container to signal readiness

```typescript
import "mocha";

import * as anchor from "@project-serum/anchor";
import { AnchorProvider } from "@project-serum/anchor";
import * as sbv2 from "@switchboard-xyz/solana.js";
import { VrfClient } from "../target/types/vrf_client";
import { assert } from "chai";
import { BN } from "bn.js";

describe("vrf-client", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program: anchor.Program<VrfClient> = anchor.workspace.VrfClient;
  const payer = (provider.wallet as sbv2.AnchorWallet).payer;

  const vrfSecret = anchor.web3.Keypair.generate();
  console.log(`VRF Account: ${vrfSecret.publicKey}`);

  const [vrfClientKey] = anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("CLIENTSEED"), vrfSecret.publicKey.toBytes()],
    program.programId
  );
  console.log(`VRF Client: ${vrfClientKey}`);

  const vrfIxCoder = new anchor.BorshInstructionCoder(program.idl);
  const vrfClientCallback: sbv2.Callback = {
    programId: program.programId,
    accounts: [
      // ensure all accounts in consumeRandomness are populated
      { pubkey: vrfClientKey, isSigner: false, isWritable: true },
      { pubkey: vrfSecret.publicKey, isSigner: false, isWritable: false },
    ],
    ixData: vrfIxCoder.encode("consumeRandomness", ""), // pass any params for instruction here
  };

  let switchboard: sbv2.SwitchboardTestContextV2;
  let vrfAccount: sbv2.VrfAccount;

  before(async () => {
    switchboard = await sbv2.SwitchboardTestContextV2.loadFromProvider(
      provider,
      {
        // You can provide a keypair to so the PDA schemes dont change between test runs
        name: "Test Queue",
        keypair: sbv2.SwitchboardTestContextV2.loadKeypair(
          "~/.keypairs/queue.json"
        ),
        queueSize: 10,
        reward: 0,
        minStake: 0,
        oracleTimeout: 900,
        unpermissionedFeeds: true,
        unpermissionedVrf: true,
        enableBufferRelayers: true,
        oracle: {
          name: "Test Oracle",
          enable: true,
          stakingWalletKeypair: sbv2.SwitchboardTestContextV2.loadKeypair(
            "~/.keypairs/oracleWallet.json"
          ),
        },
      }
    );
    await switchboard.start();
  });

  after(async () => {
    if (switchboard) {
      switchboard.stop();
    }
  });

  it("init_client", async () => {
    const tx = await program.methods.initClient({}).rpc();
    console.log("init_client transaction signature", tx);
  });
});
```

Then run the test

```bash
anchor test
```

## Next: [#4 Add init_client Instruction](./4_add_init_client_instruction.md)
