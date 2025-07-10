import {
  AllowedParticipantAdded as AllowedParticipantAddedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PotAllowRequested as PotAllowRequestedEvent,
  PotCreated as PotCreatedEvent,
  PotEnded as PotEndedEvent,
  PotJoined as PotJoinedEvent,
  PotPayout as PotPayoutEvent
} from "../generated/Potluck/Potluck"
import {
  AllowedParticipantAdded,
  OwnershipTransferred,
  PotAllowRequested,
  PotCreated,
  PotEnded,
  PotJoined,
  PotPayout
} from "../generated/schema"

export function handleAllowedParticipantAdded(
  event: AllowedParticipantAddedEvent
): void {
  let entity = new AllowedParticipantAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.potId = event.params.potId
  entity.user = event.params.user

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePotAllowRequested(event: PotAllowRequestedEvent): void {
  let entity = new PotAllowRequested(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.potId = event.params.potId
  entity.requestor = event.params.requestor

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePotCreated(event: PotCreatedEvent): void {
  let entity = new PotCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.potId = event.params.potId
  entity.creator = event.params.creator

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePotEnded(event: PotEndedEvent): void {
  let entity = new PotEnded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.potId = event.params.potId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePotJoined(event: PotJoinedEvent): void {
  let entity = new PotJoined(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.potId = event.params.potId
  entity.roundId = event.params.roundId
  entity.user = event.params.user

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePotPayout(event: PotPayoutEvent): void {
  let entity = new PotPayout(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.potId = event.params.potId
  entity.winner = event.params.winner
  entity.amount = event.params.amount
  entity.round = event.params.round

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
