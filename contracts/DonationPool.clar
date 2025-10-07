(define-trait ft-trait
  ((mint (uint principal) (response bool uint))))

(define-constant ERR-NOT-AUTHORIZED u401)
(define-constant ERR-INSUFFICIENT-FUNDS u407)
(define-constant ERR-POOL-ALREADY-EXISTS u408)
(define-constant ERR-POOL-NOT-FOUND u409)
(define-constant ERR-INVALID-POOL-ID u410)
(define-constant ERR-INVALID-AMOUNT u411)
(define-constant ERR-INVALID-DURATION u412)
(define-constant ERR-INVALID-FEE-RATE u413)
(define-constant ERR-INVALID-THRESHOLD u414)
(define-constant ERR-INVALID-TIMESTAMP u415)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u416)
(define-constant ERR-INVALID-MIN-DONATION u417)
(define-constant ERR-INVALID-MAX-DONATION u418)
(define-constant ERR-POOL-UPDATE-NOT-ALLOWED u419)
(define-constant ERR-INVALID-UPDATE-PARAM u420)
(define-constant ERR-MAX-POOLS-EXCEEDED u421)
(define-constant ERR-INVALID-POOL-TYPE u422)
(define-constant ERR-INVALID-LOCATION u423)
(define-constant ERR-INVALID-CURRENCY u424)
(define-constant ERR-INVALID-STATUS u425)

(define-data-var next-pool-id uint u0)
(define-data-var max-pools uint u1000)
(define-data-var creation-fee uint u1000)
(define-data-var authority-contract (optional principal) none)

(define-map pools
  uint
  {
    id: (string-ascii 32),
    total-funds: uint,
    donors: uint,
    min-donation: uint,
    max-donation: uint,
    duration: uint,
    fee-rate: uint,
    threshold: uint,
    timestamp: uint,
    creator: principal,
    pool-type: (string-ascii 50),
    location: (string-ascii 100),
    currency: (string-ascii 20),
    status: bool
  }
)

(define-map pools-by-id
  (string-ascii 32)
  uint)

(define-map pool-updates
  uint
  {
    update-id: (string-ascii 32),
    update-min-donation: uint,
    update-max-donation: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-pool (pid uint))
  (map-get? pools pid)
)

(define-read-only (get-pool-updates (pid uint))
  (map-get? pool-updates pid)
)

(define-read-only (is-pool-registered (pool-id (string-ascii 32)))
  (is-some (map-get? pools-by-id pool-id))
)

(define-private (validate-pool-id (pool-id (string-ascii 32)))
  (if (and (> (len pool-id) u0) (<= (len pool-id) u32))
      (ok true)
      (err ERR-INVALID-POOL-ID))
)

(define-private (validate-amount (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-AMOUNT))
)

(define-private (validate-duration (duration uint))
  (if (> duration u0)
      (ok true)
      (err ERR-INVALID-DURATION))
)

(define-private (validate-fee-rate (rate uint))
  (if (<= rate u100)
      (ok true)
      (err ERR-INVALID-FEE-RATE))
)

(define-private (validate-threshold (threshold uint))
  (if (and (> threshold u0) (<= threshold u100))
      (ok true)
      (err ERR-INVALID-THRESHOLD))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-pool-type (ptype (string-ascii 50)))
  (if (or (is-eq ptype "disaster") (is-eq ptype "medical") (is-eq ptype "community"))
      (ok true)
      (err ERR-INVALID-POOL-TYPE))
)

(define-private (validate-location (loc (string-ascii 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-ascii 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-min-donation (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-DONATION))
)

(define-private (validate-max-donation (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-DONATION))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-pools (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-POOLS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-pools new-max)
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

(define-public (create-pool
  (pool-id (string-ascii 32))
  (min-donation uint)
  (max-donation uint)
  (duration uint)
  (fee-rate uint)
  (threshold uint)
  (pool-type (string-ascii 50))
  (location (string-ascii 100))
  (currency (string-ascii 20))
)
  (let (
        (next-id (var-get next-pool-id))
        (current-max (var-get max-pools))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-POOLS-EXCEEDED))
    (try! (validate-pool-id pool-id))
    (try! (validate-min-donation min-donation))
    (try! (validate-max-donation max-donation))
    (try! (validate-duration duration))
    (try! (validate-fee-rate fee-rate))
    (try! (validate-threshold threshold))
    (try! (validate-pool-type pool-type))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (asserts! (is-none (map-get? pools-by-id pool-id)) (err ERR-POOL-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (map-set pools next-id
      {
        id: pool-id,
        total-funds: u0,
        donors: u0,
        min-donation: min-donation,
        max-donation: max-donation,
        duration: duration,
        fee-rate: fee-rate,
        threshold: threshold,
        timestamp: block-height,
        creator: tx-sender,
        pool-type: pool-type,
        location: location,
        currency: currency,
        status: true
      }
    )
    (map-set pools-by-id pool-id next-id)
    (var-set next-pool-id (+ next-id u1))
    (print { event: "pool-created", id: next-id })
    (ok next-id)
  )
)

(define-public (donate (amount uint) (pid uint) (token-trait <ft-trait>))
  (let ((pool (unwrap! (map-get? pools pid) (err ERR-POOL-NOT-FOUND))))
    (asserts! (get status pool) (err ERR-INVALID-STATUS))
    (asserts! (>= amount (get min-donation pool)) (err ERR-INVALID-AMOUNT))
    (asserts! (<= amount (get max-donation pool)) (err ERR-INVALID-AMOUNT))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (try! (as-contract (contract-call? token-trait mint amount tx-sender)))
    (map-set pools pid
      (merge pool
        {
          total-funds: (+ (get total-funds pool) amount),
          donors: (+ (get donors pool) u1)
        }
      )
    )
    (print { event: "donation-made", pool-id: pid, amount: amount })
    (ok true)
  )
)

(define-public (update-pool
  (pid uint)
  (update-id (string-ascii 32))
  (update-min-donation uint)
  (update-max-donation uint)
)
  (let ((pool (map-get? pools pid)))
    (match pool
      p
        (begin
          (asserts! (is-eq (get creator p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-pool-id update-id))
          (try! (validate-min-donation update-min-donation))
          (try! (validate-max-donation update-max-donation))
          (let ((existing (map-get? pools-by-id update-id)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id pid) (err ERR-POOL-ALREADY-EXISTS))
              (begin true)
            )
          )
          (let ((old-id (get id p)))
            (if (is-eq old-id update-id)
                (ok true)
                (begin
                  (map-delete pools-by-id old-id)
                  (map-set pools-by-id update-id pid)
                  (ok true)
                )
            )
          )
          (map-set pools pid
            (merge p
              {
                id: update-id,
                min-donation: update-min-donation,
                max-donation: update-max-donation,
                timestamp: block-height
              }
            )
          )
          (map-set pool-updates pid
            {
              update-id: update-id,
              update-min-donation: update-min-donation,
              update-max-donation: update-max-donation,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "pool-updated", id: pid })
          (ok true)
        )
      (err ERR-POOL-NOT-FOUND)
    )
  )
)

(define-public (get-pool-count)
  (ok (var-get next-pool-id))
)

(define-public (check-pool-existence (pool-id (string-ascii 32)))
  (ok (is-pool-registered pool-id))
)

(define-read-only (get-pool-info (pid uint))
  (map-get? pools pid)
)