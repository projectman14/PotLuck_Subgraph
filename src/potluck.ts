import { BigInt, Address, Bytes, log } from "@graphprotocol/graph-ts";
import {
  PotCreated,
  PotJoined,
  PotPayout,
  PotAllowRequested,
  AllowedParticipantAdded,
  PotEnded,
  Potluck
} from "../generated/Potluck/Potluck";
import {
  Pot,
  User,
  Participant,
  Round,
  Contribution,
  Payout,
  AllowedUser,
  AllowRequest,
  PlatformStats
} from "../generated/schema";

function getOrCreateUser(address: Address): User {
  let user = User.load(address.toHex());
  if (user == null) {
    user = new User(address.toHex());
    user.address = address.toHex();
    user.totalContributed = BigInt.fromI32(0);
    user.totalWon = BigInt.fromI32(0);
    user.totalPots = BigInt.fromI32(0);
    user.activePots = BigInt.fromI32(0);
    user.firstActivity = BigInt.fromI32(0);
    user.lastActivity = BigInt.fromI32(0);
    user.save();
  }
  return user;
}

function getOrCreatePlatformStats(): PlatformStats {
  let stats = PlatformStats.load("platform");
  if (stats == null) {
    stats = new PlatformStats("platform");
    stats.totalPots = BigInt.fromI32(0);
    stats.activePots = BigInt.fromI32(0);
    stats.completedPots = BigInt.fromI32(0);
    stats.totalUsers = BigInt.fromI32(0);
    stats.activeUsers = BigInt.fromI32(0);
    stats.totalVolume = BigInt.fromI32(0);
    stats.totalFeesPaid = BigInt.fromI32(0);
    stats.lastUpdated = BigInt.fromI32(0);
    stats.save();
  }
  return stats;
}

function bytesToString(bytes: Bytes): string {
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    let byte = bytes[i];
    if (byte != 0) {
      result += String.fromCharCode(byte);
    }
  }
  return result;
}

function getOrCreateRound(potId: string, roundNumber: BigInt, deadline: BigInt, startTime: BigInt): Round {
  let roundId = potId + "-" + roundNumber.toString();
  let round = Round.load(roundId);
  if (round == null) {
    round = new Round(roundId);
    round.pot = potId;
    round.roundNumber = roundNumber;
    round.deadline = deadline;
    round.startTime = startTime;
    round.totalContributions = BigInt.fromI32(0);
    round.participantCount = BigInt.fromI32(0);
    round.prizeAmount = BigInt.fromI32(0);
    round.rolloverAmount = BigInt.fromI32(0);
    round.status = "ACTIVE";
    round.save();
  }
  return round;
}

