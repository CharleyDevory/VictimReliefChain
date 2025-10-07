import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 401;
const ERR_INSUFFICIENT_FUNDS = 407;
const ERR_POOL_ALREADY_EXISTS = 408;
const ERR_POOL_NOT_FOUND = 409;
const ERR_INVALID_POOL_ID = 410;
const ERR_INVALID_AMOUNT = 411;
const ERR_INVALID_DURATION = 412;
const ERR_INVALID_FEE_RATE = 413;
const ERR_INVALID_THRESHOLD = 414;
const ERR_INVALID_TIMESTAMP = 415;
const ERR_AUTHORITY_NOT_VERIFIED = 416;
const ERR_INVALID_MIN_DONATION = 417;
const ERR_INVALID_MAX_DONATION = 418;
const ERR_POOL_UPDATE_NOT_ALLOWED = 419;
const ERR_INVALID_UPDATE_PARAM = 420;
const ERR_MAX_POOLS_EXCEEDED = 421;
const ERR_INVALID_POOL_TYPE = 422;
const ERR_INVALID_LOCATION = 423;
const ERR_INVALID_CURRENCY = 424;
const ERR_INVALID_STATUS = 425;

interface Pool {
  id: string;
  totalFunds: number;
  donors: number;
  minDonation: number;
  maxDonation: number;
  duration: number;
  feeRate: number;
  threshold: number;
  timestamp: number;
  creator: string;
  poolType: string;
  location: string;
  currency: string;
  status: boolean;
}

