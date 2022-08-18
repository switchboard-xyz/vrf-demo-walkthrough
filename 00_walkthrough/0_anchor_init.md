# Anchor Init

```bash
$ git checkout tags/0 -b main
```

Let's create a new anchor project and setup the directory

```bash
anchor init vrf-client
cd vrf-client
rm -rf app migrations
```

We'll need to update our program ID to our unique deploy keypair. First build
the example program to generate the target directory and deploy keypair. Then
grab your program ID and update `Anchor.toml` and
`programs/vrf-client/src/lib.rs`.

```bash
$ anchor build
$ solana-keygen pubkey target/deploy/vrf_client-keypair.json
D79gSNtjonBFmDfc4zznoYaJHPwGTb35zHQ1EPUPsxxp
```

## Next: [#1 Add Dependencies](./1_add_dependencies.md)
