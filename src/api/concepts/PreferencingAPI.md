[@api-extraction-from-code](../../tools/api-extraction-from-code.md)

[@implementation](implementation.md)

# API Specification: Preferencing Concept

**Purpose:** To allow a user to assign personal numerical scores to multiple items, and to query these scores.

---

## API Endpoints

### POST /api/Preferencing/addScore

**Description:** Assigns a score to an item for a user.

**Requirements:**
- The authenticated user (identified by `session`) must not have already scored this specific `item`.
- The `score` must be a valid number.

**Effects:**
- Adds a new preference with the given `session`, `item`, and `score`.

**Request Body:**
```json
{
  "session": "string",
  "item": "Item",
  "score": "Number"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Preferencing/updateScore

**Description:** Updates the score for a user's preference on a specific item.

**Requirements:**
- The authenticated user (identified by `session`) must have already scored the specified `item`.
- The `score` must be a valid number.

**Effects:**
- Updates the `score` for the authenticated user's preference on this `item` to the new value.

**Request Body:**
```json
{
  "session": "string",
  "item": "Item",
  "score": "Number"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Preferencing/removeScore

**Description:** Removes a user's score preference for a specific item.

**Requirements:**
- The authenticated user (identified by `session`) must have scored the specified `item`.

**Effects:**
- Removes the preference for the authenticated user and `item` combination.

**Request Body:**
```json
{
  "session": "string",
  "item": "Item"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Preferencing/_getScore

**Description:** Retrieves the score a user has assigned to a specific item.

**Requirements:**
- The authenticated user (identified by `session`) exists and `item` is associated with the user

**Effects:**
- return `score` associated with `item`

**Request Body:**
```json
{
  "session": "string",
  "item": "Item"
}
```

**Success Response Body (Query):**
```json
[
  {
    "score": "Number"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Preferencing/_getAllItems

**Description:** Retrieves all items that a user has scored.

**Requirements:**
- The authenticated user (identified by `session`) exists

**Effects:**
- list of Item `items` associated with the authenticated user is returned

**Request Body:**
```json
{
  "session": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "item": "Item"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---