# Setup Switchboard Environment

```bash
$ git checkout tags/3
```

We'll be using localnet throughout so we need a way to interact with the
switchboard program. We can use the `sbv2` cli to create our own switchboard
queue on devnet, which will then be copied to our localnet cluster along with a
copy of the compiled switchboard program before running any tests.

```bash
$ sbv2 solana localnet env --keypair ~/.config/solana/id.json --outputDir .switchboard
OracleQueue     F9aV4MjaifGSpR8x84rLjHiAQQT13oohxZmv9XeoazXr
OracleBuffer    7jJiche9SvWSkQgiJJdGmMmrdqnY5iASw9JkZuLEko1a
CrankAccount    6s9SaiymnF8yAqsdqFHHEserrZ6SWcS3kzjtLK7jibKh
CrankBuffer     CxVuJ4zMLwak8m7B3jHsYjiN6Sd3z9rHdUFeryEzzu6C
Oracle-1        4gwcUf5cJL8bro8NoYfbBdoQP3P6BRQJXtqeJACtYCJQ
Permission-1    2rN3XFR6sSFdFtQqm45XBL4LSAb6sZeDcY3T3UBAYEu7
Env File saved to: ./.switchboard/switchboard.env
Bash script saved to: ./.switchboard/start-local-validator.sh
Bash script saved to: ./.switchboard/start-oracle.sh
Docker-Compose saved to: ./.switchboard/docker-compose.switchboard.yml
Anchor.toml saved to: ./.switchboard/Anchor.switchboard.toml

You may also copy the accounts from Anchor.switchboard.toml into your projects Anchor.toml and run the following command to create an oracle and run 'anchor test' with a local validator running:
        sbv2 solana anchor test \
  --keypair /Users/gally/.config/solana/id.json \
  --oracleKey 4gwcUf5cJL8bro8NoYfbBdoQP3P6BRQJXtqeJACtYCJQ \
  --switchboardDir /Users/gally/dev/switchboard/vrf-client-demo/.switchboard
```

Then copy the contents of `.switchboard/Anchor.switchboard.toml` into
`Anchor.toml`. This will copy the Switchboard environment to localnet when we
start a test.

```bash
echo "" >> Anchor.toml; cat .switchboard/Anchor.switchboard.toml >> Anchor.toml;
```

Now instead of running anchor test, we'll run the `sbv2 solana anchor test`
command which will start a localnet Switchboard oracle before running anchor
test internally. **NOTE:** This command requires docker and anchor to be
installed. If on a mac with an ARM chip, pass the `--arm` flag to run a
container for arm64 architecture.

Then ignore this directory from git

```bash
printf "\n.switchboard" >> .gitignore
printf "\n**/*.log" >> .gitignore
```

Now let's update our test and print out our oracle queue to the console.

Open `tests/vrf-client.ts` and add the following before hook. This will check
your current directory for `switchboard.env` or a `.switchboard` directory with
a `switchboard.env` file to load your switchboard accounts. It will then check
for any active oracles and throw an error.

```typescript
import * as anchor from "@project-serum/anchor";
import * as sbv2 from "@switchboard-xyz/solana.js";
import { assert } from "chai";
import { VrfClient } from "../target/types/vrf_client";

describe("vrf-client", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.VrfClient as Program<VrfClient>;
  const provider = program.provider as anchor.AnchorProvider;
  const payer = (provider.wallet as sbv2.AnchorWallet).payer;

  let switchboard: sbv2.SwitchboardTestContext;
  let payerTokenAddress: anchor.web3.PublicKey;

  const vrfKeypair = anchor.web3.Keypair.generate();

  let vrfClientKey: anchor.web3.PublicKey;
  let vrfClientBump: number;
  [vrfClientKey, vrfClientBump] = anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("CLIENTSEED"), vrfKeypair.publicKey.toBytes()],
    program.programId
  );

  before(async () => {
    switchboard = await sbv2.SwitchboardTestContext.loadFromEnv(
      program.provider as anchor.AnchorProvider
    );
    const queueData = await switchboard.queue.loadData();
    const queueOracles = await switchboard.queue.loadOracles();
    [payerTokenAddress] = await switchboard.program.mint.getOrCreateWrappedUser(
      switchboard.program.walletPubkey,
      { fundUpTo: 0.75 }
    );
    assert(queueOracles.length > 0, `No oracles actively heartbeating`);
    console.log(`oracleQueue: ${switchboard.queue.publicKey}`);
    console.log(
      `unpermissionedVrfEnabled: ${queueData.unpermissionedVrfEnabled}`
    );
    console.log(`# of oracles heartbeating: ${queueOracles.length}`);
    logSuccess("Switchboard localnet environment loaded successfully");
  });

  it("init_client", async () => {
    const tx = await program.methods.initClient({}).rpc();
    console.log("init_client transaction signature", tx);
  });
});
```

## Next: [#4 Add init_client Instruction](./4_add_init_client_instruction.md)
