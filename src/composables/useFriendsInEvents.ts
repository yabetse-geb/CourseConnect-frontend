import { ref, watch, type Ref, type ComputedRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getAllFriendsBySession } from '@/api/concepts/FriendingAPI'
import { getUserSchedule } from '@/api/concepts/SchedulingAPI'
import { getUsername } from '@/api/syncs/auth'

/**
 * Manually fetches friends enrolled in events by:
 * 1. Getting all friends
 * 2. For each friend, fetching their schedule
 * 3. Matching event IDs
 * 4. Converting friend IDs to usernames
 * 
 * TODO: Replace this function with a single API call when backend supports
 * getFriendsInEvents(eventIds) endpoint. The replacement should match this function's
 * signature and return type.
 */
async function fetchFriendsForEventsManually(
  eventIds: string[],
  session: string
): Promise<Map<string, string[]>> {
  // Return empty map if no events to check
  if (eventIds.length === 0) {
    return new Map()
  }

  const friendsByEventId = new Map<string, string[]>()
  
  // Initialize map with empty arrays for all events
  eventIds.forEach(eventId => {
    friendsByEventId.set(eventId, [])
  })

  try {
    // Step 1: Get all friends
    const friendsResponse = await getAllFriendsBySession(session)
    let friendIds: string[] = []

    // Handle different response formats
    if (Array.isArray(friendsResponse)) {
      friendIds = friendsResponse
    } else if (friendsResponse && typeof friendsResponse === 'object') {
      if ('friends' in friendsResponse && Array.isArray(friendsResponse.friends)) {
        friendIds = friendsResponse.friends
      } else if ('friend' in friendsResponse && Array.isArray(friendsResponse.friend)) {
        friendIds = friendsResponse.friend
      }
    }

    // Normalize friend IDs (handle cases where array contains objects)
    friendIds = friendIds
      .map((item: any) => {
        if (typeof item === 'string' && item.length > 0) {
          return item
        }
        if (typeof item === 'object' && item !== null) {
          if (item.friend && typeof item.friend === 'string') return item.friend
          if (item.friendId && typeof item.friendId === 'string') return item.friendId
          if (item.user && typeof item.user === 'string') return item.user
          if (item.id && typeof item.id === 'string') return item.id
          const keys = Object.keys(item)
          if (keys.length === 1) {
            const firstKey = keys[0]
            if (firstKey && typeof item[firstKey] === 'string') {
              return item[firstKey]
            }
          }
        }
        return null
      })
      .filter((id): id is string => id !== null && typeof id === 'string')

    if (friendIds.length === 0) {
      return friendsByEventId
    }

    // Step 2: Fetch schedules for all friends in parallel
    const friendSchedules = await Promise.all(
      friendIds.map(async (friendId) => {
        try {
          const schedule = await getUserSchedule(friendId)
          return { friendId, schedule, error: null }
        } catch (error) {
          console.warn(`Failed to fetch schedule for friend ${friendId}:`, error)
          return { friendId, schedule: [], error }
        }
      })
    )

    // Step 3: Match event IDs and collect friend IDs per event
    const eventToFriendIds = new Map<string, string[]>()
    
    friendSchedules.forEach(({ friendId, schedule }) => {
      schedule.forEach((event) => {
        const eventId = event.event
        if (eventIds.includes(eventId)) {
          if (!eventToFriendIds.has(eventId)) {
            eventToFriendIds.set(eventId, [])
          }
          eventToFriendIds.get(eventId)!.push(friendId)
        }
      })
    })

    // Step 4: Convert friend IDs to usernames in parallel
    const usernamePromises = new Map<string, Promise<string | null>>()
    
    // Create promises for all unique friend IDs
    friendIds.forEach(friendId => {
      if (!usernamePromises.has(friendId)) {
        usernamePromises.set(
          friendId,
          getUsername(friendId).catch(() => null)
        )
      }
    })

    // Wait for all username fetches to complete
    const usernameMap = new Map<string, string>()
    await Promise.all(
      Array.from(usernamePromises.entries()).map(async ([friendId, promise]) => {
        const username = await promise
        if (username) {
          usernameMap.set(friendId, username)
        }
      })
    )

    // Step 5: Build final map with usernames
    eventIds.forEach(eventId => {
      const friendIdsForEvent = eventToFriendIds.get(eventId) || []
      const usernames = friendIdsForEvent
        .map(friendId => usernameMap.get(friendId))
        .filter((username): username is string => username !== undefined && username !== null)
        .sort()
      friendsByEventId.set(eventId, usernames)
    })

    return friendsByEventId
  } catch (error) {
    console.error('Error fetching friends for events:', error)
    throw error
  }
}

/**
 * Composable for fetching and tracking which friends are enrolled in specific events.
 * 
 * @param eventIds - Reactive array or computed property of event IDs to check
 * @returns Object containing:
 *   - friendsByEventId: Reactive Map of eventId -> array of friend usernames
 *   - loading: Reactive boolean indicating if data is being fetched
 *   - error: Reactive string containing error message, or null if no error
 */
export function useFriendsInEvents(
  eventIds: Ref<string[]> | ComputedRef<string[]>
) {
  const friendsByEventId = ref<Map<string, string[]>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const authStore = useAuthStore()

  /**
   * Fetches friends for the given event IDs.
   * This is the main data fetching function that can be easily replaced
   * when a single backend query becomes available.
   */
  async function fetchFriends() {
    const currentEventIds = Array.isArray(eventIds.value) ? eventIds.value : []
    
    // Don't fetch if no events or no session
    if (currentEventIds.length === 0) {
      friendsByEventId.value = new Map()
      return
    }

    const session = authStore.session
    if (!session) {
      friendsByEventId.value = new Map()
      return
    }

    loading.value = true
    error.value = null

    try {
      // Use manual fetching for now
      // TODO: Replace fetchFriendsForEventsManually with single API call when available
      const result = await fetchFriendsForEventsManually(currentEventIds, session)
      friendsByEventId.value = result
    } catch (err: any) {
      error.value = err.message || 'Failed to load friends for events'
      console.error('Error in useFriendsInEvents:', err)
      // On error, keep existing data but clear it to avoid stale state
      friendsByEventId.value = new Map()
    } finally {
      loading.value = false
    }
  }

  // Watch for changes in eventIds and refetch
  watch(
    () => eventIds.value,
    async (newEventIds, oldEventIds) => {
      // Only refetch if the array actually changed (not just reference)
      const newIds = Array.isArray(newEventIds) ? [...newEventIds].sort().join(',') : ''
      const oldIds = Array.isArray(oldEventIds) ? [...oldEventIds].sort().join(',') : ''
      
      if (newIds !== oldIds) {
        await fetchFriends()
      }
    },
    { immediate: true }
  )

  // Helper function to get friends for a specific event
  function getFriendsForEvent(eventId: string): string[] {
    return friendsByEventId.value.get(eventId) || []
  }

  return {
    friendsByEventId,
    loading,
    error,
    getFriendsForEvent,
    refetch: fetchFriends
  }
}

