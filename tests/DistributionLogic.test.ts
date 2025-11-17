import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_MAX_RECIPIENTS = 101;
const ERR_INVALID_DISTRIB_AMOUNT = 102;
const ERR_INVALID_CYCLE_DUR = 103;
const ERR_INVALID_PENALTY_RATE = 104;
const ERR_INVALID_VOTING_THRESHOLD = 105;
const ERR_DISTRIB_ALREADY_EXISTS = 106;
const ERR_DISTRIB_NOT_FOUND = 107;
const ERR_INVALID_DISTRIB_TYPE = 115;
const ERR_INVALID_INTEREST_RATE = 116;
const ERR_INVALID_GRACE_PERIOD = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_CURRENCY = 119;
const ERR_INVALID_MIN_DISTRIB = 110;
const ERR_INVALID_MAX_AID = 111;
const ERR_MAX_DISTIBS_EXCEEDED = 114;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_AUTHORITY_NOT_VERIFIED = 109;
const ERR_DISTRIBUTION_LOCKED = 125;
const ERR_INVALID_RECIPIENT = 126;
const ERR_ALREADY_DISTRIBUTED = 127;
const ERR_VOTING_NOT_PASSED = 128;
const ERR_INVALID_POOL_ID = 129;

interface Distrib {
  name: string;
  maxRecipients: number;
  distribAmount: number;
  cycleDuration: number;
  penaltyRate: number;
  votingThreshold: number;
  timestamp: number;
  creator: string;
  distribType: string;
  interestRate: number;
  gracePeriod: number;
  location: string;
  currency: string;
  status: boolean;
  minDistrib: number;
  maxAid: number;
  poolId: string;
  totalDistributed: number;
  locked: boolean;
}

interface DistribUpdate {
  updateName: string;
  updateMaxRecipients: number;
  updateDistribAmount: number;
  updateTimestamp: number;
  updater: string;
}

interface DistributionHistoryEntry {
  recipient: string;
  amount: number;
  timestamp: number;
}

