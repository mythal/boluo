# System Design

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

To allow flexible extensions, the server does not constrain the internal structure of Component data. It treats the data as a dynamic structure and leaves interpretation to the client.

Some changes produce history records to help players understand what happened during the game. These records are not intended to reconstruct or roll back state.

#### Scopes and Characters

A Scope is a container for Entries. A Space creates its own root Scope. Each Character creates a Character Scope as a child of the Space Scope. A Character's HP, for example, belongs to its Character Scope.

Entries do not have their own access control. Access is controlled through Scope permissions. For example, a Character may have a public Character Scope. In the future, private child Scopes could be created beneath it to hold private Entries such as secret missions or plot points. For simplicity, permissions are not currently inherited between Scopes.

An Entry's key and aliases are unique within the same Scope. Entries in different Scopes may use the same name. This supports command parsing and references in chat.

#### Concurrency

Versions are generally used as optimistic locks to handle concurrent changes.
