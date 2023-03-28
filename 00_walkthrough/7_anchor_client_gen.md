# Anchor Client Gen

```bash
$ git checkout tags/7
```

Check out the npm package
[anchor-client-gen](https://github.com/kklas/anchor-client-gen). This will
generate a typescript client from your Anchor IDL to help streamline
(de)serializing account data off-chain.

```bash
$ npx anchor-client-gen target/idl/vrf_client.json client --program-id $(solana-keygen pubkey target/deploy/vrf_client-keypair.json)
generating programId.ts...
generating errors...
generating instructions...
generating types...
generating accounts...
formatting...
writing files...
```

Now you can import the client into your tests or SDK. You will need to have the
following as dependencies: `@solana/web3.js`, `bn.js`, and `@coral-xyz/borsh`.

```typescript
import { Connection } from "@solana/web3.js";
import { VrfClientState } from "./client/accounts";

const connection = new Connection("http://your-rpc-url.xyz");
const clientState = await VrfClientState.fetch(connection, vrfClientPubkey);
console.log(clientState);
```

## Next: [#8 Deployment Instructions](/00_walkthrough/8_deployment_instructions.md)
