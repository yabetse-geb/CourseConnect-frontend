
# API Specification: Grouping Concept

**Purpose:** Manage the lifecycle of groups and their membership.

**Note:** All ID types (`User`, `Group`) are represented as strings.

***

## API Endpoints

### POST /api/Grouping/createGroup

**Description:** Creates a new group with the authenticated user as the first admin.

**Requirements:**

*   A group with the given `name` must not already exist.

**Effects:**

*   Creates a new `Group` with the authenticated user as the sole member and admin.
*   Returns the new `Group`'s identifier.

**Request Body:**

```json
{
  "session": "string",
  "name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "group": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Grouping/deleteGroup

**Description:** Deletes a group.

**Requirements:**

*   The authenticated user (identified by `session`) must be an admin of the specified `group`.

**Effects:**

*   Deletes the `group`.

**Request Body:**

```json
{
  "session": "string",
  "group": "string"
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

***

### POST /api/Grouping/renameGroup

**Description:** Renames a group.

**Requirements:**

*   The authenticated user must be an admin of the specified `group`.
*   No other group exists with `newName`.

**Effects:**

*   Updates the `name` of the `group` to `newName`.

**Request Body:**

```json
{
  "session": "string",
  "group": "string",
  "newName": "string"
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

***

### POST /api/Grouping/requestToJoin

**Description:** The authenticated user requests to join a group.

**Requirements:**

*   The `group` must exist.
*   The authenticated user must not already be a member or have a pending request.

**Effects:**

*   Creates a pending join request for the user to the specified `group`.

**Request Body:**

```json
{
  "session": "string",
  "group": "string"
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

***

### POST /api/Grouping/confirmRequest

**Description:** An admin confirms a user's request to join a group.

**Requirements:**

*   The authenticated user must be an admin of the `group`.
*   The `requester` must have a pending join request for the `group`.

**Effects:**

*   Adds the `requester` to the `group`'s members with the 'MEMBER' role.
*   Removes the pending join request.

**Request Body:**

```json
{
  "session": "string",
  "group": "string",
  "requester": "string"
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

***

### POST /api/Grouping/declineRequest

**Description:** An admin declines a user's request to join a group.

**Requirements:**

*   The authenticated user must be an admin of the `group`.
*   The `requester` must have a pending join request for the `group`.

**Effects:**

*   Removes the pending join request.

**Request Body:**

```json
{
  "session": "string",
  "group": "string",
  "requester": "string"
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

***

### POST /api/Grouping/removeMember

**Description:** An admin removes a member from a group.

**Requirements:**

*   The authenticated user must be an admin of the `group`.
*   The `member` must be a member of the `group`.
*   The `member` is not the last admin of the group.

**Effects:**

*   Removes the `member` from the `group`.

**Request Body:**

```json
{
  "session": "string",
  "group": "string",
  "member": "string"
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

***

### POST /api/Grouping/adjustRole

**Description:** An admin changes the role of a group member.

**Requirements:**

*   The authenticated user must be an admin of the `group`.
*   The `member` must be a member of the `group`.
*   `newRole` must be either "ADMIN" or "MEMBER".

**Effects:**

*   Updates the `member`'s role in the `group` to `newRole`.

**Request Body:**

```json
{
  "session": "string",
  "group": "string",
  "member": "string",
  "newRole": "string"
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

***

### POST /api/Grouping/_getUserGroups

**Description:** Retrieves all groups that the authenticated user is a member of.

**Request Body:**

```json
{
  "session": "string"
}
```

**Success Response Body (Query):**

```json
{
  "groups": ["string", "string"]
}
```

***

### POST /api/Grouping/_getMembers

**Description:** Retrieves all members of a specific group.

**Requirements:**

*   The authenticated user must be a member of the `group`.

**Effects:**

*   Returns a list of members, excluding users who have blocked the requesting user.

**Request Body:**

```json
{
  "session": "string",
  "group": "string"
}
```

**Success Response Body (Query):**

```json
{
  "members": [
    { "member": "string" },
    { "member": "string" }
  ]
}
```

***

### POST /api/Grouping/_getGroupRequests

**Description:** Retrieves all pending join requests for a group.

**Requirements:**

*   The authenticated user must be an admin of the `group`.

**Effects:**

*   Returns a list of users who have requested to join, excluding users who have blocked the requesting user.

**Request Body:**

```json
{
  "session": "string",
  "group": "string"
}
```

**Success Response Body (Query):**

```json
{
  "requests": [
    { "joinRequester": "string" },
    { "joinRequester": "string" }
  ]
}
```

***

### POST /api/Grouping/_getUserRequests

**Description:** Retrieves all groups that the authenticated user has requested to join.

**Requirements:**

*   The user must be authenticated via a valid session.

**Effects:**

*   Returns a list of groups that the user has pending join requests for.

**Request Body:**

```json
{
  "session": "string"
}
```

**Success Response Body (Query):**

```json
{
  "groups": [
    {
      "group": "string"
    },
    {
      "group": "string"
    }
  ]
}
```

***

### POST /api/Grouping/_getAdmins

**Description:** Retrieves all admins of a specific group.

**Requirements:**

*   The authenticated user must be a member of the `group`.

**Request Body:**

```json
{
  "session": "string",
  "group": "string"
}
```

**Success Response Body (Query):**

```json
{
  "admins": ["string", "string"]
}
```

***

### POST /api/Grouping/_isGroupMember

**Description:** Checks if the authenticated user is a member of a specific group.

**Request Body:**

```json
{
  "session": "string",
  "group": "string"
}
```

**Success Response Body (Query):**

```json
{
  "inGroup": true
}
```

***

### POST /api/Grouping/_isGroupAdmin

**Description:** Checks if the authenticated user is an admin of a specific group.

**Request Body:**

```json
{
  "session": "string",
  "group": "string"
}
```

**Success Response Body (Query):**

```json
{
  "isAdmin": false
}
```

***

### POST /api/Grouping/_getGroupName

**Description:** Retrieves a group's name by its ID. This is a public query.

**Request Body:**

```json
{
  "group": "string"
}
```

**Success Response Body (Query):**

```json
{
  "name": "string"
}
```
**Note:** `name` will be empty string `""` if no group is found with that ID.

***

### POST /api/Grouping/_getGroups

**Description:** Retrieves a list of all groups in the system. This is a public query.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
{
  "groups": ["string", "string"]
}
```

***

### POST /api/_getMembersInEvents

**Description:** Retrieves a nested mapping from events to groups to users attending those events. This is a sync endpoint.

**Sync:** GetMembersInEvents

**Flow:**

1. Authenticates user via session
2. For each group in the groups array, gets members
3. Filters out members who are blocking the requesting user
4. For each remaining member, gets their schedule
5. Filters to only events in the requested events array
6. Builds a nested mapping from event -> group -> users that are attending that event in that group
7. Returns the nested mapping

**Request Body:**

{
  "session": "string",
  "groups": ["string", "string"],
  "events": ["string", "string"]
}**Success Response Body (Sync):**
n
{
  "results": {
    "eventId1": {
      "groupId1": ["userId1", "userId2"],
      "groupId2": ["userId3"]
    },
    "eventId2": {
      "groupId1": ["userId4"]
    }
  }
}**Note:** The response is a nested mapping where:
- Top-level keys are event IDs (as strings)
- Each event maps to an object where keys are group IDs (as strings)
- Each group maps to an array of user IDs who are attending that event and are members of that group
- Users who are blocking the requesting user are excluded
- Events with no groups having members will have empty objects: `{ "eventId": {} }`

***
