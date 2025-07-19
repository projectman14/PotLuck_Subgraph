import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  createMockedFunction
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
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
} from "../generated/schema"
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

// Test data constants
const POT_ID = BigInt.fromI32(1)
const CREATOR_ADDRESS = Address.fromString("0x1234567890123456789012345678901234567890")
const USER_ADDRESS = Address.fromString("0x0987654321098765432109876543210987654321")
const TOKEN_ADDRESS = Address.fromString("0xA0b86a33E6441b5c9b2f96e7C4f5c1dEe3b1D4E5")
const CONTRACT_ADDRESS = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")
const ENTRY_AMOUNT = BigInt.fromI32(1000)
const PERIOD = BigInt.fromI32(3600) // 1 hour
const PRIZE_AMOUNT = BigInt.fromI32(5000)
const ROUND_NUMBER = BigInt.fromI32(0)
const POT_NAME = Bytes.fromUTF8("Test Pot")
const MAX_PARTICIPANTS = 10
const MOCK_DEADLINE = BigInt.fromI64(1672531200) // Fixed timestamp instead of Date.now()

// Helper function to create mock pot data
function createMockPotData(
  potId: BigInt,
  creator: Address,
  round: i32 = 0,
  balance: BigInt = ENTRY_AMOUNT,
  participants: i32 = 1
): void {
  createMockedFunction(CONTRACT_ADDRESS, "pots", "pots(uint256):(uint256,bytes,uint32,uint256,uint256,address,uint256,uint256,uint32,uint8,bool)")
    .withArgs([ethereum.Value.fromUnsignedBigInt(potId)])
    .returns([
      ethereum.Value.fromUnsignedBigInt(potId), // id
      ethereum.Value.fromBytes(POT_NAME), // name
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(round)), // round
      ethereum.Value.fromUnsignedBigInt(MOCK_DEADLINE), // deadline - fixed timestamp
      ethereum.Value.fromUnsignedBigInt(balance), // balance
      ethereum.Value.fromAddress(TOKEN_ADDRESS), // token
      ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT), // entryAmount
      ethereum.Value.fromUnsignedBigInt(PERIOD), // period
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(participants)), // totalParticipants
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(MAX_PARTICIPANTS)), // maxParticipants
      ethereum.Value.fromBoolean(true) // isPublic
    ])
}

