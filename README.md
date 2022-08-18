# Switchboard VRF Demo

This repo contains a step-by-step walkthrough to integrate Switchboard's VRF in
a brand new anchor program.

You can checkout each step of the walkthrough with the command, wherethe tag is
the step # in the table of contents below.

```bash
git checkout tags/0 -b main
```

Table of Contents

- [#0 Anchor Init](/00_walkthrough/0_anchor_init.md)
- [#1 Add Dependencies](/00_walkthrough/1_add_dependencies.md)
- [#2 Initial Program Scaffolding](/00_walkthrough/2_initial_program_scaffolding.md)
- [#3 Setup Switchboard Environment](/00_walkthrough/3_setup_switchboard_environment.md)
- [#4 Add init_client Instruction](/00_walkthrough/4_add_init_client_instruction.md)
- [#5 Add request_randomness Instruction](/00_walkthrough/5_add_request_randomness_instruction.md)
- [#6 Add consume_randomness Instruction](/00_walkthrough/6_add_consume_randomness_instruction.md)
- [#7 anchor-client-gen](/00_walkthrough/7_anchor_client_gen.md)
- [#8 Deployment Instructions](/00_walkthrough/8_deployment_instructions.md)
- [#9 More Info](/00_walkthrough/9_more_info.md)

## Background

[VRF Demo Presentation](https://docs.google.com/presentation/d/1DkOWp7_168_QUpTir7sxBLsNyYdA5_rpuskgfXyzjLY/edit#slide=id.g13ffaf30812_0_65)

Switchboard's Verifiable Randomness Function (VRF) allows a user to request an
oracle to produce a randomness output on-chain. Once the oracle has responded,
the VRF proof must be verified before using it. The VRF proof takes 276
instructions (~40 transactions) to fully verify on-chain. Once the proof is
verified, the Switchboard program will execute the callback defined by the VRF
Account during account creation.

## Client Program

Our client program will be very basic. It will initialize a state account to
hold our randomness result. It will then request randomness from our Switchboard
oracle. Once verified, the Switchboard program will call the consume_randomness
instruction which will update our client's state.

So the full flow will look like this,

- derive our client program derived address, `vrfClientKey`
- create a Switchboard VRF Account with `vrfClientKey` as the authority. This
  will allow the client program to sign and request randomness.
- invoke `init_client` for our `vrfClientKey` with our VRF Account
- invoke `request_randomness`, which will assign an oracle to our VRF request
- oracle watches the chain then responds to our VRF request with the proof
  calculated using its secret key
- oracle executes the 276 instructions to verify the VRF proof
- when VRF proof is verified, the Switchboard program will invoke our client
  program's `consume_randomness` instruction
- Done!
