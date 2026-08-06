# System Design

> **Maintenance note:** Only document design intent, non-obvious constraints, and tradeoffs that cannot be learned directly from the code. Do NOT duplicate behavior, data structures, or implementation details that the code or schema already makes clear.

This document records some of the design concepts and decisions behind Boluo. It intentionally avoids design details and contains only high-level guiding principles.

## Design Principles

- TTRPG-focused. Boluo is not a general-purpose IM or collaboration tool. It is designed to make playing TTRPGs easier.
- Simple. The architecture itself should remain simple. Complex systems that work invariably evolve from simple systems that work.
- Composable. Users should be able to flexibly combine a small set of features to meet their needs.
- Types. Aim to make invalid states unrepresentable. Share type definitions across system boundaries.

## Current State and Future Plans

The Boluo server currently runs as a single node. There are no caches shared across multiple instances. The PostgreSQL database is the source of truth, with extensive in-memory caching.

In the future, Spaces are planned to be sharded, with a single node maintaining the authoritative in-memory state of each Space. Changes will first be written to a recoverable persistent log, then projected asynchronously into PostgreSQL.

## Hierarchy

Space is the basic unit, similar to a Discord server. One or more of a group's campaigns are hosted in a Space.

A Space has multiple Channels, where games are actually played. A Channel can be private, keeping it secret even from some players who are members of the Space.

A Space's child resources, including Channels and Members, are cached and managed by an actor called the Space Runtime.

There is also a Mailbox structure for frequently changing state such as Messages and Previews. This state is stored in the Mailbox event stream, with each user operation producing an event. When a new client connects to a Space, stored events are sent to the client, which replays them to reconstruct the state.

### Entry System

The Entry system is inspired by the Entity-Component-System (ECS) pattern used in game engines. It is designed to support TTRPG game state such as hit points, attributes, and Buffs.

The current implementation is only an MVP intended to support simple game-state tracking. However, the design should leave room for more complex state such as spells, inventories, and turn order, as well as user-authored extensions in the future.

#### Entries and Components

An Entry represents an entity in the game and is inspired by an Entity in ECS. It is essentially an identifier with some metadata used for display, lookup, and organization.

An Entry can have multiple Components. A Component represents one piece of an Entry's state and is inspired by, well, a Component in ECS. For example, an HP Entry may have a Counter Component, with its actual data stored in that Component. An Entry can currently have at most one Component of each type. Component types use namespaced identifiers such as `core/counter` or `dnd5e/spell-slot`.

Components describe what an Entry can do, not what it is. For example, an Entry with both `core/portrait` and `core/counter` appears as a portrait in one view and a game variable in another.

For example, a simplified HP Entry could be represented as:

```json
{
  "key": "hp",
  "displayName": "Hit Points",
  "components": {
    "core/counter": {
      "value": 12,
      "max": 20
    }
  }
}
```

(This is only an example, not the actual shape.)

Open-ended Component payloads use JSON. Dedicated payload types are reserved for data that benefits from relational constraints or specialized queries. The [Shared Primary Key representation](https://www.parsonsmatt.org/2019/03/19/sum_types_in_sql.html) favors extensibility over enforcing that every Component has a payload; readers therefore omit and report incomplete Components instead of rejecting the whole Entry.

Component history just a player-facing record. It stores a JSON projection so historical presentation does not depend on the live payload type or referenced resources.

#### Scopes and Characters

A Scope is a container for Entries within a Space. It defines an access-control and identifier boundary. A Space has a shared Scope, and each Character has a required main Character Scope. Additional Character Scopes can be associated through named purposes. A Character's HP, for example, belongs to its main Character Scope.

The first valid Portrait in Entry order is the Character's main portrait. Deriving it from order avoids a separate pointer that could become inconsistent.

Entries do not have their own access control. Access is controlled through their Scope's access policy, using the same policy model as Notes. A Character may use additional named Scopes for state that needs different access. Scopes do not inherit permissions from other Scopes.

An Entry's key and aliases are unique within the same Scope. Entries in different Scopes may use the same name. This supports command parsing and references in chat.

Entry order uses fractional positions so inserting or moving one Entry does not renumber unrelated Entries.

#### Concurrency

Versions are generally used as optimistic locks to handle concurrent changes.
