import { Message } from '../types';
import { getApiBase, getAuthHeaders as getDefaultAuthHeaders } from './apiClient';

function getAuthHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function normalizeMessage(record: any): Message {
  return {
    id: record.id,
    senderId: record.sender_id || record.senderId,
    receiverId: record.receiver_id || record.receiverId,
    donationId: record.donation_id || record.donationId,
    content: record.content,
    timestamp: record.timestamp || new Date().toISOString(),
  };
}

export async function sendMessageApi(receiverId: string, content: string, donationId: string, token: string) {
  const response = await fetch(`${getApiBase()}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ receiverId, content, donationId }),
  });
  return handleResponse<{ message: string; messageId: string }>(response);
}

export async function fetchConversation(userId: string, donationId: string | undefined, token: string): Promise<Message[]> {
  const url = donationId
    ? `${getApiBase()}/messages/conversation/${userId}?donationId=${encodeURIComponent(donationId)}`
    : `${getApiBase()}/messages/conversation/${userId}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });
  const data = await handleResponse<any[]>(response);
  return Array.isArray(data) ? data.map(normalizeMessage) : [];
}