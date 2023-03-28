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
anchor-lang = "~0.27.0"
anchor-spl = "~0.27.0"
solana-program = "~1.14.0"
switchboard-v2 = "^0.1.23"
bytemuck = "1.7.2"
```

Install npm packages

```bash
yarn add \
        @switchboard-xyz/solana.js^2.1.4 \
        @solana/web3.js \
        @coral-xyz/anchor@^0.27.0 \
        @coral-xyz/borsh^0.27.0 \
        bn.js
yarn add -D \
        @switchboard-xyz/cli@^2 \
        @switchboard-xyz/oracle \
        anchor-client-gen \
        @types/bn.js \
        shx
```

## Next: [#2 Initial Program Scaffolding](./2_initial_program_scaffolding.md)
