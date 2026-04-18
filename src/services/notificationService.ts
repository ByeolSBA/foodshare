import { io, Socket } from 'socket.io-client';

export interface NotificationData {
  type: 'new_message' | 'donation_status_change' | 'new_donation';
  data: any;
  timestamp: string;
}

class NotificationService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(userId: string, token: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    const serverUrl = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') 
      ? window.location.origin 
      : 'http://localhost:3001';

    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners();
    
    // Autenticar usuario después de conectar
    this.socket.emit('authenticate', userId);
    
    console.log('Connecting to notification service...');
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to notification service');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from notification service:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleReconnect();
    });

    // Eventos de notificación
    this.socket.on('new_message', (data) => {
      console.log('New message received:', data);
      this.dispatchNotification('new_message', data);
    });

    this.socket.on('donation_status_change', (data) => {
      console.log('Donation status changed:', data);
      this.dispatchNotification('donation_status_change', data);
    });

    this.socket.on('new_donation', (data) => {
      console.log('New donation available:', data);
      this.dispatchNotification('new_donation', data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private dispatchNotification(type: string, data: any) {
    const notification: NotificationData = {
      type: type as any,
      data,
      timestamp: new Date().toISOString()
    };

    // Disparar evento personalizado para que los componentes puedan escuchar
    window.dispatchEvent(new CustomEvent('foodshare_notification', {
      detail: notification
    }));

    // También mostrar notificación del navegador si está disponible
    if ('Notification' in window && Notification.permission === 'granted') {
      this.showBrowserNotification(notification);
    }
  }

  private showBrowserNotification(notification: NotificationData) {
    let title = '';
    let body = '';
    let icon = '/favicon.ico';

    switch (notification.type) {
      case 'new_message':
        title = 'Nuevo mensaje';
        body = notification.data.content || 'Tienes un nuevo mensaje';
        break;
      case 'donation_status_change':
        title = 'Actualización de donación';
        body = `La donación "${notification.data.title}" ha cambiado de estado`;
        break;
      case 'new_donation':
        title = 'Nueva donación disponible';
        body = `Nueva donación: "${notification.data.title}"`;
        break;
    }

    try {
      new Notification(title, {
        body,
        icon,
        tag: `${notification.type}_${notification.data.id}`,
        requireInteraction: true
      });
    } catch (error) {
      console.warn('Error showing browser notification:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Disconnected from notification service');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Método para solicitar permisos de notificación del navegador
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