interface Votes {
  votesFor: number;
  votesAgainst: number;
  voters: string[];
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class DistributionLogicMock {
  state: {
    nextDistribId: number;
    maxDistribs: number;
    creationFee: number;
    authorityContract: string | null;
    oraclePrincipal: string | null;
    distribs: Map<number, Distrib>;
    distribUpdates: Map<number, DistribUpdate>;
    distribsByName: Map<string, number>;
    distributionHistory: Map<number, DistributionHistoryEntry[]>;
    votes: Map<number, Votes>;
  } = {
    nextDistribId: 0,
    maxDistribs: 1000,
    creationFee: 1000,
    authorityContract: null,
    oraclePrincipal: null,
    distribs: new Map(),
    distribUpdates: new Map(),
    distribsByName: new Map(),
    distributionHistory: new Map(),
    votes: new Map(),
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
      nextDistribId: 0,
      maxDistribs: 1000,
      creationFee: 1000,
      authorityContract: null,
      oraclePrincipal: null,
      distribs: new Map(),
      distribUpdates: new Map(),
      distribsByName: new Map(),
      distributionHistory: new Map(),
      votes: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === this.caller) {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setOraclePrincipal(oracle: string): Result<boolean> {
    if (this.caller !== this.state.authorityContract) {
      return { ok: false, value: false };
    }
    this.state.oraclePrincipal = oracle;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  createDistrib(
    name: string,
    maxRecipients: number,
    distribAmount: number,
    cycleDuration: number,
    penaltyRate: number,
    votingThreshold: number,
    distribType: string,
    interestRate: number,
    gracePeriod: number,
    location: string,
    currency: string,
    minDistrib: number,
    maxAid: number,
    poolId: string
  ): Result<number> {
    if (this.state.nextDistribId >= this.state.maxDistribs) return { ok: false, value: ERR_MAX_DISTIBS_EXCEEDED };
    if (!name || name.length > 100) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    if (maxRecipients <= 0 || maxRecipients > 50) return { ok: false, value: ERR_INVALID_MAX_RECIPIENTS };
    if (distribAmount <= 0) return { ok: false, value: ERR_INVALID_DISTRIB_AMOUNT };
    if (cycleDuration <= 0) return { ok: false, value: ERR_INVALID_CYCLE_DUR };
    if (penaltyRate > 100) return { ok: false, value: ERR_INVALID_PENALTY_RATE };
    if (votingThreshold <= 0 || votingThreshold > 100) return { ok: false, value: ERR_INVALID_VOTING_THRESHOLD };
    if (!["disaster", "conflict", "personal"].includes(distribType)) return { ok: false, value: ERR_INVALID_DISTRIB_TYPE };
    if (interestRate > 20) return { ok: false, value: ERR_INVALID_INTEREST_RATE };
    if (gracePeriod > 30) return { ok: false, value: ERR_INVALID_GRACE_PERIOD };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (minDistrib <= 0) return { ok: false, value: ERR_INVALID_MIN_DISTRIB };
    if (maxAid <= 0) return { ok: false, value: ERR_INVALID_MAX_AID };
    if (!poolId) return { ok: false, value: ERR_INVALID_POOL_ID };
    if (this.state.distribsByName.has(name)) return { ok: false, value: ERR_DISTRIB_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextDistribId;
    const distrib: Distrib = {
      name,
      maxRecipients,
      distribAmount,
      cycleDuration,
      penaltyRate,
      votingThreshold,
      timestamp: this.blockHeight,
      creator: this.caller,
      distribType,
      interestRate,
      gracePeriod,
      location,
      currency,
      status: true,
      minDistrib,
      maxAid,
      poolId,
      totalDistributed: 0,
      locked: false,
    };
    this.state.distribs.set(id, distrib);
    this.state.distribsByName.set(name, id);
    this.state.votes.set(id, { votesFor: 0, votesAgainst: 0, voters: [] });
    this.state.nextDistribId++;
    return { ok: true, value: id };
  }

  getDistrib(id: number): Distrib | null {
    return this.state.distribs.get(id) || null;
  }

  updateDistrib(id: number, updateName: string, updateMaxRecipients: number, updateDistribAmount: number): Result<boolean> {
    const distrib = this.state.distribs.get(id);
    if (!distrib) return { ok: false, value: false };
    if (distrib.creator !== this.caller) return { ok: false, value: false };
    if (!updateName || updateName.length > 100) return { ok: false, value: false };
    if (updateMaxRecipients <= 0 || updateMaxRecipients > 50) return { ok: false, value: false };
    if (updateDistribAmount <= 0) return { ok: false, value: false };
    if (this.state.distribsByName.has(updateName) && this.state.distribsByName.get(updateName) !== id) {
      return { ok: false, value: false };
    }

    const updated: Distrib = {
      ...distrib,
      name: updateName,
      maxRecipients: updateMaxRecipients,
      distribAmount: updateDistribAmount,
      timestamp: this.blockHeight,
    };
    this.state.distribs.set(id, updated);
    this.state.distribsByName.delete(distrib.name);
    this.state.distribsByName.set(updateName, id);
    this.state.distribUpdates.set(id, {
      updateName,
      updateMaxRecipients,
      updateDistribAmount,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  voteOnDistribution(id: number, voteFor: boolean): Result<boolean> {
    const distrib = this.state.distribs.get(id);
    if (!distrib) return { ok: false, value: false };
    const voteData = this.state.votes.get(id) || { votesFor: 0, votesAgainst: 0, voters: [] };
    if (voteData.voters.includes(this.caller)) return { ok: false, value: false };
    const newVotesFor = voteFor ? voteData.votesFor + 1 : voteData.votesFor;
    const newVotesAgainst = !voteFor ? voteData.votesAgainst + 1 : voteData.votesAgainst;
    const newVoters = [...voteData.voters, this.caller];
    this.state.votes.set(id, { votesFor: newVotesFor, votesAgainst: newVotesAgainst, voters: newVoters });
    return { ok: true, value: true };
  }

  lockDistribution(id: number): Result<boolean> {
    const distrib = this.state.distribs.get(id);
    if (!distrib) return { ok: false, value: false };
    if (distrib.creator !== this.caller) return { ok: false, value: false };
    if (distrib.locked) return { ok: false, value: false };
    this.state.distribs.set(id, { ...distrib, locked: true });
    return { ok: true, value: true };
  }

  distributeFunds(id: number, recipient: string, amount: number): Result<boolean> {
    const distrib = this.state.distribs.get(id);
    if (!distrib) return { ok: false, value: false };
    const voteData = this.state.votes.get(id) || { votesFor: 0, votesAgainst: 0, voters: [] };
    const history = this.state.distributionHistory.get(id) || [];
    if (voteData.votesFor < distrib.votingThreshold) return { ok: false, value: false };
    if (distrib.locked) return { ok: false, value: false };
    if (amount < distrib.minDistrib) return { ok: false, value: false };
    if (amount > distrib.maxAid) return { ok: false, value: false };
    if (distrib.totalDistributed + amount > distrib.distribAmount) return { ok: false, value: false };
    if (history.some(entry => entry.recipient === recipient)) return { ok: false, value: false };
    const newHistory = [...history, { recipient, amount, timestamp: this.blockHeight }];
    this.state.distributionHistory.set(id, newHistory);
    this.state.distribs.set(id, { ...distrib, totalDistributed: distrib.totalDistributed + amount });
    this.stxTransfers.push({ amount, from: this.caller, to: recipient });
    return { ok: true, value: true };
  }

  verifyWithOracle(id: number, verified: boolean): Result<boolean> {
    if (this.state.oraclePrincipal !== this.caller) return { ok: false, value: false };
    const distrib = this.state.distribs.get(id);
    if (!distrib) return { ok: false, value: false };
    this.state.distribs.set(id, { ...distrib, status: verified });
    return { ok: true, value: true };
  }

  getDistribCount(): Result<number> {
    return { ok: true, value: this.state.nextDistribId };
  }

  checkDistribExistence(name: string): Result<boolean> {
    return { ok: true, value: this.state.distribsByName.has(name) };
  }
}

describe("DistributionLogic", () => {
  let contract: DistributionLogicMock;

  beforeEach(() => {
    contract = new DistributionLogicMock();
    contract.reset();
  });

  it("creates a distrib successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createDistrib(
      "Alpha",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const distrib = contract.getDistrib(0);
    expect(distrib?.name).toBe("Alpha");
    expect(distrib?.maxRecipients).toBe(10);
    expect(distrib?.distribAmount).toBe(100);
    expect(distrib?.cycleDuration).toBe(30);
    expect(distrib?.penaltyRate).toBe(5);
    expect(distrib?.votingThreshold).toBe(50);
    expect(distrib?.distribType).toBe("disaster");
    expect(distrib?.interestRate).toBe(10);
    expect(distrib?.gracePeriod).toBe(7);
    expect(distrib?.location).toBe("VillageX");
    expect(distrib?.currency).toBe("STX");
    expect(distrib?.minDistrib).toBe(50);
    expect(distrib?.maxAid).toBe(1000);
    expect(distrib?.poolId).toBe("pool1");
    expect(distrib?.totalDistributed).toBe(0);
    expect(distrib?.locked).toBe(false);
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate distrib names", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "Alpha",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    const result = contract.createDistrib(
      "Alpha",
      20,
      200,
      60,
      10,
      60,
      "conflict",
      15,
      14,
      "CityY",
      "USD",
      100,
      2000,
      "pool2"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_DISTRIB_ALREADY_EXISTS);
  });

  it("rejects distrib creation without authority contract", () => {
    const result = contract.createDistrib(
      "NoAuth",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid max recipients", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createDistrib(
      "InvalidRecipients",
      51,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MAX_RECIPIENTS);
  });

  it("rejects invalid distrib amount", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createDistrib(
      "InvalidDistrib",
      10,
      0,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DISTRIB_AMOUNT);
  });

  it("rejects invalid distrib type", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createDistrib(
      "InvalidType",
      10,
      100,
      30,
      5,
      50,
      "invalid",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DISTRIB_TYPE);
  });

  it("updates a distrib successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "OldDistrib",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    const result = contract.updateDistrib(0, "NewDistrib", 15, 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const distrib = contract.getDistrib(0);
    expect(distrib?.name).toBe("NewDistrib");
    expect(distrib?.maxRecipients).toBe(15);
    expect(distrib?.distribAmount).toBe(200);
    const update = contract.state.distribUpdates.get(0);
    expect(update?.updateName).toBe("NewDistrib");
    expect(update?.updateMaxRecipients).toBe(15);
    expect(update?.updateDistribAmount).toBe(200);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent distrib", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateDistrib(99, "NewDistrib", 15, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateDistrib(0, "NewDistrib", 15, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(2000);
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    expect(contract.stxTransfers).toEqual([{ amount: 2000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects creation fee change without authority contract", () => {
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct distrib count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "Distrib1",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    contract.createDistrib(
      "Distrib2",
      15,
      200,
      60,
      10,
      60,
      "conflict",
      15,
      14,
      "CityY",
      "USD",
      100,
      2000,
      "pool2"
    );
    const result = contract.getDistribCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks distrib existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    const result = contract.checkDistribExistence("TestDistrib");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkDistribExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("parses distrib parameters with Clarity types", () => {
    const name = stringUtf8CV("TestDistrib");
    const maxRecipients = uintCV(10);
    const distribAmount = uintCV(100);
    expect(name.value).toBe("TestDistrib");
    expect(maxRecipients.value).toEqual(BigInt(10));
    expect(distribAmount.value).toEqual(BigInt(100));
  });

  it("rejects distrib creation with empty name", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createDistrib(
      "",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_UPDATE_PARAM);
  });

  it("rejects distrib creation with max distribs exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxDistribs = 1;
    contract.createDistrib(
      "Distrib1",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    const result = contract.createDistrib(
      "Distrib2",
      15,
      200,
      60,
      10,
      60,
      "conflict",
      15,
      14,
      "CityY",
      "USD",
      100,
      2000,
      "pool2"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_DISTIBS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("ST1TEST");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("votes on distribution successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    const result = contract.voteOnDistribution(0, true);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const votes = contract.state.votes.get(0);
    expect(votes?.votesFor).toBe(1);
    expect(votes?.votesAgainst).toBe(0);
    expect(votes?.voters).toEqual(["ST1TEST"]);
  });

  it("rejects duplicate vote", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    contract.voteOnDistribution(0, true);
    const result = contract.voteOnDistribution(0, false);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("locks distribution successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    const result = contract.lockDistribution(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const distrib = contract.getDistrib(0);
    expect(distrib?.locked).toBe(true);
  });

  it("rejects lock by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    contract.caller = "ST3FAKE";
    const result = contract.lockDistribution(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("distributes funds successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      1,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    contract.voteOnDistribution(0, true);
    const result = contract.distributeFunds(0, "ST4RECIP", 50);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const distrib = contract.getDistrib(0);
    expect(distrib?.totalDistributed).toBe(50);
    const history = contract.state.distributionHistory.get(0);
    expect(history).toEqual([{ recipient: "ST4RECIP", amount: 50, timestamp: 0 }]);
    expect(contract.stxTransfers[1]).toEqual({ amount: 50, from: "ST1TEST", to: "ST4RECIP" });
  });

  it("rejects distribution without enough votes", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    const result = contract.distributeFunds(0, "ST4RECIP", 50);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects duplicate distribution to same recipient", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      1,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    contract.voteOnDistribution(0, true);
    contract.distributeFunds(0, "ST4RECIP", 50);
    const result = contract.distributeFunds(0, "ST4RECIP", 25);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("verifies with oracle successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2TEST";
    contract.setOraclePrincipal("ST5ORACLE");
    contract.caller = "ST5ORACLE";
    contract.createDistrib(
      "TestDistrib",
      10,
      100,
      30,
      5,
      50,
      "disaster",
      10,
      7,
      "VillageX",
      "STX",
      50,
      1000,
      "pool1"
    );
    const result = contract.verifyWithOracle(0, true);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const distrib = contract.getDistrib(0);
    expect(distrib?.status).toBe(true);
  });

  it("rejects verification by non-oracle", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2TEST";
    contract.setOraclePrincipal("ST5ORACLE");
    contract.caller = "ST1TEST";
    const result = contract.verifyWithOracle(0, true);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});