export function handlePotCreated(event: PotCreated): void {
  let contract = Potluck.bind(event.address);
  let potData = contract.pots(event.params.potId);
  
  let pot = new Pot(event.params.potId.toString());
  pot.name = bytesToString(potData.getName()); 
  pot.creator = event.params.creator.toHex();
  pot.tokenAddress = potData.getToken().toHex();
  pot.entryAmount = potData.getEntryAmount();
  pot.period = potData.getPeriod();
  pot.maxParticipants = BigInt.fromI32(potData.getMaxParticipants());
  pot.isPublic = potData.getIsPublic();
  pot.status = "ACTIVE";
  pot.currentRound = potData.getRound();
  pot.currentDeadline = potData.getDeadline();
  pot.currentBalance = potData.getBalance();
  pot.totalParticipants = potData.getTotalParticipants();
  pot.createdAt = event.block.timestamp;
  pot.updatedAt = event.block.timestamp;
  pot.totalContributions = potData.getEntryAmount();
  pot.totalPayouts = BigInt.fromI32(0);
  pot.completedRounds = BigInt.fromI32(0);
  pot.activeParticipants = BigInt.fromI32(1);
  pot.save();

  let creator = getOrCreateUser(event.params.creator);
  if (creator.firstActivity.equals(BigInt.fromI32(0))) {
    creator.firstActivity = event.block.timestamp;
  }
  creator.lastActivity = event.block.timestamp;
  creator.totalPots = creator.totalPots.plus(BigInt.fromI32(1));
  creator.activePots = creator.activePots.plus(BigInt.fromI32(1));
  creator.totalContributed = creator.totalContributed.plus(potData.getEntryAmount());
  creator.save();

  let round = getOrCreateRound(
    pot.id,
    potData.getRound(),
    potData.getDeadline(),
    event.block.timestamp
  );
  round.totalContributions = potData.getEntryAmount();
  round.participantCount = BigInt.fromI32(1);
  round.save();

  let participantId = event.params.potId.toString() + "-" + event.params.creator.toHex();
  let participant = new Participant(participantId);
  participant.pot = pot.id;
  participant.user = creator.id;
  participant.joinedAt = event.block.timestamp;
  participant.hasWon = false;
  participant.wonAmount = BigInt.fromI32(0);
  participant.totalContributed = potData.getEntryAmount();
  participant.roundsParticipated = BigInt.fromI32(1);
  participant.isActive = true;
  participant.lastRoundParticipated = potData.getRound();
  participant.save();

  let contributionId = event.params.potId.toString() + "-" + potData.getRound().toString() + "-" + event.params.creator.toHex();
  let contribution = new Contribution(contributionId);
  contribution.pot = pot.id;
  contribution.round = round.id;
  contribution.user = creator.id;
  contribution.amount = potData.getEntryAmount();
  contribution.timestamp = event.block.timestamp;
  contribution.transactionHash = event.transaction.hash.toHex();
  contribution.participantIndex = BigInt.fromI32(0); 
  contribution.save();

  if (!potData.getIsPublic()) {
    let allowedUserId = event.params.potId.toString() + "-" + event.params.creator.toHex();
    let allowedUser = new AllowedUser(allowedUserId);
    allowedUser.pot = pot.id;
    allowedUser.user = creator.id;
    allowedUser.addedAt = event.block.timestamp;
    allowedUser.addedBy = creator.id;
    allowedUser.save();
  }

  let stats = getOrCreatePlatformStats();
  stats.totalPots = stats.totalPots.plus(BigInt.fromI32(1));
  stats.activePots = stats.activePots.plus(BigInt.fromI32(1));
  stats.totalVolume = stats.totalVolume.plus(potData.getEntryAmount());
  stats.lastUpdated = event.block.timestamp;
  
  if (creator.firstActivity.equals(event.block.timestamp)) {
    stats.totalUsers = stats.totalUsers.plus(BigInt.fromI32(1));
  }
  stats.save();
}

