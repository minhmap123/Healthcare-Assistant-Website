import API from './api';
import { requestAPI } from './request';
import { handleError, ApiResponse } from './response';

import { 
  Message, 
  ChatConversation, 
  ChatDetailData, 
  SaveChatRequest,
} from '../../types/chat';

const API_URL = API.defaults.baseURL || '';

const ENDPOINTS = {
  STREAM: '/chat/stream',
  SAVE: '/chat/save',
  HISTORY: '/chat/history',
  CHAT_DETAIL: (id: string) => `/chat/${id}`,
  DELETE: (id: string) => `/chat/${id}`,
  UPDATE_TITLE: (id: string) => `/chat/${id}/title`,
  UPLOAD_SKIN_IMAGE: '/chat/upload-skin-image'
};

/**
 * Gọi API stream chat với backend
 * @param message Tin nhắn người dùng
 * @param history Lịch sử trò chuyện
 * @param conversationId ID cuộc trò chuyện (nếu có)
 * @returns Promise với response
 */
export async function streamChat(
  message: string,
  history: Message[],
  conversationId: string | null = null
) {
  const baseURL = API.defaults.baseURL || '';
  
  return fetch(`${baseURL}${ENDPOINTS.STREAM}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      history,
      conversationId
    }),
    credentials: 'include'
  });
}

export async function saveChatHistory(messages: Message[], title: string): Promise<ApiResponse> {
  try {
    const request: SaveChatRequest = { messages, title };
    const response = await requestAPI(API_URL, ENDPOINTS.SAVE, 'POST', request);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  } catch (error: any) {
    const errorResponse = handleError(error);
    throw errorResponse;
  }
}

export async function getChatHistory(): Promise<ChatConversation[]> {
  try {
    const response = await requestAPI(API_URL, ENDPOINTS.HISTORY, 'GET');
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data.data;
  } catch (error: any) {
    const errorResponse = handleError(error);
    throw errorResponse;
  }
}

export async function getChatById(chatId: string): Promise<ChatDetailData> {
  try {
    const response = await requestAPI(API_URL, ENDPOINTS.CHAT_DETAIL(chatId), 'GET');
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data.data;
  } catch (error: any) {
    const errorResponse = handleError(error);
    throw errorResponse;
  }
}

export async function deleteChat(chatId: string): Promise<ApiResponse> {
  try {
    const response = await requestAPI(API_URL, ENDPOINTS.DELETE(chatId), 'DELETE');
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  } catch (error: any) {
    const errorResponse = handleError(error);
    throw errorResponse;
  }
}

export async function updateConversationTitle(chatId: string, title: string): Promise<ApiResponse> {
  try {
    const response = await requestAPI(API_URL, ENDPOINTS.UPDATE_TITLE(chatId), 'PUT', { title });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  } catch (error: any) {
    const errorResponse = handleError(error);
    throw errorResponse;
  }
}

/**
 * Upload skin image for disease classification
 * @param file Image file to upload
 * @param conversationId Conversation ID to link the image with (optional)
 * @returns Promise with API response
 */
export async function uploadSkinImage(file: File, conversationId?: string | null): Promise<ApiResponse> {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    if (conversationId) {
      formData.append('conversationId', conversationId);
    }
    
    const baseURL = API.defaults.baseURL || '';
    
    const response = await fetch(`${baseURL}${ENDPOINTS.UPLOAD_SKIN_IMAGE}`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data.error || 'Lỗi khi tải lên hình ảnh');
    }
    
    return data;
  } catch (error: any) {
    const errorResponse = handleError(error);
    throw errorResponse;
  }
}