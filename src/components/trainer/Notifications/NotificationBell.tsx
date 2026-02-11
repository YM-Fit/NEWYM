import { useState, useEffect, useRef, useMemo } from 'react';
import { Bell, X, Calendar, ClipboardCheck, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} from '../../../hooks/queries/useNotificationQueries';

interface NotificationBellProps {
  onNavigateToTrainee?: (traineeId: string, tab?: string) => void;
}

export default function NotificationBell({ onNavigateToTrainee }: NotificationBellProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useNotificationsQuery(user?.id ?? null);
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();
  const deleteMutation = useDeleteNotificationMutation();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => notifications.filter((n: any) => !n.is_read).length, [notifications]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('trainer_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainer_notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleMarkAsRead = (notificationId: string) => {
    markReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    if (!user) return;
    markAllReadMutation.mutate(user.id);
  };

  const handleDeleteNotification = (notificationId: string) => {
    deleteMutation.mutate(notificationId);
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    if (notification.notification_type === 'food_diary_completed' && onNavigateToTrainee) {
      onNavigateToTrainee(notification.trainee_id, 'food_diary');
      setShowDropdown(false);
    } else if (
      (notification.notification_type === 'workout_plan_exercise_edited' ||
       notification.notification_type === 'workout_plan_exercise_added' ||
       notification.notification_type === 'workout_plan_exercise_removed') &&
      onNavigateToTrainee
    ) {
      onNavigateToTrainee(notification.trainee_id, 'workout-plans');
      setShowDropdown(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'food_diary_completed':
        return ClipboardCheck;
      case 'workout_completed':
        return Calendar;
      case 'workout_plan_exercise_edited':
      case 'workout_plan_exercise_added':
      case 'workout_plan_exercise_removed':
        return ClipboardCheck;
      default:
        return Bell;
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'food_diary_completed':
        return {
          iconColor: 'text-primary-600',
          bgColor: 'bg-gradient-to-br from-primary-100 to-primary-100',
          borderColor: 'border-primary-200'
        };
      case 'workout_completed':
        return {
          iconColor: 'text-blue-600',
          bgColor: 'bg-gradient-to-br from-blue-100 to-blue-100',
          borderColor: 'border-blue-200'
        };
      case 'workout_plan_exercise_edited':
      case 'workout_plan_exercise_added':
      case 'workout_plan_exercise_removed':
        return {
          iconColor: 'text-blue-600',
          bgColor: 'bg-gradient-to-br from-blue-100 to-blue-100',
          borderColor: 'border-blue-200'
        };
      default:
        return {
          iconColor: 'text-muted600',
          bgColor: 'bg-gradient-to-br from-gray-100 to-slate-100',
          borderColor: 'border-border200'
        };
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'לפני רגע';
    if (diffInSeconds < 3600) return `לפני ${Math.floor(diffInSeconds / 60)} דקות`;
    if (diffInSeconds < 86400) return `לפני ${Math.floor(diffInSeconds / 3600)} שעות`;
    if (diffInSeconds < 604800) return `לפני ${Math.floor(diffInSeconds / 86400)} ימים`;
    return notificationDate.toLocaleDateString('he-IL');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2.5 hover:bg-surface100 rounded-xl transition-all duration-300 hover:scale-105 group"
        aria-label={
          unreadCount > 0
            ? `יש ${unreadCount > 9 ? 'יותר מתשע' : unreadCount} התראות שלא נקראו, פתח התראות`
            : 'פתח התראות'
        }
        aria-haspopup="true"
        aria-expanded={showDropdown}
      >
        <Bell className="w-6 h-6 text-muted700 group-hover:text-primary-600 transition-colors duration-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute left-0 mt-3 w-[400px] bg-white rounded-2xl shadow-2xl border border-border200 z-50 max-h-[600px] flex flex-col overflow-hidden backdrop-blur-sm"
          role="dialog"
          aria-label="רשימת התראות"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-br from-primary-600 via-primary-700 to-blue-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg text-white">התראות</h3>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-white/90 hover:text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all duration-300 flex items-center gap-1.5 font-medium"
              >
                <Check className="w-4 h-4" />
                סמן הכל
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 bg-gradient-to-b from-gray-50 to-white">
            {notifications.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-muted400" />
                </div>
                <p className="text-muted500 font-medium">אין התראות חדשות</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {notifications.map((notification) => {
                  const NotificationIcon = getNotificationIcon(notification.notification_type);
                  const style = getNotificationStyle(notification.notification_type);

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-xl transition-all duration-300 hover:shadow-lg cursor-pointer border ${
                        !notification.is_read
                          ? 'bg-gradient-to-br from-primary-50/80 to-primary-50/80 border-primary-200 shadow-md'
                          : 'bg-white border-border100 hover:bg-surface50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl ${style.bgColor} flex-shrink-0`}>
                          <NotificationIcon className={`w-5 h-5 ${style.iconColor}`} />
                        </div>
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => handleNotificationClick(notification)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleNotificationClick(notification);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-muted900">{notification.title}</h4>
                            {!notification.is_read && (
                              <span className="w-2.5 h-2.5 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full animate-pulse shadow-sm"></span>
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-sm text-muted600 mb-2 line-clamp-2">{notification.message}</p>
                          )}
                          <p className="text-xs text-muted400 font-medium">{getTimeAgo(notification.created_at)}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="text-muted400 hover:text-red-500 transition-all duration-300 p-1.5 hover:bg-red-50 rounded-lg flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
