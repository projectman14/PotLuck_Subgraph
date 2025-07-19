# Potluck Subgraph

## Overview

This repository contains a comprehensive subgraph implementation for the **Potluck smart contract**, a decentralized application that manages recurring token contribution pools where participants take turns winning accumulated funds.

## What is Potluck?

Potluck is a smart contract system where:
- Users create contribution pools (pots) with fixed entry amounts and time periods
- Participants join rounds by contributing tokens
- One random participant wins each round's accumulated funds
- The system continues for multiple rounds until all participants have won
- Creators can set maximum participants and control public/private access

**Contract Address**: `0xc2cdcEec8ca258Ebb54654FB294ba63fF8038469`

## Subgraph Features

This subgraph indexes and provides GraphQL access to all Potluck contract events and state:

### Entities Tracked
- **Pots**: Complete pot lifecycle with metadata, status, and statistics
- **Users**: Participant profiles with contribution and winning history
- **Participants**: User participation records per pot
- **Rounds**: Individual round data with participants and outcomes
- **Contributions**: All user contributions to pots and rounds
- **Payouts**: Winner records with amounts and timestamps
- **AllowedUsers**: Permission management for private pots
- **AllowRequests**: Access requests for private pots
- **PlatformStats**: Global platform statistics and metrics

### Events Indexed
- `PotCreated`: New pot creation
- `PotJoined`: User joining pots/rounds
- `PotPayout`: Winner selection and prize distribution
- `PotAllowRequested`: Access requests for private pots
- `AllowedParticipantAdded`: Permission grants
- `PotEnded`: Pot completion

## Test Coverage

### ✅ All Tests Passing

The subgraph includes a comprehensive test suite covering:

#### Individual Event Handlers
- **PotCreated**: Pot creation with all entity relationships
- **PotJoined**: New and existing user participation
- **PotPayout**: Winner selection and statistics updates
- **PotAllowRequested**: Access request handling
- **AllowedParticipantAdded**: Permission management
- **PotEnded**: Pot completion and cleanup

#### Integration Tests
- **Complete Pot Lifecycle**: End-to-end pot creation, joining, payout, and completion
- **Multiple Users**: Complex multi-user scenarios
- **Complete 6-Round Lifecycle**: Full potluck cycle with 6 participants across 6 rounds

## Getting Started

### Prerequisites
- Node.js (v16+)
- Graph CLI
- Docker (for local Graph Node)

### Installation

1. **Clone the repository**
```
git clone https://github.com/projectman14/PotLuck_Subgraph
cd potluckSubgraph
```
2. **Install dependencies**
```
npm install
```
3. **Run tests**
```
graph test
```


## GraphQL Queries

### Example Queries

**Get all active pots:**
```
{
    pots(where: { status: ACTIVE }) {
        id
        name
        creator
        entryAmount
        currentRound
        activeParticipants
        participants {
            user {
                address
            }
        }
    }
}  
```
**Get user's participation history:**
```
{
    user(id: "0x...") {
        address
        totalPots
        totalWon
        participants {
            pot {
                name
            }
            hasWon
            wonAmount
        }
    }
}
```
**Get pot's complete rounds:**
```
{
  pot(id: "1") {
    rounds {
      roundNumber
    winner {
        address
    }
    prizeAmount
    status
    }
  }
}
```