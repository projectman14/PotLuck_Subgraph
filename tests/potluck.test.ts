import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Address } from "@graphprotocol/graph-ts"
import { AllowedParticipantAdded } from "../generated/schema"
import { AllowedParticipantAdded as AllowedParticipantAddedEvent } from "../generated/Potluck/Potluck"
import { handleAllowedParticipantAdded } from "../src/potluck"
import { createAllowedParticipantAddedEvent } from "./potluck-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let potId = BigInt.fromI32(234)
    let user = Address.fromString("0x0000000000000000000000000000000000000001")
    let newAllowedParticipantAddedEvent = createAllowedParticipantAddedEvent(
      potId,
      user
    )
    handleAllowedParticipantAdded(newAllowedParticipantAddedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("AllowedParticipantAdded created and stored", () => {
    assert.entityCount("AllowedParticipantAdded", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AllowedParticipantAdded",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "potId",
      "234"
    )
    assert.fieldEquals(
      "AllowedParticipantAdded",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "user",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
