(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-MAX-RECIPIENTS u101)
(define-constant ERR-INVALID-DISTRIB-AMOUNT u102)
(define-constant ERR-INVALID-CYCLE-DUR u103)
(define-constant ERR-INVALID-PENALTY-RATE u104)
(define-constant ERR-INVALID-VOTING-THRESHOLD u105)
(define-constant ERR-DISTRIB-ALREADY-EXISTS u106)
(define-constant ERR-DISTRIB-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-DISTRIB u110)
(define-constant ERR-INVALID-MAX-AID u111)
(define-constant ERR-DISTRIB-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-DISTIBS-EXCEEDED u114)
(define-constant ERR-INVALID-DISTRIB-TYPE u115)
(define-constant ERR-INVALID-INTEREST-RATE u116)
(define-constant ERR-INVALID-GRACE-PERIOD u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CURRENCY u119)
(define-constant ERR-INVALID-STATUS u120)
(define-constant ERR-NOT-VERIFIED u121)
(define-constant ERR-INSUFFICIENT-FUNDS u122)
(define-constant ERR-ORACLE-NOT-SET u123)
(define-constant ERR-INVALID-ORACLE u124)
(define-constant ERR-DISTRIBUTION-LOCKED u125)
(define-constant ERR-INVALID-RECIPIENT u126)
(define-constant ERR-ALREADY-DISTRIBUTED u127)
(define-constant ERR-VOTING-NOT-PASSED u128)
(define-constant ERR-INVALID-POOL-ID u129)
(define-constant ERR-CLAIM-ALREADY-MINTED u130)

(define-data-var next-distrib-id uint u0)
(define-data-var max-distribs uint u1000)
(define-data-var creation-fee uint u1000)
(define-data-var authority-contract (optional principal) none)
(define-data-var oracle-principal (optional principal) none)

(define-map distribs
  uint
  {
    name: (string-utf8 100),
    max-recipients: uint,
    distrib-amount: uint,
    cycle-duration: uint,
    penalty-rate: uint,
    voting-threshold: uint,
    timestamp: uint,
    creator: principal,
    distrib-type: (string-utf8 50),
    interest-rate: uint,
    grace-period: uint,
    location: (string-utf8 100),
    currency: (string-utf8 20),
    status: bool,
    min-distrib: uint,
    max-aid: uint,
    pool-id: (string-ascii 32),
    total-distributed: uint,
    locked: bool
  }
)

(define-map distribs-by-name
  (string-utf8 100)
  uint)

(define-map distrib-updates
  uint
  {
    update-name: (string-utf8 100),
    update-max-recipients: uint,
    update-distrib-amount: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-map distribution-history
  uint
  (list 100 {recipient: principal, amount: uint, timestamp: uint})
)

(define-map votes
  uint
  {votes-for: uint, votes-against: uint, voters: (list 100 principal)}
)

(define-read-only (get-distrib (id uint))
  (map-get? distribs id)
)

(define-read-only (get-distrib-updates (id uint))
  (map-get? distrib-updates id)
)

(define-read-only (is-distrib-registered (name (string-utf8 100)))
  (is-some (map-get? distribs-by-name name))
)

(define-read-only (get-distribution-history (id uint))
  (map-get? distribution-history id)
)

(define-read-only (get-votes (id uint))
  (map-get? votes id)
)

(define-private (validate-name (name (string-utf8 100)))
  (if (and (> (len name) u0) (<= (len name) u100))
      (ok true)
      (err ERR-INVALID-UPDATE-PARAM))
)

(define-private (validate-max-recipients (recipients uint))
  (if (and (> recipients u0) (<= recipients u50))
      (ok true)
      (err ERR-INVALID-MAX-RECIPIENTS))
)

(define-private (validate-distrib-amount (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-DISTRIB-AMOUNT))
)

(define-private (validate-cycle-duration (duration uint))
  (if (> duration u0)
      (ok true)
      (err ERR-INVALID-CYCLE-DUR))
)

(define-private (validate-penalty-rate (rate uint))
  (if (<= rate u100)
      (ok true)
      (err ERR-INVALID-PENALTY-RATE))
)

(define-private (validate-voting-threshold (threshold uint))
  (if (and (> threshold u0) (<= threshold u100))
      (ok true)
      (err ERR-INVALID-VOTING-THRESHOLD))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-distrib-type (type (string-utf8 50)))
  (if (or (is-eq type u"disaster") (is-eq type u"conflict") (is-eq type u"personal"))
      (ok true)
      (err ERR-INVALID-DISTRIB-TYPE))
)

(define-private (validate-interest-rate (rate uint))
  (if (<= rate u20)
      (ok true)
      (err ERR-INVALID-INTEREST-RATE))
)

