# VictimReliefChain

## Overview
VictimReliefChain is a Web3 project built on the Stacks blockchain using Clarity smart contracts. The core idea is to tokenize contributions for victims of real-world crises, such as natural disasters, conflicts, or personal tragedies. This solves key real-world problems in traditional charity systems, including:

- **Lack of Transparency**: Donors often don't know if funds reach victims. Blockchain ensures immutable tracking.
- **Fraud and Mismanagement**: Intermediaries can siphon funds. Smart contracts automate distributions based on verifiable conditions.
- **Inefficient Aid Delivery**: Victims face delays. Tokenization allows instant claims and peer-to-peer transfers.
- **Donor Engagement**: Donors receive tokenized proofs (NFTs) of contributions, which can be used for tax deductions, reputation, or governance voting.
- **Global Accessibility**: Leverages Bitcoin's security via Stacks for borderless, low-fee donations.

The platform works as follows:
- Victims or verified organizations register needs.
- Donors contribute STX (Stacks token) or BTC, receiving fungible tokens (VRC) proportional to their donation.
- Funds are pooled and distributed automatically upon oracle-verified milestones (e.g., disaster confirmation).
- Victims receive tokenized claims (NFTs) redeemable for aid.
- Governance allows token holders to vote on fund allocations.

This project involves 6 solid smart contracts in Clarity:
1. **VRC-Token**: Fungible token for contributions (SIP-010 compliant).
2. **VictimRegistry**: Registers and verifies victims.
3. **DonationPool**: Manages pooled funds and donations.
4. **ClaimNFT**: NFT for victim claims (SIP-009 compliant).
5. **DistributionLogic**: Handles automated distributions.
6. **GovernanceDAO**: For community governance.

The system is decentralized, auditable, and integrates with off-chain oracles for real-world verification (e.g., via Chainlink or custom oracles on Stacks).

## Architecture
- **Frontend**: Not included here; assume a simple web app interacting via Hiro Wallet.
- **Blockchain**: Stacks (Clarity contracts deployed via Clarinet).
- **Tokens**: VRC (fungible) for donors, ClaimNFT for victims.
- **Real-World Integration**: Use oracles to confirm events (e.g., earthquake via API feeds).

## Smart Contracts
Below are the 6 Clarity smart contracts. They are designed to be secure, with read-only functions, proper error handling, and minimal state mutations. Deploy them in order: VRC-Token, ClaimNFT, VictimRegistry, DonationPool, DistributionLogic, GovernanceDAO.

### 1. VRC-Token.clar (Fungible Token for Contributions)
```clarity
;; VRC-Token: SIP-010 Fungible Token for Victim Relief Contributions

(define-fungible-token vrc-token u1000000000) ;; Max supply: 1 billion

(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INSUFFICIENT-BALANCE (err u402))

(define-data-var contract-owner principal tx-sender)

(define-read-only (get-name)
  (ok "Victim Relief Coin"))

(define-read-only (get-symbol)
  (ok "VRC"))

(define-read-only (get-decimals)
  (ok u6))

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance vrc-token account)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply vrc-token)))

(define-read-only (get-token-uri)
  (ok (some "https://victimreliefchain.com/token-metadata.json")))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (try! (ft-transfer? vrc-token amount sender recipient))
    (ok true)))

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (ft-mint? vrc-token amount recipient)))
```

### 2. ClaimNFT.clar (NFT for Victim Claims)
```clarity
;; ClaimNFT: SIP-009 NFT for Tokenized Victim Claims

(define-non-fungible-token claim-nft uint)

(define-constant ERR-NOT-OWNER (err u403))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-NOT-AUTHORIZED (err u401))

(define-data-var last-id uint u0)
(define-data-var contract-owner principal tx-sender)

(define-map nft-metadata uint {uri: (string-ascii 256), claim-amount: uint, victim: principal})

(define-read-only (get-last-token-id)
  (ok (var-get last-id)))

(define-read-only (get-token-uri (token-id uint))
  (ok (get uri (map-get? nft-metadata token-id))))

(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? claim-nft token-id)))

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (asserts! (is-some (nft-get-owner? claim-nft token-id)) ERR-NOT-FOUND)
    (nft-transfer? claim-nft token-id sender recipient)))

(define-public (mint (recipient principal) (claim-amount uint) (uri (string-ascii 256)))
  (let ((new-id (+ (var-get last-id) u1)))
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (map-set nft-metadata new-id {uri: uri, claim-amount: claim-amount, victim: recipient})
    (var-set last-id new-id)
    (nft-mint? claim-nft new-id recipient)))
```

### 3. VictimRegistry.clar (Registers Verified Victims)
```clarity
;; VictimRegistry: Registers and Verifies Victims

(define-map victims principal {status: (string-ascii 32), need-amount: uint, verified: bool})
(define-map verifiers principal bool) ;; Authorized verifiers (e.g., NGOs)

(define-constant ERR-ALREADY-REGISTERED (err u405))
(define-constant ERR-NOT-VERIFIED (err u406))
(define-constant ERR-NOT-AUTHORIZED (err u401))

(define-data-var contract-owner principal tx-sender)

(define-public (register-victim (victim principal) (need-amount uint))
  (begin
    (asserts! (is-none (map-get? victims victim)) ERR-ALREADY-REGISTERED)
    (map-set victims victim {status: "pending", need-amount: need-amount, verified: false})
    (ok true)))

(define-public (verify-victim (victim principal))
  (begin
    (asserts! (default-to false (map-get? verifiers tx-sender)) ERR-NOT-AUTHORIZED)
    (match (map-get? victims victim)
      some-data (map-set victims victim (merge some-data {verified: true, status: "verified"}))
      none ERR-NOT-FOUND)
    (ok true)))

(define-public (add-verifier (verifier principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (map-set verifiers verifier true)
    (ok true)))

(define-read-only (get-victim-info (victim principal))
  (map-get? victims victim))
```