export function handlePotJoined(event: PotJoined): void {
  let contract = Potluck.bind(event.address);
  let potData = contract.pots(event.params.potId);
  
  let pot = Pot.load(event.params.potId.toString());
  if (pot != null) {
    pot.currentBalance = potData.getBalance();
    pot.currentRound = potData.getRound();
    pot.currentDeadline = potData.getDeadline();
    pot.totalContributions = pot.totalContributions.plus(potData.getEntryAmount());
    pot.updatedAt = event.block.timestamp;
    
    let participantId = event.params.potId.toString() + "-" + event.params.user.toHex();
    let existingParticipant = Participant.load(participantId);
    if (existingParticipant == null) {
      pot.activeParticipants = pot.activeParticipants.plus(BigInt.fromI32(1));
    }
    pot.save();
  }

  let user = getOrCreateUser(event.params.user);
  if (user.firstActivity.equals(BigInt.fromI32(0))) {
    user.firstActivity = event.block.timestamp;
  }
  user.lastActivity = event.block.timestamp;
  user.totalContributed = user.totalContributed.plus(potData.getEntryAmount());
  user.save();

  let currentRound = event.params.roundId;
  let round = getOrCreateRound(
    event.params.potId.toString(),
    currentRound,
    potData.getDeadline(),
    event.block.timestamp
  );

  let participantId = event.params.potId.toString() + "-" + event.params.user.toHex();
  let participant = Participant.load(participantId);
  if (participant == null) {
    participant = new Participant(participantId);
    participant.pot = event.params.potId.toString();
    participant.user = user.id;
    participant.joinedAt = event.block.timestamp;
    participant.hasWon = false;
    participant.wonAmount = BigInt.fromI32(0);
    participant.totalContributed = potData.getEntryAmount();
    participant.roundsParticipated = BigInt.fromI32(1);
    participant.isActive = true;
    participant.lastRoundParticipated = currentRound;
    
    user.totalPots = user.totalPots.plus(BigInt.fromI32(1));
    user.activePots = user.activePots.plus(BigInt.fromI32(1));
    user.save();
  } else {
    participant.totalContributed = participant.totalContributed.plus(potData.getEntryAmount());
    participant.roundsParticipated = participant.roundsParticipated.plus(BigInt.fromI32(1));
    participant.lastRoundParticipated = currentRound;
    participant.isActive = true;
  }
  participant.save();

  round.participantCount = round.participantCount.plus(BigInt.fromI32(1));
  round.totalContributions = round.totalContributions.plus(potData.getEntryAmount());
  round.save();

  let contributionId = event.params.potId.toString() + "-" + currentRound.toString() + "-" + event.params.user.toHex();
  let contribution = new Contribution(contributionId);
  contribution.pot = event.params.potId.toString();
  contribution.round = round.id;
  contribution.user = user.id;
  contribution.amount = potData.getEntryAmount();
  contribution.timestamp = event.block.timestamp;
  contribution.transactionHash = event.transaction.hash.toHex();
  contribution.participantIndex = round.participantCount.minus(BigInt.fromI32(1));
  contribution.save();

  let stats = getOrCreatePlatformStats();
  stats.totalVolume = stats.totalVolume.plus(potData.getEntryAmount());
  stats.lastUpdated = event.block.timestamp;
  
  if (user.firstActivity.equals(event.block.timestamp)) {
    stats.totalUsers = stats.totalUsers.plus(BigInt.fromI32(1));
  }
  stats.save();
}

export function handlePotPayout(event: PotPayout): void {
  let contract = Potluck.bind(event.address);
  let potData = contract.pots(event.params.potId);
  
  let pot = Pot.load(event.params.potId.toString());
  if (pot != null) {
    pot.currentBalance = potData.getBalance();
    pot.currentRound = potData.getRound();
    pot.currentDeadline = potData.getRound();
    pot.totalPayouts = pot.totalPayouts.plus(event.params.amount);
    pot.completedRounds = pot.completedRounds.plus(BigInt.fromI32(1));
    pot.updatedAt = event.block.timestamp;
    
    if (potData.getBalance().equals(BigInt.fromI32(0))) {
      pot.status = "COMPLETED";
      pot.activeParticipants = BigInt.fromI32(0);
    }
    pot.save();
  }

  let payoutId = event.params.potId.toString() + "-" + event.params.round.toString();
  let payout = new Payout(payoutId);
  payout.pot = event.params.potId.toString();
  payout.round = event.params.potId.toString() + "-" + event.params.round.toString();
  payout.winner = event.params.winner.toHex();
  payout.amount = event.params.amount;
  payout.timestamp = event.block.timestamp;
  payout.transactionHash = event.transaction.hash.toHex();
  payout.save();

  let winner = getOrCreateUser(event.params.winner);
  winner.totalWon = winner.totalWon.plus(event.params.amount);
  winner.lastActivity = event.block.timestamp;
  winner.save();

  let participantId = event.params.potId.toString() + "-" + event.params.winner.toHex();
  let participant = Participant.load(participantId);
  if (participant != null) {
    participant.hasWon = true;
    participant.wonAt = event.block.timestamp;
    participant.wonAmount = participant.wonAmount.plus(event.params.amount);
    participant.save();
  }

  let currentRoundId = event.params.potId.toString() + "-" + event.params.round.toString();
  let currentRound = Round.load(currentRoundId);
  if (currentRound != null) {
    currentRound.status = "COMPLETED";
    currentRound.endTime = event.block.timestamp;
    currentRound.winner = event.params.winner.toHex();
    currentRound.prizeAmount = event.params.amount;
    currentRound.rolloverAmount = potData.getBalance();
    currentRound.save();
  }

  if (pot != null && pot.status == "ACTIVE" && !potData.getBalance().equals(BigInt.fromI32(0))) {
    let nextRound = getOrCreateRound(
      pot.id,
      potData.getRound(),
      potData.getDeadline(),
      event.block.timestamp
    );
    nextRound.totalContributions = potData.getBalance(); 
    nextRound.participantCount = BigInt.fromI32(1); 
    nextRound.save();
  }

  let stats = getOrCreatePlatformStats();
  stats.lastUpdated = event.block.timestamp;
  
  if (pot != null && pot.status == "COMPLETED") {
    stats.completedPots = stats.completedPots.plus(BigInt.fromI32(1));
    stats.activePots = stats.activePots.minus(BigInt.fromI32(1));
    
    let participantId = event.params.potId.toString() + "-" + event.params.winner.toHex();
    let winnerParticipant = Participant.load(participantId);
    if (winnerParticipant != null) {
      let winnerUser = User.load(winnerParticipant.user);
      if (winnerUser != null) {
        winnerUser.activePots = winnerUser.activePots.minus(BigInt.fromI32(1));
        winnerUser.save();
      }
    }
  }
  stats.save();
}

