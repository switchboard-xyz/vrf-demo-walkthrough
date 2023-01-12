# Add Dependencies

```bash
$ git checkout tags/1
```

We'll be using the switchboard CLI. Install it if you haven't already

```bash
npm i -g @switchboard-xyz/cli@^2
```

In `programs/vrf-client/Cargo.toml` add the following lines

```toml
[dependencies]
anchor-lang = "~0.26.0"
anchor-spl = "~0.26.0"
solana-program = "^1.13.5"
switchboard-v2 = { version = "^0.1.20", features = ["devnet"] }
bytemuck = "1.7.2"
```

Install npm packages

```bash
yarn add \
        @switchboard-xyz/solana.js \
        @solana/web3.js \
        @project-serum/anchor@^0.26.0 \
        @project-serum/borsh \
        bn.js
yarn add -D \
        @switchboard-xyz/cli@^2 \
        anchor-client-gen \
        @types/bn.js
```

## Next: [#2 Initial Program Scaffolding](./2_initial_program_scaffolding.md)