interface PoolUpdate {
  updateId: string;
  updateMinDonation: number;
  updateMaxDonation: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class DonationPoolMock {
  state: {
    nextPoolId: number;
    maxPools: number;
    creationFee: number;
    authorityContract: string | null;
    pools: Map<number, Pool>;
    poolUpdates: Map<number, PoolUpdate>;
    poolsById: Map<string, number>;
  } = {
    nextPoolId: 0,
    maxPools: 1000,
    creationFee: 1000,
    authorityContract: null,
    pools: new Map(),
    poolUpdates: new Map(),
    poolsById: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextPoolId: 0,
      maxPools: 1000,
      creationFee: 1000,
      authorityContract: null,
      pools: new Map(),
      poolUpdates: new Map(),
      poolsById: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  createPool(
    poolId: string,
    minDonation: number,
    maxDonation: number,
    duration: number,
    feeRate: number,
    threshold: number,
    poolType: string,
    location: string,
    currency: string
  ): Result<number> {
    if (this.state.nextPoolId >= this.state.maxPools) return { ok: false, value: ERR_MAX_POOLS_EXCEEDED };
    if (!poolId || poolId.length > 32) return { ok: false, value: ERR_INVALID_POOL_ID };
    if (minDonation <= 0) return { ok: false, value: ERR_INVALID_MIN_DONATION };
    if (maxDonation <= 0) return { ok: false, value: ERR_INVALID_MAX_DONATION };
    if (duration <= 0) return { ok: false, value: ERR_INVALID_DURATION };
    if (feeRate > 100) return { ok: false, value: ERR_INVALID_FEE_RATE };
    if (threshold <= 0 || threshold > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (!["disaster", "medical", "community"].includes(poolType)) return { ok: false, value: ERR_INVALID_POOL_TYPE };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.poolsById.has(poolId)) return { ok: false, value: ERR_POOL_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextPoolId;
    const pool: Pool = {
      id: poolId,
      totalFunds: 0,
      donors: 0,
      minDonation,
      maxDonation,
      duration,
      feeRate,
      threshold,
      timestamp: this.blockHeight,
      creator: this.caller,
      poolType,
      location,
      currency,
      status: true,
    };
    this.state.pools.set(id, pool);
    this.state.poolsById.set(poolId, id);
    this.state.nextPoolId++;
    return { ok: true, value: id };
  }

  getPool(pid: number): Pool | null {
    return this.state.pools.get(pid) || null;
  }

  donate(amount: number, pid: number): Result<boolean> {
    const pool = this.state.pools.get(pid);
    if (!pool) return { ok: false, value: false };
    if (!pool.status) return { ok: false, value: false };
    if (amount < pool.minDonation) return { ok: false, value: false };
    if (amount > pool.maxDonation) return { ok: false, value: false };

    const updated: Pool = {
      ...pool,
      totalFunds: pool.totalFunds + amount,
      donors: pool.donors + 1,
    };
    this.state.pools.set(pid, updated);
    return { ok: true, value: true };
  }

  updatePool(pid: number, updateId: string, updateMinDonation: number, updateMaxDonation: number): Result<boolean> {
    const pool = this.state.pools.get(pid);
    if (!pool) return { ok: false, value: false };
    if (pool.creator !== this.caller) return { ok: false, value: false };
    if (!updateId || updateId.length > 32) return { ok: false, value: false };
    if (updateMinDonation <= 0) return { ok: false, value: false };
    if (updateMaxDonation <= 0) return { ok: false, value: false };
    if (this.state.poolsById.has(updateId) && this.state.poolsById.get(updateId) !== pid) {
      return { ok: false, value: false };
    }

    const updated: Pool = {
      ...pool,
      id: updateId,
      minDonation: updateMinDonation,
      maxDonation: updateMaxDonation,
      timestamp: this.blockHeight,
    };
    this.state.pools.set(pid, updated);
    this.state.poolsById.delete(pool.id);
    this.state.poolsById.set(updateId, pid);
    this.state.poolUpdates.set(pid, {
      updateId,
      updateMinDonation,
      updateMaxDonation,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getPoolCount(): Result<number> {
    return { ok: true, value: this.state.nextPoolId };
  }

  checkPoolExistence(poolId: string): Result<boolean> {
    return { ok: true, value: this.state.poolsById.has(poolId) };
  }

  getPoolInfo(pid: number): Result<Pool | null> {
    return { ok: true, value: this.state.pools.get(pid) || null };
  }
}

describe("DonationPool", () => {
  let contract: DonationPoolMock;

  beforeEach(() => {
    contract = new DonationPoolMock();
    contract.reset();
  });

  it("creates a pool successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPool(
      "PoolA",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const pool = contract.getPool(0);
    expect(pool?.id).toBe("PoolA");
    expect(pool?.minDonation).toBe(50);
    expect(pool?.maxDonation).toBe(1000);
    expect(pool?.duration).toBe(30);
    expect(pool?.feeRate).toBe(5);
    expect(pool?.threshold).toBe(50);
    expect(pool?.poolType).toBe("disaster");
    expect(pool?.location).toBe("CityX");
    expect(pool?.currency).toBe("STX");
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate pool ids", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      "PoolA",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    const result = contract.createPool(
      "PoolA",
      100,
      2000,
      60,
      10,
      60,
      "medical",
      "TownY",
      "USD"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_POOL_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const result = contract.createPool(
      "PoolB",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("parses pool id with Clarity", () => {
    const cv = stringAsciiCV("PoolC");
    expect(cv.value).toBe("PoolC");
  });

  it("rejects pool creation without authority contract", () => {
    const result = contract.createPool(
      "NoAuth",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid min donation", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPool(
      "InvalidMin",
      0,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MIN_DONATION);
  });

  it("rejects invalid pool type", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPool(
      "InvalidType",
      50,
      1000,
      30,
      5,
      50,
      "invalid",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_POOL_TYPE);
  });

  it("updates a pool successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      "OldPool",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    const result = contract.updatePool(0, "NewPool", 100, 2000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const pool = contract.getPool(0);
    expect(pool?.id).toBe("NewPool");
    expect(pool?.minDonation).toBe(100);
    expect(pool?.maxDonation).toBe(2000);
    const update = contract.state.poolUpdates.get(0);
    expect(update?.updateId).toBe("NewPool");
    expect(update?.updateMinDonation).toBe(100);
    expect(update?.updateMaxDonation).toBe(2000);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent pool", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updatePool(99, "NewPool", 100, 2000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      "TestPool",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    contract.caller = "ST3FAKE";
    const result = contract.updatePool(0, "NewPool", 100, 2000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(2000);
    contract.createPool(
      "TestPool",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    expect(contract.stxTransfers).toEqual([{ amount: 2000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects creation fee change without authority contract", () => {
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct pool count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      "Pool1",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    contract.createPool(
      "Pool2",
      100,
      2000,
      60,
      10,
      60,
      "medical",
      "TownY",
      "USD"
    );
    const result = contract.getPoolCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks pool existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      "TestPool",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    const result = contract.checkPoolExistence("TestPool");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkPoolExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("parses pool parameters with Clarity types", () => {
    const id = stringAsciiCV("TestPool");
    const minDonation = uintCV(50);
    const maxDonation = uintCV(1000);
    expect(id.value).toBe("TestPool");
    expect(minDonation.value).toEqual(BigInt(50));
    expect(maxDonation.value).toEqual(BigInt(1000));
  });

  it("rejects pool creation with empty id", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPool(
      "",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_POOL_ID);
  });

  it("rejects pool creation with max pools exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxPools = 1;
    contract.createPool(
      "Pool1",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    const result = contract.createPool(
      "Pool2",
      100,
      2000,
      60,
      10,
      60,
      "medical",
      "TownY",
      "USD"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_POOLS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("donates successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      "TestPool",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    const result = contract.donate(100, 0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const pool = contract.getPool(0);
    expect(pool?.totalFunds).toBe(100);
    expect(pool?.donors).toBe(1);
  });

  it("rejects donation below min", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      "TestPool",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    const result = contract.donate(40, 0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects donation to non-existent pool", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.donate(100, 99);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("gets pool info correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      "TestPool",
      50,
      1000,
      30,
      5,
      50,
      "disaster",
      "CityX",
      "STX"
    );
    const result = contract.getPoolInfo(0);
    expect(result.ok).toBe(true);
    expect(result.value?.id).toBe("TestPool");
  });
});