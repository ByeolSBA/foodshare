import { useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import notificationService from '../services/notificationService';

export const useNotifications = () => {
  const { currentUser, authToken } = useStore();

  // Conectar al servicio de notificaciones cuando el usuario está autenticado
  useEffect(() => {
    if (currentUser && authToken) {
      notificationService.connect(currentUser.id, authToken);
      
      // Solicitar permisos de notificación del navegador
      notificationService.requestNotificationPermission();
    }

    // Desconectar cuando el usuario cierra sesión
    return () => {
      notificationService.disconnect();
    };
  }, [currentUser, authToken]);

  // Escuchar notificaciones personalizadas
  useEffect(() => {
    const handleNotification = (event: any) => {
      const notification = event.detail;
      
      // Aquí puedes manejar diferentes tipos de notificaciones
      switch (notification.type) {
        case 'new_message':
          console.log('Nuevo mensaje recibido:', notification.data);
          // Puedes mostrar un toast, actualizar el estado global, etc.
          break;
          
        case 'donation_status_change':
          console.log('Cambio de estado de donación:', notification.data);
          // Actualizar lista de donaciones, mostrar notificación, etc.
          break;
          
        case 'new_donation':
          console.log('Nueva donación disponible:', notification.data);
          // Actualizar lista de donaciones, mostrar notificación, etc.
          break;
          
        default:
          console.log('Notificación desconocida:', notification);
      }
    };

    window.addEventListener('foodshare_notification', handleNotification);
    
    return () => {
      window.removeEventListener('foodshare_notification', handleNotification);
    };
  }, []);

  const sendNotification = useCallback((type: string, data: any) => {
    // Este método puede ser usado por componentes para enviar notificaciones
    // aunque normalmente las notificaciones vienen del servidor
    console.log('Sending notification:', { type, data });
  }, []);

  const isConnected = notificationService.isConnected();

  return {
    sendNotification,
    isConnected,
  };
};
