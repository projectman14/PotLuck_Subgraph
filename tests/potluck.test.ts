import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  beforeEach
} from "matchstick-as/assembly/index"
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts"
import { 
  handlePotCreated,
  handlePotJoined,
  handlePotPayout,
  handlePotAllowRequested,
  handleAllowedParticipantAdded,
  handlePotEnded
} from "../src/potluck"
import {
  createPotCreatedEvent,
  createPotJoinedEvent,
  createPotPayoutEvent,
  createPotAllowRequestedEvent,
  createAllowedParticipantAddedEvent,
  createPotEndedEvent
} from "./potluck-utils"

// Test constants
const POT_ID = BigInt.fromI32(1)
const CREATOR_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000001")
const USER_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000002")
const TOKEN_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000003")
const ENTRY_AMOUNT = BigInt.fromI32(1000)
const PERIOD = BigInt.fromI32(86400) // 1 day
const ROUND_0 = BigInt.fromI32(0)
const ROUND_1 = BigInt.fromI32(1)
const PAYOUT_AMOUNT = BigInt.fromI32(2000)

describe("Potluck Subgraph Tests", () => {
  beforeEach(() => {
    clearStore()
  })

  describe("PotCreated Event", () => {
    test("Should create pot, user, participant, round, and contribution entities", () => {
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      
      handlePotCreated(potCreatedEvent)

      // Assert Pot entity
      assert.entityCount("Pot", 1)
      assert.fieldEquals("Pot", POT_ID.toString(), "id", POT_ID.toString())
      assert.fieldEquals("Pot", POT_ID.toString(), "creator", CREATOR_ADDRESS.toHex())
      assert.fieldEquals("Pot", POT_ID.toString(), "status", "ACTIVE")
      assert.fieldEquals("Pot", POT_ID.toString(), "currentRound", "0")
      assert.fieldEquals("Pot", POT_ID.toString(), "totalParticipants", "1")
      assert.fieldEquals("Pot", POT_ID.toString(), "activeParticipants", "1")
      assert.fieldEquals("Pot", POT_ID.toString(), "completedRounds", "0")
      assert.fieldEquals("Pot", POT_ID.toString(), "totalPayouts", "0")

      // Assert User entity
      assert.entityCount("User", 1)
      assert.fieldEquals("User", CREATOR_ADDRESS.toHex(), "id", CREATOR_ADDRESS.toHex())
      assert.fieldEquals("User", CREATOR_ADDRESS.toHex(), "address", CREATOR_ADDRESS.toHex())
      assert.fieldEquals("User", CREATOR_ADDRESS.toHex(), "totalPots", "1")
      assert.fieldEquals("User", CREATOR_ADDRESS.toHex(), "activePots", "1")
      assert.fieldEquals("User", CREATOR_ADDRESS.toHex(), "totalWon", "0")

      // Assert Participant entity
      let participantId = POT_ID.toString() + "-" + CREATOR_ADDRESS.toHex()
      assert.entityCount("Participant", 1)
      assert.fieldEquals("Participant", participantId, "pot", POT_ID.toString())
      assert.fieldEquals("Participant", participantId, "user", CREATOR_ADDRESS.toHex())
      assert.fieldEquals("Participant", participantId, "hasWon", "false")
      assert.fieldEquals("Participant", participantId, "isActive", "true")
      assert.fieldEquals("Participant", participantId, "roundsParticipated", "1")

      // Assert Round entity
      let roundId = POT_ID.toString() + "-0"
      assert.entityCount("Round", 1)
      assert.fieldEquals("Round", roundId, "pot", POT_ID.toString())
      assert.fieldEquals("Round", roundId, "roundNumber", "0")
      assert.fieldEquals("Round", roundId, "status", "ACTIVE")
      assert.fieldEquals("Round", roundId, "participantCount", "1")

      // Assert Contribution entity
      let contributionId = POT_ID.toString() + "-0-" + CREATOR_ADDRESS.toHex()
      assert.entityCount("Contribution", 1)
      assert.fieldEquals("Contribution", contributionId, "pot", POT_ID.toString())
      assert.fieldEquals("Contribution", contributionId, "round", roundId)
      assert.fieldEquals("Contribution", contributionId, "user", CREATOR_ADDRESS.toHex())
      assert.fieldEquals("Contribution", contributionId, "participantIndex", "0")

      // Assert PlatformStats entity
      assert.entityCount("PlatformStats", 1)
      assert.fieldEquals("PlatformStats", "platform", "totalPots", "1")
      assert.fieldEquals("PlatformStats", "platform", "activePots", "1")
      assert.fieldEquals("PlatformStats", "platform", "totalUsers", "1")
    })

    test("Should create AllowedUser for private pot", () => {
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      
      handlePotCreated(potCreatedEvent)

      // For private pots, creator should be automatically added to allowed users
      let allowedUserId = POT_ID.toString() + "-" + CREATOR_ADDRESS.toHex()
      assert.entityCount("AllowedUser", 1)
      assert.fieldEquals("AllowedUser", allowedUserId, "pot", POT_ID.toString())
      assert.fieldEquals("AllowedUser", allowedUserId, "user", CREATOR_ADDRESS.toHex())
      assert.fieldEquals("AllowedUser", allowedUserId, "addedBy", CREATOR_ADDRESS.toHex())
    })
  })

  describe("PotJoined Event", () => {
    beforeEach(() => {
      // Create a pot first
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)
    })

    test("Should handle new user joining pot", () => {
      let potJoinedEvent = createPotJoinedEvent(POT_ID, ROUND_0, USER_ADDRESS)
      
      handlePotJoined(potJoinedEvent)

      // Assert new User entity created
      assert.entityCount("User", 2)
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "totalPots", "1")
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "activePots", "1")

      // Assert Participant entity created
      let participantId = POT_ID.toString() + "-" + USER_ADDRESS.toHex()
      assert.entityCount("Participant", 2)
      assert.fieldEquals("Participant", participantId, "pot", POT_ID.toString())
      assert.fieldEquals("Participant", participantId, "user", USER_ADDRESS.toHex())
      assert.fieldEquals("Participant", participantId, "isActive", "true")
      assert.fieldEquals("Participant", participantId, "roundsParticipated", "1")

      // Assert Round updated
      let roundId = POT_ID.toString() + "-0"
      assert.fieldEquals("Round", roundId, "participantCount", "2")

      // Assert Contribution created
      let contributionId = POT_ID.toString() + "-0-" + USER_ADDRESS.toHex()
      assert.entityCount("Contribution", 2)
      assert.fieldEquals("Contribution", contributionId, "user", USER_ADDRESS.toHex())
      assert.fieldEquals("Contribution", contributionId, "participantIndex", "1")

      // Assert Pot updated
      assert.fieldEquals("Pot", POT_ID.toString(), "activeParticipants", "2")

      // Assert PlatformStats updated
      assert.fieldEquals("PlatformStats", "platform", "totalUsers", "2")
    })

    test("Should handle existing user joining new round", () => {
      // First, user joins round 0
      let potJoinedEvent1 = createPotJoinedEvent(POT_ID, ROUND_0, USER_ADDRESS)
      handlePotJoined(potJoinedEvent1)

      // Then user joins round 1
      let potJoinedEvent2 = createPotJoinedEvent(POT_ID, ROUND_1, USER_ADDRESS)
      handlePotJoined(potJoinedEvent2)

      // Assert Participant updated (not duplicated)
      let participantId = POT_ID.toString() + "-" + USER_ADDRESS.toHex()
      assert.entityCount("Participant", 2) // Creator + User
      assert.fieldEquals("Participant", participantId, "roundsParticipated", "2")
      assert.fieldEquals("Participant", participantId, "lastRoundParticipated", "1")

      // Assert new Round created
      let roundId = POT_ID.toString() + "-1"
      assert.entityCount("Round", 2)
      assert.fieldEquals("Round", roundId, "roundNumber", "1")
      assert.fieldEquals("Round", roundId, "participantCount", "1")

      // Assert new Contribution created
      let contributionId = POT_ID.toString() + "-1-" + USER_ADDRESS.toHex()
      assert.entityCount("Contribution", 3) // Creator round 0 + User round 0 + User round 1
      assert.fieldEquals("Contribution", contributionId, "round", roundId)
    })
  })

  describe("PotPayout Event", () => {
    beforeEach(() => {
      // Setup: Create pot, join users
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)
      
      let potJoinedEvent = createPotJoinedEvent(POT_ID, ROUND_0, USER_ADDRESS)
      handlePotJoined(potJoinedEvent)
    })

    test("Should handle payout and create payout entity", () => {
      let potPayoutEvent = createPotPayoutEvent(POT_ID, USER_ADDRESS, PAYOUT_AMOUNT, ROUND_0)
      
      handlePotPayout(potPayoutEvent)

      // Assert Payout entity created
      let payoutId = POT_ID.toString() + "-" + ROUND_0.toString()
      assert.entityCount("Payout", 1)
      assert.fieldEquals("Payout", payoutId, "pot", POT_ID.toString())
      assert.fieldEquals("Payout", payoutId, "winner", USER_ADDRESS.toHex())
      assert.fieldEquals("Payout", payoutId, "amount", PAYOUT_AMOUNT.toString())

      // Assert User updated
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "totalWon", PAYOUT_AMOUNT.toString())

      // Assert Participant updated
      let participantId = POT_ID.toString() + "-" + USER_ADDRESS.toHex()
      assert.fieldEquals("Participant", participantId, "hasWon", "true")
      assert.fieldEquals("Participant", participantId, "wonAmount", PAYOUT_AMOUNT.toString())

      // Assert Round updated
      let roundId = POT_ID.toString() + "-" + ROUND_0.toString()
      assert.fieldEquals("Round", roundId, "status", "COMPLETED")
      assert.fieldEquals("Round", roundId, "winner", USER_ADDRESS.toHex())
      assert.fieldEquals("Round", roundId, "prizeAmount", PAYOUT_AMOUNT.toString())

      // Assert Pot updated
      assert.fieldEquals("Pot", POT_ID.toString(), "totalPayouts", PAYOUT_AMOUNT.toString())
      assert.fieldEquals("Pot", POT_ID.toString(), "completedRounds", "1")
    })

    test("Should handle pot completion when balance is zero", () => {
      let potPayoutEvent = createPotPayoutEvent(POT_ID, USER_ADDRESS, PAYOUT_AMOUNT, ROUND_0)
      
      handlePotPayout(potPayoutEvent)

      // When pot balance becomes zero, pot should be completed
      assert.fieldEquals("Pot", POT_ID.toString(), "status", "COMPLETED")
      assert.fieldEquals("Pot", POT_ID.toString(), "activeParticipants", "0")

      // Assert PlatformStats updated
      assert.fieldEquals("PlatformStats", "platform", "completedPots", "1")
      assert.fieldEquals("PlatformStats", "platform", "activePots", "0")
    })
  })

  describe("PotAllowRequested Event", () => {
    beforeEach(() => {
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)
    })

    test("Should create allow request entity", () => {
      let potAllowRequestedEvent = createPotAllowRequestedEvent(POT_ID, USER_ADDRESS)
      
      handlePotAllowRequested(potAllowRequestedEvent)

      // Assert AllowRequest entity created
      assert.entityCount("AllowRequest", 1)
      // The ID includes timestamp, so we'll check if entity exists and has correct fields
      assert.fieldEquals("AllowRequest", "1-0x0000000000000000000000000000000000000002-0", "pot", POT_ID.toString())
      assert.fieldEquals("AllowRequest", "1-0x0000000000000000000000000000000000000002-0", "user", USER_ADDRESS.toHex())
      assert.fieldEquals("AllowRequest", "1-0x0000000000000000000000000000000000000002-0", "status", "PENDING")

      // Assert User created/updated
      assert.entityCount("User", 2) // Creator + Requestor
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "address", USER_ADDRESS.toHex())

      // Assert PlatformStats updated for new user
      assert.fieldEquals("PlatformStats", "platform", "totalUsers", "2")
    })

    test("Should handle existing user requesting allow", () => {
      // First join the pot
      let potJoinedEvent = createPotJoinedEvent(POT_ID, ROUND_0, USER_ADDRESS)
      handlePotJoined(potJoinedEvent)

      // Then request allow for another pot
      let potAllowRequestedEvent = createPotAllowRequestedEvent(BigInt.fromI32(2), USER_ADDRESS)
      handlePotAllowRequested(potAllowRequestedEvent)

      // Should not create duplicate user
      assert.entityCount("User", 2) // Creator + User
      
      // Should update user's last activity
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "lastActivity", "0")

      // PlatformStats should not increment totalUsers
      assert.fieldEquals("PlatformStats", "platform", "totalUsers", "2")
    })
  })

  describe("AllowedParticipantAdded Event", () => {
    beforeEach(() => {
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)
    })

    test("Should create allowed user entity", () => {
      let allowedParticipantAddedEvent = createAllowedParticipantAddedEvent(POT_ID, USER_ADDRESS)
      
      handleAllowedParticipantAdded(allowedParticipantAddedEvent)

      // Assert AllowedUser entity created
      let allowedUserId = POT_ID.toString() + "-" + USER_ADDRESS.toHex()
      assert.entityCount("AllowedUser", 2) // Creator (auto-added) + New user
      assert.fieldEquals("AllowedUser", allowedUserId, "pot", POT_ID.toString())
      assert.fieldEquals("AllowedUser", allowedUserId, "user", USER_ADDRESS.toHex())
      assert.fieldEquals("AllowedUser", allowedUserId, "addedBy", CREATOR_ADDRESS.toHex())

      // Assert User created
      assert.entityCount("User", 2)
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "address", USER_ADDRESS.toHex())

      // Assert PlatformStats updated
      assert.fieldEquals("PlatformStats", "platform", "totalUsers", "2")
    })
  })

  describe("PotEnded Event", () => {
    beforeEach(() => {
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)
      
      let potJoinedEvent = createPotJoinedEvent(POT_ID, ROUND_0, USER_ADDRESS)
      handlePotJoined(potJoinedEvent)
    })

    test("Should mark pot as completed and update round status", () => {
      let potEndedEvent = createPotEndedEvent(POT_ID)
      
      handlePotEnded(potEndedEvent)

      // Assert Pot updated
      assert.fieldEquals("Pot", POT_ID.toString(), "status", "COMPLETED")
      assert.fieldEquals("Pot", POT_ID.toString(), "currentBalance", "0")
      assert.fieldEquals("Pot", POT_ID.toString(), "activeParticipants", "0")

      // Assert Round updated
      let roundId = POT_ID.toString() + "-0"
      assert.fieldEquals("Round", roundId, "status", "COMPLETED")

      // Assert PlatformStats updated
      assert.fieldEquals("PlatformStats", "platform", "completedPots", "1")
      assert.fieldEquals("PlatformStats", "platform", "activePots", "0")
    })
  })

  describe("Edge Cases and Integration Tests", () => {
    test("Should handle multiple pots creation", () => {
      let potCreatedEvent1 = createPotCreatedEvent(BigInt.fromI32(1), CREATOR_ADDRESS)
      let potCreatedEvent2 = createPotCreatedEvent(BigInt.fromI32(2), USER_ADDRESS)
      
      handlePotCreated(potCreatedEvent1)
      handlePotCreated(potCreatedEvent2)

      assert.entityCount("Pot", 2)
      assert.entityCount("User", 2)
      assert.fieldEquals("PlatformStats", "platform", "totalPots", "2")
      assert.fieldEquals("PlatformStats", "platform", "activePots", "2")
      assert.fieldEquals("PlatformStats", "platform", "totalUsers", "2")
    })

    test("Should handle user participating in multiple pots", () => {
      // Create two pots
      let potCreatedEvent1 = createPotCreatedEvent(BigInt.fromI32(1), CREATOR_ADDRESS)
      let potCreatedEvent2 = createPotCreatedEvent(BigInt.fromI32(2), CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent1)
      handlePotCreated(potCreatedEvent2)

      // User joins both pots
      let potJoinedEvent1 = createPotJoinedEvent(BigInt.fromI32(1), ROUND_0, USER_ADDRESS)
      let potJoinedEvent2 = createPotJoinedEvent(BigInt.fromI32(2), ROUND_0, USER_ADDRESS)
      handlePotJoined(potJoinedEvent1)
      handlePotJoined(potJoinedEvent2)

      // Should have one User entity but two Participant entities
      assert.entityCount("User", 2) // Creator + User
      assert.entityCount("Participant", 4) // Creator in both pots + User in both pots
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "totalPots", "2")
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "activePots", "2")
    })

    test("Should correctly track user statistics after winning", () => {
      // Setup pot and join
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)
      
      let potJoinedEvent = createPotJoinedEvent(POT_ID, ROUND_0, USER_ADDRESS)
      handlePotJoined(potJoinedEvent)

      // User wins
      let potPayoutEvent = createPotPayoutEvent(POT_ID, USER_ADDRESS, PAYOUT_AMOUNT, ROUND_0)
      handlePotPayout(potPayoutEvent)

      // Verify user stats
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "totalWon", PAYOUT_AMOUNT.toString())
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "totalPots", "1")

      // Verify participant stats
      let participantId = POT_ID.toString() + "-" + USER_ADDRESS.toHex()
      assert.fieldEquals("Participant", participantId, "hasWon", "true")
      assert.fieldEquals("Participant", participantId, "wonAmount", PAYOUT_AMOUNT.toString())
    })

    test("Should handle platform stats correctly across multiple operations", () => {
      // Create pot
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)

      // User joins
      let potJoinedEvent = createPotJoinedEvent(POT_ID, ROUND_0, USER_ADDRESS)
      handlePotJoined(potJoinedEvent)

      // Payout happens
      let potPayoutEvent = createPotPayoutEvent(POT_ID, USER_ADDRESS, PAYOUT_AMOUNT, ROUND_0)
      handlePotPayout(potPayoutEvent)

      // End pot
      let potEndedEvent = createPotEndedEvent(POT_ID)
      handlePotEnded(potEndedEvent)

      // Verify final platform stats
      assert.fieldEquals("PlatformStats", "platform", "totalPots", "1")
      assert.fieldEquals("PlatformStats", "platform", "activePots", "0")
      assert.fieldEquals("PlatformStats", "platform", "completedPots", "1")
      assert.fieldEquals("PlatformStats", "platform", "totalUsers", "2")
    })
  })
})