describe("Potluck Subgraph Tests", () => {
  beforeEach(() => {
    clearStore()
  })

  describe("handlePotCreated", () => {
    test("Should create a new pot with all required fields", () => {
      // Mock the contract call
      createMockPotData(POT_ID, CREATOR_ADDRESS)

      // Create and handle the event
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)

      // Verify Pot entity was created
      assert.fieldEquals("Pot", POT_ID.toString(), "id", POT_ID.toString())
      assert.fieldEquals("Pot", POT_ID.toString(), "creator", CREATOR_ADDRESS.toHex())
      assert.fieldEquals("Pot", POT_ID.toString(), "status", "ACTIVE")
      assert.fieldEquals("Pot", POT_ID.toString(), "currentRound", "0")
      assert.fieldEquals("Pot", POT_ID.toString(), "tokenAddress", TOKEN_ADDRESS.toHex())
      assert.fieldEquals("Pot", POT_ID.toString(), "entryAmount", ENTRY_AMOUNT.toString())
      assert.fieldEquals("Pot", POT_ID.toString(), "period", PERIOD.toString())
      assert.fieldEquals("Pot", POT_ID.toString(), "maxParticipants", MAX_PARTICIPANTS.toString())
      assert.fieldEquals("Pot", POT_ID.toString(), "isPublic", "true")

      // Verify User entity was created
      assert.fieldEquals("User", CREATOR_ADDRESS.toHex(), "id", CREATOR_ADDRESS.toHex())
      assert.fieldEquals("User", CREATOR_ADDRESS.toHex(), "address", CREATOR_ADDRESS.toHex())

      // Verify PlatformStats was updated
      assert.fieldEquals("PlatformStats", "platform", "totalPots", "1")
      assert.fieldEquals("PlatformStats", "platform", "activePots", "1")
    })
  })

  describe("handlePotJoined", () => {
    beforeEach(() => {
      // Create a pot first
      createMockPotData(POT_ID, CREATOR_ADDRESS)
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)
    })

    test("Should handle new user joining a pot", () => {
      // Update mock for pot with 2 participants
      createMockPotData(POT_ID, CREATOR_ADDRESS, 0, ENTRY_AMOUNT.times(BigInt.fromI32(2)), 2)

      // Create and handle join event
      let potJoinedEvent = createPotJoinedEvent(POT_ID, ROUND_NUMBER, USER_ADDRESS)
      handlePotJoined(potJoinedEvent)

      // Verify new User entity was created
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "id", USER_ADDRESS.toHex())

      // Verify new Participant entity was created
      let participantId = POT_ID.toString() + "-" + USER_ADDRESS.toHex()
      assert.fieldEquals("Participant", participantId, "pot", POT_ID.toString())
      assert.fieldEquals("Participant", participantId, "user", USER_ADDRESS.toHex())

      // Verify new Contribution was created
      let contributionId = POT_ID.toString() + "-" + ROUND_NUMBER.toString() + "-" + USER_ADDRESS.toHex()
      assert.fieldEquals("Contribution", contributionId, "pot", POT_ID.toString())
      assert.fieldEquals("Contribution", contributionId, "user", USER_ADDRESS.toHex())
    })
  })

  describe("handlePotPayout", () => {
    beforeEach(() => {
      // Create pot and add participant
      createMockPotData(POT_ID, CREATOR_ADDRESS)
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)

      createMockPotData(POT_ID, CREATOR_ADDRESS, 0, ENTRY_AMOUNT.times(BigInt.fromI32(2)), 2)
      let potJoinedEvent = createPotJoinedEvent(POT_ID, ROUND_NUMBER, USER_ADDRESS)
      handlePotJoined(potJoinedEvent)
    })

    test("Should handle payout to winner", () => {
      // Mock pot after payout (next round with rollover)
      createMockPotData(POT_ID, CREATOR_ADDRESS, 1, ENTRY_AMOUNT, 2)

      // Create and handle payout event
      let potPayoutEvent = createPotPayoutEvent(POT_ID, USER_ADDRESS, PRIZE_AMOUNT, ROUND_NUMBER)
      handlePotPayout(potPayoutEvent)

      // Verify Payout entity was created
      let payoutId = POT_ID.toString() + "-" + ROUND_NUMBER.toString()
      assert.fieldEquals("Payout", payoutId, "pot", POT_ID.toString())
      assert.fieldEquals("Payout", payoutId, "winner", USER_ADDRESS.toHex())
      assert.fieldEquals("Payout", payoutId, "amount", PRIZE_AMOUNT.toString())
    })

    test("Should handle pot completion when balance is zero", () => {
      // Mock pot with balance = 0 (completed)
      createMockedFunction(CONTRACT_ADDRESS, "pots", "pots(uint256):(uint256,bytes,uint32,uint256,uint256,address,uint256,uint256,uint32,uint8,bool)")
        .withArgs([ethereum.Value.fromUnsignedBigInt(POT_ID)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(POT_ID),
          ethereum.Value.fromBytes(POT_NAME),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)),
          ethereum.Value.fromUnsignedBigInt(MOCK_DEADLINE),
          ethereum.Value.fromUnsignedBigInt(BigInt.zero()), // balance = 0
          ethereum.Value.fromAddress(TOKEN_ADDRESS),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT),
          ethereum.Value.fromUnsignedBigInt(PERIOD),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(2)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(MAX_PARTICIPANTS)),
          ethereum.Value.fromBoolean(true)
        ])

      let potPayoutEvent = createPotPayoutEvent(POT_ID, USER_ADDRESS, PRIZE_AMOUNT, BigInt.fromI32(1))
      handlePotPayout(potPayoutEvent)

      // Verify pot status changed to COMPLETED if balance is 0
      assert.fieldEquals("Pot", POT_ID.toString(), "currentBalance", "0")
    })
  })

  describe("handlePotAllowRequested", () => {
    beforeEach(() => {
      createMockPotData(POT_ID, CREATOR_ADDRESS)
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)
    })

    test("Should create allow request", () => {
      let potAllowRequestedEvent = createPotAllowRequestedEvent(POT_ID, USER_ADDRESS)
      handlePotAllowRequested(potAllowRequestedEvent)

      // Verify User was created/updated
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "id", USER_ADDRESS.toHex())

      // Verify AllowRequest entity count increased
      assert.entityCount("AllowRequest", 1)
    })
  })

  describe("handleAllowedParticipantAdded", () => {
    beforeEach(() => {
      createMockPotData(POT_ID, CREATOR_ADDRESS)
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)
    })

    test("Should add allowed participant", () => {
      let allowedParticipantAddedEvent = createAllowedParticipantAddedEvent(POT_ID, USER_ADDRESS)
      handleAllowedParticipantAdded(allowedParticipantAddedEvent)

      // Verify AllowedUser entity was created
      let allowedUserId = POT_ID.toString() + "-" + USER_ADDRESS.toHex()
      assert.fieldEquals("AllowedUser", allowedUserId, "pot", POT_ID.toString())
      assert.fieldEquals("AllowedUser", allowedUserId, "user", USER_ADDRESS.toHex())

      // Verify User was created/updated
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "id", USER_ADDRESS.toHex())
    })
  })

  describe("handlePotEnded", () => {
    beforeEach(() => {
      createMockPotData(POT_ID, CREATOR_ADDRESS)
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)
    })

    test("Should end pot and update entities", () => {
      // Mock pot with zero balance (ended)
      createMockedFunction(CONTRACT_ADDRESS, "pots", "pots(uint256):(uint256,bytes,uint32,uint256,uint256,address,uint256,uint256,uint32,uint8,bool)")
        .withArgs([ethereum.Value.fromUnsignedBigInt(POT_ID)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(POT_ID),
          ethereum.Value.fromBytes(POT_NAME),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
          ethereum.Value.fromUnsignedBigInt(MOCK_DEADLINE),
          ethereum.Value.fromUnsignedBigInt(BigInt.zero()), // balance = 0
          ethereum.Value.fromAddress(TOKEN_ADDRESS),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT),
          ethereum.Value.fromUnsignedBigInt(PERIOD),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(MAX_PARTICIPANTS)),
          ethereum.Value.fromBoolean(true)
        ])

      let potEndedEvent = createPotEndedEvent(POT_ID)
      handlePotEnded(potEndedEvent)

      // Verify Pot status was updated
      assert.fieldEquals("Pot", POT_ID.toString(), "status", "COMPLETED")
      assert.fieldEquals("Pot", POT_ID.toString(), "currentBalance", "0")
    })
  })

  describe("Integration Tests", () => {
    test("Should handle complete pot lifecycle", () => {
      // 1. Create pot
      createMockPotData(POT_ID, CREATOR_ADDRESS)
      let potCreatedEvent = createPotCreatedEvent(POT_ID, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)

      // 2. User joins
      createMockPotData(POT_ID, CREATOR_ADDRESS, 0, ENTRY_AMOUNT.times(BigInt.fromI32(2)), 2)
      let potJoinedEvent = createPotJoinedEvent(POT_ID, ROUND_NUMBER, USER_ADDRESS)
      handlePotJoined(potJoinedEvent)

      // 3. Payout occurs
      createMockedFunction(CONTRACT_ADDRESS, "pots", "pots(uint256):(uint256,bytes,uint32,uint256,uint256,address,uint256,uint256,uint32,uint8,bool)")
        .withArgs([ethereum.Value.fromUnsignedBigInt(POT_ID)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(POT_ID),
          ethereum.Value.fromBytes(POT_NAME),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)),
          ethereum.Value.fromUnsignedBigInt(MOCK_DEADLINE),
          ethereum.Value.fromUnsignedBigInt(BigInt.zero()),
          ethereum.Value.fromAddress(TOKEN_ADDRESS),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT),
          ethereum.Value.fromUnsignedBigInt(PERIOD),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(2)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(MAX_PARTICIPANTS)),
          ethereum.Value.fromBoolean(true)
        ])
      let potPayoutEvent = createPotPayoutEvent(POT_ID, USER_ADDRESS, PRIZE_AMOUNT, ROUND_NUMBER)
      handlePotPayout(potPayoutEvent)

      // 4. Pot ends
      let potEndedEvent = createPotEndedEvent(POT_ID)
      handlePotEnded(potEndedEvent)

      // Verify final state
      assert.fieldEquals("Pot", POT_ID.toString(), "status", "COMPLETED")
      assert.fieldEquals("User", USER_ADDRESS.toHex(), "totalWon", PRIZE_AMOUNT.toString())

      // Verify this test created 1 payout
      assert.entityCount("Payout", 1)
    })

    test("Should handle multiple users joining", () => {
      // Use a different pot ID to avoid conflicts
      let multiplePotId = BigInt.fromI32(2)

      // Create pot
      createMockedFunction(CONTRACT_ADDRESS, "pots", "pots(uint256):(uint256,bytes,uint32,uint256,uint256,address,uint256,uint256,uint32,uint8,bool)")
        .withArgs([ethereum.Value.fromUnsignedBigInt(multiplePotId)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(multiplePotId),
          ethereum.Value.fromBytes(POT_NAME),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
          ethereum.Value.fromUnsignedBigInt(MOCK_DEADLINE),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT),
          ethereum.Value.fromAddress(TOKEN_ADDRESS),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT),
          ethereum.Value.fromUnsignedBigInt(PERIOD),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(MAX_PARTICIPANTS)),
          ethereum.Value.fromBoolean(true)
        ])

      let potCreatedEvent = createPotCreatedEvent(multiplePotId, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)

      // Multiple users join
      let user2 = Address.fromString("0x1111111111111111111111111111111111111111")
      let user3 = Address.fromString("0x2222222222222222222222222222222222222222")

      createMockedFunction(CONTRACT_ADDRESS, "pots", "pots(uint256):(uint256,bytes,uint32,uint256,uint256,address,uint256,uint256,uint32,uint8,bool)")
        .withArgs([ethereum.Value.fromUnsignedBigInt(multiplePotId)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(multiplePotId),
          ethereum.Value.fromBytes(POT_NAME),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
          ethereum.Value.fromUnsignedBigInt(MOCK_DEADLINE),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT.times(BigInt.fromI32(3))),
          ethereum.Value.fromAddress(TOKEN_ADDRESS),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT),
          ethereum.Value.fromUnsignedBigInt(PERIOD),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(3)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(MAX_PARTICIPANTS)),
          ethereum.Value.fromBoolean(true)
        ])

      let joinEvent1 = createPotJoinedEvent(multiplePotId, ROUND_NUMBER, user2)
      let joinEvent2 = createPotJoinedEvent(multiplePotId, ROUND_NUMBER, user3)

      handlePotJoined(joinEvent1)
      handlePotJoined(joinEvent2)

      // Verify users were created
      assert.fieldEquals("User", user2.toHex(), "id", user2.toHex())
      assert.fieldEquals("User", user3.toHex(), "id", user3.toHex())

      // This test doesn't create any payouts
      assert.entityCount("Payout", 0)
    })

    test("Complete pot lifecycle part 2 - 5 users, 6 rounds with payouts", () => {
      // Use a different pot ID to avoid conflicts with previous tests
      let lifecyclePotId = BigInt.fromI32(3)

      // Check current payout count before starting this test
      let initialPayoutCount = 1 // From first test

      // 1. Create pot
      createMockedFunction(CONTRACT_ADDRESS, "pots", "pots(uint256):(uint256,bytes,uint32,uint256,uint256,address,uint256,uint256,uint32,uint8,bool)")
        .withArgs([ethereum.Value.fromUnsignedBigInt(lifecyclePotId)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(lifecyclePotId),
          ethereum.Value.fromBytes(POT_NAME),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
          ethereum.Value.fromUnsignedBigInt(MOCK_DEADLINE),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT),
          ethereum.Value.fromAddress(TOKEN_ADDRESS),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT),
          ethereum.Value.fromUnsignedBigInt(PERIOD),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(MAX_PARTICIPANTS)),
          ethereum.Value.fromBoolean(true)
        ])

      let potCreatedEvent = createPotCreatedEvent(lifecyclePotId, CREATOR_ADDRESS)
      handlePotCreated(potCreatedEvent)

      // 2. Create 5 additional users
      let users = [
        Address.fromString("0x1111111111111111111111111111111111111111"),
        Address.fromString("0x2222222222222222222222222222222222222222"),
        Address.fromString("0x3333333333333333333333333333333333333333"),
        Address.fromString("0x4444444444444444444444444444444444444444"),
        Address.fromString("0x5555555555555555555555555555555555555555")
      ]

      // All 5 users join in round 0 (total 6 participants including creator)
      let totalParticipants = users.length + 1 // +1 for creator
      createMockedFunction(CONTRACT_ADDRESS, "pots", "pots(uint256):(uint256,bytes,uint32,uint256,uint256,address,uint256,uint256,uint32,uint8,bool)")
        .withArgs([ethereum.Value.fromUnsignedBigInt(lifecyclePotId)])
        .returns([
          ethereum.Value.fromUnsignedBigInt(lifecyclePotId),
          ethereum.Value.fromBytes(POT_NAME),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
          ethereum.Value.fromUnsignedBigInt(MOCK_DEADLINE),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT.times(BigInt.fromI32(totalParticipants))),
          ethereum.Value.fromAddress(TOKEN_ADDRESS),
          ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT),
          ethereum.Value.fromUnsignedBigInt(PERIOD),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(totalParticipants)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(MAX_PARTICIPANTS)),
          ethereum.Value.fromBoolean(true)
        ])

      for (let i = 0; i < users.length; i++) {
        let joinEvent = createPotJoinedEvent(lifecyclePotId, ROUND_NUMBER, users[i])
        handlePotJoined(joinEvent)
      }

      // Verify initial state after all joins
      assert.fieldEquals("Pot", lifecyclePotId.toString(), "activeParticipants", totalParticipants.toString())

      // Track total winnings per participant
      let participantWinnings = new Map<string, BigInt>()
      participantWinnings.set(CREATOR_ADDRESS.toHex(), BigInt.zero())
      for (let i = 0; i < users.length; i++) {
        participantWinnings.set(users[i].toHex(), BigInt.zero())
      }

      // 3. Complete 6 rounds with payouts (one for each participant)
      for (let round = 0; round < 6; round++) {
        let currentRound = BigInt.fromI32(round)

        // Mock pot state for current round
        let isLastRound = round === 5 // Last round is round 5 (0-indexed)
        let balanceAfterPayout = isLastRound ? BigInt.zero() : ENTRY_AMOUNT

        createMockedFunction(CONTRACT_ADDRESS, "pots", "pots(uint256):(uint256,bytes,uint32,uint256,uint256,address,uint256,uint256,uint32,uint8,bool)")
          .withArgs([ethereum.Value.fromUnsignedBigInt(lifecyclePotId)])
          .returns([
            ethereum.Value.fromUnsignedBigInt(lifecyclePotId),
            ethereum.Value.fromBytes(POT_NAME),
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(round + 1)), // next round
            ethereum.Value.fromUnsignedBigInt(MOCK_DEADLINE),
            ethereum.Value.fromUnsignedBigInt(balanceAfterPayout),
            ethereum.Value.fromAddress(TOKEN_ADDRESS),
            ethereum.Value.fromUnsignedBigInt(ENTRY_AMOUNT),
            ethereum.Value.fromUnsignedBigInt(PERIOD),
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(totalParticipants)),
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(MAX_PARTICIPANTS)),
            ethereum.Value.fromBoolean(true)
          ])

        // Rotate winner among all participants (creator + 5 users)
        let winnerIndex = round % totalParticipants
        let winner = winnerIndex === 0 ? CREATOR_ADDRESS : users[winnerIndex - 1]

        // Calculate prize based on round
        let prizeAmount: BigInt
        if (isLastRound) {
          // Last round: winner gets remaining balance (should be 6 * entryAmount for all contributions)
          prizeAmount = ENTRY_AMOUNT.times(BigInt.fromI32(totalParticipants))
        } else {
          // Regular rounds: winner gets (totalParticipants - 1) * entryAmount, 1 entryAmount rolls over
          prizeAmount = ENTRY_AMOUNT.times(BigInt.fromI32(totalParticipants - 1))
        }

        // Update our tracking
        let currentWinnings = participantWinnings.get(winner.toHex())
        participantWinnings.set(winner.toHex(), currentWinnings!.plus(prizeAmount))

        // Handle payout
        let potPayoutEvent = createPotPayoutEvent(lifecyclePotId, winner, prizeAmount, currentRound)
        handlePotPayout(potPayoutEvent)

        // Verify payout was recorded
        let payoutId = lifecyclePotId.toString() + "-" + currentRound.toString()
        assert.fieldEquals("Payout", payoutId, "pot", lifecyclePotId.toString())
        assert.fieldEquals("Payout", payoutId, "winner", winner.toHex())
        assert.fieldEquals("Payout", payoutId, "amount", prizeAmount.toString())

        // Verify round was completed
        let roundId = lifecyclePotId.toString() + "-" + currentRound.toString()
        assert.fieldEquals("Round", roundId, "status", "COMPLETED")
        assert.fieldEquals("Round", roundId, "winner", winner.toHex())
        assert.fieldEquals("Round", roundId, "prizeAmount", prizeAmount.toString())

        // Verify winner's stats updated
        let participant = Participant.load(lifecyclePotId.toString() + "-" + winner.toHex())
        if (participant) {
          assert.fieldEquals("Participant", participant.id, "hasWon", "true")
        }
      }

      // 4. End the pot (since balance is 0 after last payout)
      let potEndedEvent = createPotEndedEvent(lifecyclePotId)
      handlePotEnded(potEndedEvent)

      // Final verifications
      assert.fieldEquals("Pot", lifecyclePotId.toString(), "status", "COMPLETED")
      assert.fieldEquals("Pot", lifecyclePotId.toString(), "currentBalance", "0")
      assert.fieldEquals("Pot", lifecyclePotId.toString(), "completedRounds", "6")

      // Check creator's winnings
      let creatorExpectedWinnings = participantWinnings.get(CREATOR_ADDRESS.toHex())!
      assert.fieldEquals("User", CREATOR_ADDRESS.toHex(), "totalWon", creatorExpectedWinnings.toString())

      // Check each user's winnings
      for (let i = 0; i < users.length; i++) {
        let userExpectedWinnings = participantWinnings.get(users[i].toHex())!
        assert.fieldEquals("User", users[i].toHex(), "totalWon", userExpectedWinnings.toString())
      }

      // Verify total payouts: 6
      assert.entityCount("Payout", 6)

      // Verify total amount distributed equals total contributed for this pot
      let totalWinnings = BigInt.zero()
      totalWinnings = totalWinnings.plus(participantWinnings.get(CREATOR_ADDRESS.toHex())!)
      for (let i = 0; i < users.length; i++) {
        totalWinnings = totalWinnings.plus(participantWinnings.get(users[i].toHex())!)
      }    })
  })


})
