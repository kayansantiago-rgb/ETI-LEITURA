import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
export default function ReadingCalendar() {
 const [currentCalendarDate,setCurrentCalendarDate]=useState(new Date());
 const [calendarEvents,setCalendarEvents]=useState([]);
 const [error,setError]=useState(false);
 useEffect(()=>{ let active=true; setError(false);setCalendarEvents([]);api.get('/calendar',{params:{mes:currentCalendarDate.getMonth()+1,ano:currentCalendarDate.getFullYear()}}).then(r=>{if(active)setCalendarEvents(r.data)}).catch(()=>{if(active)setError(true)});return()=>{active=false};},[currentCalendarDate]);
 const getEventsForDay=date=>calendarEvents.filter(e=>e.data===format(date,'yyyy-MM-dd'));
 return <div>            {/* Mini Calendar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="panel"
              data-testid="mini-calendar"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Agenda</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label="Mês anterior"
                    onClick={() => setCurrentCalendarDate(subMonths(currentCalendarDate, 1))}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-medium min-w-[70px] text-center capitalize">
                    {format(currentCalendarDate, 'MMM yyyy', { locale: ptBR })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label="Próximo mês"
                    onClick={() => setCurrentCalendarDate(addMonths(currentCalendarDate, 1))}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Mini Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                  <div key={i} className="text-[10px] font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
                {Array(startOfMonth(currentCalendarDate).getDay()).fill(null).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}
                {eachDayOfInterval({
                  start: startOfMonth(currentCalendarDate),
                  end: endOfMonth(currentCalendarDate)
                }).map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const hasEvents = dayEvents.length > 0;
                  
                  return (
                    <div
                      key={day.toString()}
                      className={`aspect-square flex items-center justify-center text-[10px] rounded relative
                        ${isToday ? 'bg-primary text-white font-bold' : ''}
                        ${hasEvents && !isToday ? 'bg-primary/10 font-medium' : ''}
                      `}
                    >
                      {format(day, 'd')}
                      {hasEvents && (
                        <div 
                          className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isToday ? 'bg-white' : ''}`}
                          style={{ backgroundColor: isToday ? undefined : dayEvents[0].cor }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Next Events Preview */}
              {calendarEvents.length > 0 && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {calendarEvents.slice(0, 2).map((event) => (
                    <div key={event.id} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.cor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{event.titulo}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(event.data + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {calendarEvents.length > 2 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      +{calendarEvents.length - 2} mais eventos
                    </p>
                  )}
                </div>
              )}
            </motion.div><p className="text-xs text-muted-foreground mt-3 px-2" role="status">{error ? 'Não foi possível carregar a agenda.' : calendarEvents.length === 0 ? 'Nenhum evento neste mês.' : ''}</p></div>;
}