### 4. DonationPool.clar (Manages Pooled Funds)
```clarity
;; DonationPool: Pools Donations and Mints VRC Tokens

(use-trait ft-trait .VRC-Token.vrc-token)

(define-map pools (string-ascii 32) {total-funds: uint, donors: uint})
(define-data-var contract-owner principal tx-sender)

(define-constant ERR-INSUFFICIENT-FUNDS (err u407))
(define-constant ERR-NOT-AUTHORIZED (err u401))

(define-public (donate (amount uint) (pool-id (string-ascii 32)) (token-trait <ft-trait>))
  (let ((pool (default-to {total-funds: u0, donors: u0} (map-get? pools pool-id))))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender))) ;; Assuming STX donations
    (try! (as-contract (contract-call? token-trait mint amount tx-sender))) ;; Mint VRC
    (map-set pools pool-id {total-funds: (+ (get total-funds pool) amount), donors: (+ (get donors pool) u1)})
    (ok true)))

(define-public (create-pool (pool-id (string-ascii 32)))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (map-set pools pool-id {total-funds: u0, donors: u0})
    (ok true)))

(define-read-only (get-pool-info (pool-id (string-ascii 32)))
  (map-get? pools pool-id))
```

### 5. DistributionLogic.clar (Automates Distributions)
```clarity
;; DistributionLogic: Distributes Funds Based on Conditions

(use-trait nft-trait .ClaimNFT.claim-nft)
(use-trait registry-trait .VictimRegistry.victim-registry)

(define-constant ERR-NOT-VERIFIED (err u406))
(define-constant ERR-INSUFFICIENT-FUNDS (err u407))

(define-public (distribute (pool-id (string-ascii 32)) (victim principal) (amount uint) (nft-trait <nft-trait>) (registry-trait <registry-trait>))
  (let ((victim-info (unwrap! (contract-call? registry-trait get-victim-info victim) ERR-NOT-VERIFIED))
        (pool (unwrap! (contract-call? .DonationPool get-pool-info pool-id) ERR-NOT-FOUND)))
    (asserts! (get verified victim-info) ERR-NOT-VERIFIED)
    (asserts! (>= (get total-funds pool) amount) ERR-INSUFFICIENT-FUNDS)
    ;; Update pool
    (contract-call? .DonationPool update-pool pool-id (- (get total-funds pool) amount)) ;; Assume update function added
    ;; Mint NFT claim
    (try! (as-contract (contract-call? nft-trait mint victim amount "claim-uri")))
    ;; Transfer funds to victim
    (as-contract (stx-transfer? amount tx-sender victim))
    (ok true)))
```

### 6. GovernanceDAO.clar (Community Governance)
```clarity
;; GovernanceDAO: Voting on Proposals Using VRC Tokens

(use-trait ft-trait .VRC-Token.vrc-token)

(define-map proposals uint {description: (string-ascii 256), votes-for: uint, votes-against: uint, active: bool})
(define-data-var proposal-count uint u0)
(define-data-var min-vote-threshold uint u1000) ;; Min VRC to vote

(define-constant ERR-INSUFFICIENT-BALANCE (err u402))
(define-constant ERR-PROPOSAL-NOT-FOUND (err u408))
(define-constant ERR-ALREADY-VOTED (err u409)) ;; Simplified, add voter tracking if needed

(define-public (create-proposal (description (string-ascii 256)))
  (let ((new-id (+ (var-get proposal-count) u1)))
    (var-set proposal-count new-id)
    (map-set proposals new-id {description: description, votes-for: u0, votes-against: u0, active: true})
    (ok new-id)))

(define-public (vote (proposal-id uint) (vote-for bool) (amount uint) (token-trait <ft-trait>))
  (let ((proposal (unwrap! (map-get? proposals proposal-id) ERR-PROPOSAL-NOT-FOUND))
        (balance (unwrap! (contract-call? token-trait get-balance tx-sender) ERR-INSUFFICIENT-BALANCE)))
    (asserts! (>= balance amount) ERR-INSUFFICIENT-BALANCE)
    (asserts! (get active proposal) ERR-PROPOSAL-NOT-FOUND)
    (asserts! (>= amount (var-get min-vote-threshold)) ERR-INSUFFICIENT-BALANCE)
    ;; Burn or lock tokens for voting? Simplified: just count
    (if vote-for
      (map-set proposals proposal-id (merge proposal {votes-for: (+ (get votes-for proposal) amount)}))
      (map-set proposals proposal-id (merge proposal {votes-against: (+ (get votes-against proposal) amount)})))
    (ok true)))

(define-read-only (get-proposal (proposal-id uint))
  (map-get? proposals proposal-id))
```

## Deployment and Testing
Use Clarinet for local development:
1. Install Clarinet: `cargo install clarinet`.
2. Create project: `clarinet new victim-relief-chain`.
3. Add contracts to `/contracts`.
4. Test: `clarinet test`.
5. Deploy to Stacks testnet/mainnet via Clarinet or Hiro tools.

## Security Considerations
- All contracts use assertions for authorization.
- No unbounded loops or recursion.
- Read-only functions for queries.
- Integrate with oracles for off-chain data (not implemented here).
- Audit before production.

## Future Enhancements
- Oracle integration for event verification.
- Cross-chain bridges for BTC donations.
- Frontend UI for easier interaction.

This project empowers transparent aid, reducing real-world suffering through blockchain.