export function handlePotAllowRequested(event: PotAllowRequested): void {
  let requestId = event.params.potId.toString() + "-" + event.params.requestor.toHex() + "-" + event.block.timestamp.toString();
  let request = new AllowRequest(requestId);
  request.pot = event.params.potId.toString();
  request.user = event.params.requestor.toHex(); 
  request.requestedAt = event.block.timestamp;
  request.status = "PENDING"; 
  request.save();

  let user = getOrCreateUser(event.params.requestor);
  if (user.firstActivity.equals(BigInt.fromI32(0))) {
    user.firstActivity = event.block.timestamp;
  }
  user.lastActivity = event.block.timestamp;
  user.save();

  if (user.firstActivity.equals(event.block.timestamp)) {
    let stats = getOrCreatePlatformStats();
    stats.totalUsers = stats.totalUsers.plus(BigInt.fromI32(1));
    stats.lastUpdated = event.block.timestamp;
    stats.save();
  }
}

export function handleAllowedParticipantAdded(event: AllowedParticipantAdded): void {
  let allowedUserId = event.params.potId.toString() + "-" + event.params.user.toHex();
  let allowedUser = new AllowedUser(allowedUserId);
  allowedUser.pot = event.params.potId.toString();
  allowedUser.user = event.params.user.toHex();
  allowedUser.addedAt = event.block.timestamp;
  
  let pot = Pot.load(event.params.potId.toString());
  if (pot != null) {
    allowedUser.addedBy = pot.creator;
  }
  allowedUser.save();

  let user = getOrCreateUser(event.params.user);
  if (user.firstActivity.equals(BigInt.fromI32(0))) {
    user.firstActivity = event.block.timestamp;
  }
  user.lastActivity = event.block.timestamp;
  user.save();

  if (user.firstActivity.equals(event.block.timestamp)) {
    let stats = getOrCreatePlatformStats();
    stats.totalUsers = stats.totalUsers.plus(BigInt.fromI32(1));
    stats.lastUpdated = event.block.timestamp;
    stats.save();
  }
}

export function handlePotEnded(event: PotEnded): void {
  let pot = Pot.load(event.params.potId.toString());
  if (pot != null) {
    pot.status = "COMPLETED";
    pot.currentBalance = BigInt.fromI32(0);
    pot.activeParticipants = BigInt.fromI32(0);
    pot.updatedAt = event.block.timestamp;
    pot.save();

  }

  let contract = Potluck.bind(event.address);
  let potData = contract.pots(event.params.potId);
  let roundId = event.params.potId.toString() + "-" + potData.getRound().toString();
  let round = Round.load(roundId);
  if (round != null) {
    round.status = "COMPLETED";
    round.endTime = event.block.timestamp;
    round.save();
  }

  let stats = getOrCreatePlatformStats();
  stats.completedPots = stats.completedPots.plus(BigInt.fromI32(1));
  stats.activePots = stats.activePots.minus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}