# More Info

Congratulations! You've created your own Solana program to consume on-chain
(pseudo) randomness. This program is very basic so you'll definitely want to add
your own logic to make it more exciting.

## Adding Accounts to consume_randomness Instruction

Anytime you add/remove accounts from the consume_randomness instruction you will
need to update the VRF Account callback. Make sure the newly added accounts have
the correct isSigner and isWritable fields. Because the oracle will be invoking
this instruction you cannot use any accounts that must sign the transaction
since the oracle wont be able to sign on its behalf.

## More Resources

- [VRF Flip](https://github.com/switchboard-xyz/vrf-flip) - simulate a heads or
  tails coin toss using VRF. Incldues a full API, CLI, and frontend. Play the
  devnet demo [here](https://vrf-demo.switchboard.xyz/)!
- [Randomness Documentation](https://docs.switchboard.xyz/randomness)
