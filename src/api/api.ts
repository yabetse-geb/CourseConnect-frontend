/**
 * API Service for ConceptBox
 * All endpoints use POST method as per API specification
 */

import axios, { type AxiosError } from 'axios';
import { logger } from './logger';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

interface ApiResponse {
  error?: string;
  [key: string]: any;
}

/**
 * Base axios wrapper with error handling and logging
 */
export async function apiCall(
  endpoint: string, 
  body: Record<string, any> = {}, 
  context: string = 'API Call'
): Promise<ApiResponse> {
  const url = `${API_BASE}${endpoint}`;
  
  logger.info(context, `Calling ${endpoint}`, { body });
  console.log(`API Call to ${url} with body:`, body);
  
  try {
    const response = await axiosInstance.post(endpoint, body);
    console.log(`API Response from ${url}:`, response);
    const data: ApiResponse = response.data;

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
    const axiosError = error as AxiosError<ApiResponse>;
    
    if (axiosError.response) {
      // API error response with error status code
      const errorMessage = axiosError.response.data?.error || 'Unknown error occurred';
      logger.error(context, errorMessage, { 
        endpoint,
        status: axiosError.response.status,
        body 
      });
      throw new Error(errorMessage);
    } else if (axiosError.request) {
      // Network error - request made but no response received
      logger.error(context, 'Network error - cannot reach server', { 
        endpoint,
        error: axiosError.message 
      });
      throw new Error('Network error - cannot reach server');
    } else {
      // Something else happened
      throw error;
    }
  }
}