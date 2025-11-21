/**
 * API Service for ConceptBox
 * All endpoints use POST method as per API specification
 */

import { logger } from './logger';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface ApiResponse {
  error?: string;
  [key: string]: any;
}

/**
 * Base fetch wrapper with error handling and logging
 */
export async function apiCall(
  endpoint: string, 
  body: Record<string, any> = {}, 
  context: string = 'API Call'
): Promise<ApiResponse> {
  const url = `${API_BASE}${endpoint}`;
  
  logger.info(context, `Calling ${endpoint}`, { body });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data: ApiResponse = await response.json();

    if (!response.ok) {
      // API error response with error status code
      const errorMessage = data.error || 'Unknown error occurred';
      logger.error(context, errorMessage, { 
        endpoint,
        status: response.status,
        body 
      });
      throw new Error(errorMessage);
    }

    // Check if the response data contains an error field even with 200 OK
    if (data.error) {
      const errorMessage = data.error;
      logger.error(context, errorMessage, { 
        endpoint,
        status: response.status,
        body 
      });
      throw new Error(errorMessage);
    }

    logger.success(context, `Success from ${endpoint}`, { data });
    return data;

  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      logger.error(context, 'Network error - cannot reach server', { 
        endpoint,
        error: error.message 
      });
      throw new Error('Network error - cannot reach server');
    }
    throw error;
  }
}