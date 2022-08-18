# Add Dependencies

```bash
$ git checkout tags/1
```

In `programs/vrf-client/Cargo.toml` add the following lines

```toml
[dependencies]
anchor-lang = "0.25.0"
anchor-spl = "^0.25.0"
solana-program = "~1.10.29"
switchboard-v2 = { version = "^0.1.14", features = ["devnet"] }
bytemuck = "1.7.2"
```

Install npm packages

```bash
yarn add \
        @switchboard-xyz/sbv2-utils \
        @switchboard-xyz/switchboard-v2 \
        @solana/web3.js \
        @project-serum/anchor@^0.25.0 \
        @project-serum/borsh \
        bn.js
yarn add -D \
        @switchboard-xyz/switchboardv2-cli \
        anchor-client-gen \
        @types/bn.js
```

## Next: [#2 Initial Program Scaffolding](./2_initial_program_scaffolding.md)