(define-private (validate-grace-period (period uint))
  (if (<= period u30)
      (ok true)
      (err ERR-INVALID-GRACE-PERIOD))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur u"STX") (is-eq cur u"USD") (is-eq cur u"BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-min-distrib (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-DISTRIB))
)

(define-private (validate-max-aid (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-AID))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p tx-sender))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-private (validate-pool-id (pool-id (string-ascii 32)))
  (if (> (len pool-id) u0)
      (ok true)
      (err ERR-INVALID-POOL-ID))
)

(define-private (validate-recipient (recipient principal))
  (if (is-principal recipient)
      (ok true)
      (err ERR-INVALID-RECIPIENT))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-oracle-principal (oracle principal))
  (begin
    (asserts! (is-eq tx-sender (unwrap! (var-get authority-contract) (err ERR-AUTHORITY-NOT-VERIFIED))) (err ERR-NOT-AUTHORIZED))
    (var-set oracle-principal (some oracle))
    (ok true)
  )
)

(define-public (set-max-distribs (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-DISTIBS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-distribs new-max)
    (ok true)
  )
)

(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set creation-fee new-fee)
    (ok true)
  )
)

(define-public (create-distrib
  (distrib-name (string-utf8 100))
  (max-recipients uint)
  (distrib-amount uint)
  (cycle-duration uint)
  (penalty-rate uint)
  (voting-threshold uint)
  (distrib-type (string-utf8 50))
  (interest-rate uint)
  (grace-period uint)
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (min-distrib uint)
  (max-aid uint)
  (pool-id (string-ascii 32))
)
  (let (
        (next-id (var-get next-distrib-id))
        (current-max (var-get max-distribs))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-DISTIBS-EXCEEDED))
    (try! (validate-name distrib-name))
    (try! (validate-max-recipients max-recipients))
    (try! (validate-distrib-amount distrib-amount))
    (try! (validate-cycle-duration cycle-duration))
    (try! (validate-penalty-rate penalty-rate))
    (try! (validate-voting-threshold voting-threshold))
    (try! (validate-distrib-type distrib-type))
    (try! (validate-interest-rate interest-rate))
    (try! (validate-grace-period grace-period))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-min-distrib min-distrib))
    (try! (validate-max-aid max-aid))
    (try! (validate-pool-id pool-id))
    (asserts! (is-none (map-get? distribs-by-name distrib-name)) (err ERR-DISTRIB-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (map-set distribs next-id
      {
        name: distrib-name,
        max-recipients: max-recipients,
        distrib-amount: distrib-amount,
        cycle-duration: cycle-duration,
        penalty-rate: penalty-rate,
        voting-threshold: voting-threshold,
        timestamp: block-height,
        creator: tx-sender,
        distrib-type: distrib-type,
        interest-rate: interest-rate,
        grace-period: grace-period,
        location: location,
        currency: currency,
        status: true,
        min-distrib: min-distrib,
        max-aid: max-aid,
        pool-id: pool-id,
        total-distributed: u0,
        locked: false
      }
    )
    (map-set distribs-by-name distrib-name next-id)
    (map-set votes next-id {votes-for: u0, votes-against: u0, voters: (list)})
    (var-set next-distrib-id (+ next-id u1))
    (print { event: "distrib-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-distrib
  (distrib-id uint)
  (update-name (string-utf8 100))
  (update-max-recipients uint)
  (update-distrib-amount uint)
)
  (let ((distrib (map-get? distribs distrib-id)))
    (match distrib
      d
        (begin
          (asserts! (is-eq (get creator d) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-name update-name))
          (try! (validate-max-recipients update-max-recipients))
          (try! (validate-distrib-amount update-distrib-amount))
          (let ((existing (map-get? distribs-by-name update-name)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id distrib-id) (err ERR-DISTRIB-ALREADY-EXISTS))
              (begin true)
            )
          )
          (let ((old-name (get name d)))
            (if (is-eq old-name update-name)
                (ok true)
                (begin
                  (map-delete distribs-by-name old-name)
                  (map-set distribs-by-name update-name distrib-id)
                  (ok true)
                )
            )
          )
          (map-set distribs distrib-id
            {
              name: update-name,
              max-recipients: update-max-recipients,
              distrib-amount: update-distrib-amount,
              cycle-duration: (get cycle-duration d),
              penalty-rate: (get penalty-rate d),
              voting-threshold: (get voting-threshold d),
              timestamp: block-height,
              creator: (get creator d),
              distrib-type: (get distrib-type d),
              interest-rate: (get interest-rate d),
              grace-period: (get grace-period d),
              location: (get location d),
              currency: (get currency d),
              status: (get status d),
              min-distrib: (get min-distrib d),
              max-aid: (get max-aid d),
              pool-id: (get pool-id d),
              total-distributed: (get total-distributed d),
              locked: (get locked d)
            }
          )
          (map-set distrib-updates distrib-id
            {
              update-name: update-name,
              update-max-recipients: update-max-recipients,
              update-distrib-amount: update-distrib-amount,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "distrib-updated", id: distrib-id })
          (ok true)
        )
      (err ERR-DISTRIB-NOT-FOUND)
    )
  )
)

(define-public (vote-on-distribution (distrib-id uint) (vote-for bool))
  (let ((distrib (unwrap! (map-get? distribs distrib-id) (err ERR-DISTRIB-NOT-FOUND)))
        (vote-data (default-to {votes-for: u0, votes-against: u0, voters: (list)} (map-get? votes distrib-id))))
    (asserts! (not (is-some (index-of (get voters vote-data) tx-sender))) (err ERR-ALREADY-DISTRIBUTED))
    (let ((new-votes-for (if vote-for (+ (get votes-for vote-data) u1) (get votes-for vote-data)))
          (new-votes-against (if (not vote-for) (+ (get votes-against vote-data) u1) (get votes-against vote-data)))
          (new-voters (unwrap-panic (as-max-len? (append (get voters vote-data) tx-sender) u100))))
      (map-set votes distrib-id {votes-for: new-votes-for, votes-against: new-votes-against, voters: new-voters})
      (ok true)
    )
  )
)

(define-public (lock-distribution (distrib-id uint))
  (let ((distrib (unwrap! (map-get? distribs distrib-id) (err ERR-DISTRIB-NOT-FOUND))))
    (asserts! (is-eq (get creator distrib) tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (get locked distrib)) (err ERR-DISTRIBUTION-LOCKED))
    (map-set distribs distrib-id (merge distrib {locked: true}))
    (ok true)
  )
)

(define-public (distribute-funds
  (distrib-id uint)
  (recipient principal)
  (amount uint)
)
  (let ((distrib (unwrap! (map-get? distribs distrib-id) (err ERR-DISTRIB-NOT-FOUND)))
        (vote-data (default-to {votes-for: u0, votes-against: u0, voters: (list)} (map-get? votes distrib-id)))
        (history (default-to (list) (map-get? distribution-history distrib-id)))
        (pool-id (get pool-id distrib)))
    (try! (validate-recipient recipient))
    (asserts! (>= (get votes-for vote-data) (get voting-threshold distrib)) (err ERR-VOTING-NOT-PASSED))
    (asserts! (not (get locked distrib)) (err ERR-DISTRIBUTION-LOCKED))
    (asserts! (>= amount (get min-distrib distrib)) (err ERR-INVALID-MIN-DISTRIB))
    (asserts! (<= amount (get max-aid distrib)) (err ERR-INVALID-MAX-AID))
    (asserts! (<= (+ (get total-distributed distrib) amount) (get distrib-amount distrib)) (err ERR-INSUFFICIENT-FUNDS))
    (let ((new-history-entry {recipient: recipient, amount: amount, timestamp: block-height}))
      (asserts! (is-none (fold check-duplicate history (some false))) (err ERR-ALREADY-DISTRIBUTED))
      (let ((new-history (unwrap-panic (as-max-len? (append history new-history-entry) u100))))
        (map-set distribution-history distrib-id new-history)
      )
    )
    (map-set distribs distrib-id (merge distrib {total-distributed: (+ (get total-distributed distrib) amount)}))
    (try! (as-contract (stx-transfer? amount tx-sender recipient)))
    (print { event: "funds-distributed", distrib-id: distrib-id, recipient: recipient, amount: amount })
    (ok true)
  )
)

(define-private (check-duplicate (entry {recipient: principal, amount: uint, timestamp: uint}) (acc (optional bool)))
  (if (is-eq (get recipient entry) recipient)
      (some true)
      acc)
)

(define-public (verify-with-oracle (distrib-id uint) (verified bool))
  (let ((oracle (unwrap! (var-get oracle-principal) (err ERR-ORACLE-NOT-SET))))
    (asserts! (is-eq tx-sender oracle) (err ERR-INVALID-ORACLE))
    (let ((distrib (unwrap! (map-get? distribs distrib-id) (err ERR-DISTRIB-NOT-FOUND))))
      (map-set distribs distrib-id (merge distrib {status: verified}))
      (ok true)
    )
  )
)

(define-public (get-distrib-count)
  (ok (var-get next-distrib-id))
)

(define-public (check-distrib-existence (name (string-utf8 100)))
  (ok (is-distrib-registered name))
)