import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  AllowedParticipantAdded,
  OwnershipTransferred,
  PotAllowRequested,
  PotCreated,
  PotEnded,
  PotJoined,
  PotPayout
} from "../generated/Potluck/Potluck"

export function createAllowedParticipantAddedEvent(
  potId: BigInt,
  user: Address
): AllowedParticipantAdded {
  let allowedParticipantAddedEvent =
    changetype<AllowedParticipantAdded>(newMockEvent())

  allowedParticipantAddedEvent.parameters = new Array()

  allowedParticipantAddedEvent.parameters.push(
    new ethereum.EventParam("potId", ethereum.Value.fromUnsignedBigInt(potId))
  )
  allowedParticipantAddedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )

  return allowedParticipantAddedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPotAllowRequestedEvent(
  potId: BigInt,
  requestor: Address
): PotAllowRequested {
  let potAllowRequestedEvent = changetype<PotAllowRequested>(newMockEvent())

  potAllowRequestedEvent.parameters = new Array()

  potAllowRequestedEvent.parameters.push(
    new ethereum.EventParam("potId", ethereum.Value.fromUnsignedBigInt(potId))
  )
  potAllowRequestedEvent.parameters.push(
    new ethereum.EventParam("requestor", ethereum.Value.fromAddress(requestor))
  )

  return potAllowRequestedEvent
}

export function createPotCreatedEvent(
  potId: BigInt,
  creator: Address
): PotCreated {
  let potCreatedEvent = changetype<PotCreated>(newMockEvent())

  potCreatedEvent.parameters = new Array()

  potCreatedEvent.parameters.push(
    new ethereum.EventParam("potId", ethereum.Value.fromUnsignedBigInt(potId))
  )
  potCreatedEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  )

  return potCreatedEvent
}

export function createPotEndedEvent(potId: BigInt): PotEnded {
  let potEndedEvent = changetype<PotEnded>(newMockEvent())

  potEndedEvent.parameters = new Array()

  potEndedEvent.parameters.push(
    new ethereum.EventParam("potId", ethereum.Value.fromUnsignedBigInt(potId))
  )

  return potEndedEvent
}

export function createPotJoinedEvent(
  potId: BigInt,
  roundId: BigInt,
  user: Address
): PotJoined {
  let potJoinedEvent = changetype<PotJoined>(newMockEvent())

  potJoinedEvent.parameters = new Array()

  potJoinedEvent.parameters.push(
    new ethereum.EventParam("potId", ethereum.Value.fromUnsignedBigInt(potId))
  )
  potJoinedEvent.parameters.push(
    new ethereum.EventParam(
      "roundId",
      ethereum.Value.fromUnsignedBigInt(roundId)
    )
  )
  potJoinedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )

  return potJoinedEvent
}

export function createPotPayoutEvent(
  potId: BigInt,
  winner: Address,
  amount: BigInt,
  round: BigInt
): PotPayout {
  let potPayoutEvent = changetype<PotPayout>(newMockEvent())

  potPayoutEvent.parameters = new Array()

  potPayoutEvent.parameters.push(
    new ethereum.EventParam("potId", ethereum.Value.fromUnsignedBigInt(potId))
  )
  potPayoutEvent.parameters.push(
    new ethereum.EventParam("winner", ethereum.Value.fromAddress(winner))
  )
  potPayoutEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  potPayoutEvent.parameters.push(
    new ethereum.EventParam("round", ethereum.Value.fromUnsignedBigInt(round))
  )

  return potPayoutEvent
}
