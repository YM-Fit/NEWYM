import { memo, useMemo } from 'react';
import { Mail, Phone, User, Link2, Clock, CheckCircle2, CheckSquare, Square } from 'lucide-react';
import type { CalendarClient } from '../../../../api/crmClientsApi';
import { format, isValid, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

interface ClientCardProps {
  client: CalendarClient;
  trainees: any[];
  onLinkTrainee: (traineeId: string) => void;
  onClick?: () => void;
  isLinking?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function ClientCard({ client, trainees, onLinkTrainee, onClick, isLinking, isSelected, onToggleSelect }: ClientCardProps) {
  const linkedTrainee = useMemo(() => {
    return client.trainee_id 
      ? trainees.find(t => t.id === client.trainee_id) || null
      : null;
  }, [client.trainee_id, trainees]);

  const formatDate = useMemo(() => {
    return (dateStr?: string) => {
      if (!dateStr) return 'לא צוין';
      try {
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
        if (isValid(date)) {
          return format(date, 'dd/MM/yyyy', { locale: he });
        }
        return 'לא צוין';
      } catch {
        return 'לא צוין';
      }
    };
  }, []);

  const unlinkedTrainees = useMemo(() => {
    return trainees.filter(t => !t.google_calendar_client_id);
  }, [trainees]);

  return (
    <article
      data-client-id={client.id}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`פרטי לקוח: ${client.client_name}${linkedTrainee ? `, מקושר למתאמן: ${linkedTrainee.full_name}` : ', לא מקושר'}`}
      className="premium-card p-6 cursor-pointer hover:scale-[1.02] transition-all space-y-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        {/* Selection Checkbox */}
        {onToggleSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className="mt-1 p-1 text-zinc-400 hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
            aria-label={isSelected ? 'בטל בחירה' : 'בחר לקוח'}
            aria-checked={isSelected}
            role="checkbox"
          >
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-emerald-400" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </button>
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <User className="h-6 w-6 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{client.client_name}</h3>
            {linkedTrainee ? (
              <div className="flex items-center gap-2 mt-1">
                <Link2 className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                <span className="text-xs text-emerald-400 truncate" aria-label={`מקושר למתאמן: ${linkedTrainee.full_name}`}>
                  {linkedTrainee.full_name}
                </span>
              </div>
            ) : (
              <span className="text-xs text-yellow-400">לא מקושר</span>
            )}
          </div>
        </div>
        {client.trainee_id && (
          <div 
            className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" 
            aria-label="מקושר למתאמן"
            role="status"
          />
        )}
      </div>

      {/* Contact Info */}
      {(client.client_email || client.client_phone) && (
        <div className="space-y-2">
          {client.client_email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <a 
                href={`mailto:${client.client_email}`}
                className="text-zinc-300 truncate hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                aria-label={`שלח אימייל ל-${client.client_email}`}
                onClick={(e) => e.stopPropagation()}
              >
                {client.client_email}
              </a>
            </div>
          )}
          {client.client_phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <a 
                href={`tel:${client.client_phone}`}
                className="text-zinc-300 hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                aria-label={`התקשר ל-${client.client_phone}`}
                onClick={(e) => e.stopPropagation()}
              >
                {client.client_phone}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{client.total_events_count}</div>
          <div className="text-xs text-zinc-400">סה"כ אירועים</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-400">{client.upcoming_events_count}</div>
          <div className="text-xs text-zinc-400">קרובים</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">{client.completed_events_count}</div>
          <div className="text-xs text-zinc-400">הושלמו</div>
        </div>
      </div>

      {/* Dates */}
      {(client.first_event_date || client.last_event_date) && (
        <div className="space-y-1 text-sm">
          {client.first_event_date && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">אירוע ראשון:</span>
              <span className="text-zinc-300">{formatDate(client.first_event_date)}</span>
            </div>
          )}
          {client.last_event_date && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">אירוע אחרון:</span>
              <span className="text-zinc-300">{formatDate(client.last_event_date)}</span>
            </div>
          )}
        </div>
      )}

      {/* Link Trainee Button */}
      {!client.trainee_id && unlinkedTrainees.length > 0 && (
        <div className="pt-3 border-t border-zinc-800">
          <div className="relative">
            <select
              onChange={(e) => {
                e.stopPropagation();
                if (e.target.value) {
                  onLinkTrainee(e.target.value);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              disabled={isLinking}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              defaultValue=""
              aria-label={`קשר את הלקוח ${client.client_name} למתאמן`}
            >
              <option value="">קשר למתאמן...</option>
              {unlinkedTrainees.map(trainee => (
                <option key={trainee.id} value={trainee.id}>
                  {trainee.full_name}
                </option>
              ))}
            </select>
            {isLinking && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2" aria-label="מקשר למתאמן" role="status" aria-live="polite">
                <Clock className="h-4 w-4 animate-spin text-emerald-400" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Link indicator */}
      {client.trainee_id && (
        <div className="pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span aria-label="לקוח מקושר למתאמן">מקושר למתאמן</span>
          </div>
        </div>
      )}
    </article>
  );
}

export default memo(ClientCard);
