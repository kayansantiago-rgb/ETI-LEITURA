import PageIntro from '@/components/PageIntro';
import EmptyCollection from '@/components/EmptyCollection';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Plus, Trash2, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = [
  { value: '#10b981', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#f59e0b', label: 'Amarelo' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
];

const AdminCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data: '',
    cor: '#10b981'
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days from previous month
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      const mes = currentDate.getMonth() + 1;
      const ano = currentDate.getFullYear();
      const response = await api.get(`/calendar?mes=${mes}&ano=${ano}`);
      setEvents(response.data);
    } catch (error) {
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.data) {
      toast.error('Preencha o título e a data');
      return;
    }

    try {
      if (editingEvent) {
        await api.put(`/admin/calendar/${editingEvent.id}`, formData);
        toast.success('Evento atualizado!');
      } else {
        await api.post('/admin/calendar', formData);
        toast.success('Evento criado!');
      }
      
      setDialogOpen(false);
      setEditingEvent(null);
      setFormData({ titulo: '', descricao: '', data: '', cor: '#10b981' });
      loadEvents();
    } catch (error) {
      toast.error('Erro ao salvar evento');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      titulo: event.titulo,
      descricao: event.descricao || '',
      data: event.data,
      cor: event.cor
    });
    setDialogOpen(true);
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Deseja excluir este evento?')) return;
    
    try {
      await api.delete(`/admin/calendar/${eventId}`);
      toast.success('Evento excluído!');
      loadEvents();
    } catch (error) {
      toast.error('Erro ao excluir evento');
    }
  };

  const handleDayClick = (date) => {
    setFormData({
      titulo: '',
      descricao: '',
      data: format(date, 'yyyy-MM-dd'),
      cor: '#10b981'
    });
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const getEventsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => e.data === dateStr);
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="admin-calendar-page">
        {/* Header */}
        <div className="inner-toolbar-heading">
          <PageIntro section="PLANEJAMENTO / AGENDA" title="Calendário de Eventos" description="Organize os encontros e as próximas experiências de leitura."/>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingEvent(null);
              setFormData({ titulo: '', descricao: '', data: '', cor: '#10b981' });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-lg" data-testid="new-event-button">
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? 'Editar Evento' : 'Novo Evento'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="titulo">Título do Tema</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ex: Apresentação do livro Dom Casmurro"
                    required
                    data-testid="input-event-titulo"
                  />
                </div>
                
                <div>
                  <Label htmlFor="descricao">Descrição (opcional)</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Detalhes sobre o evento..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                    data-testid="input-event-data"
                  />
                </div>
                
                <div>
                  <Label>Cor do evento</Label>
                  <div className="flex gap-2 mt-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, cor: color.value })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          formData.cor === color.value ? 'ring-2 ring-offset-2 ring-stone-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 rounded-lg">
                    {editingEvent ? 'Atualizar' : 'Criar Evento'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="rounded-lg"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-2xl font-semibold text-foreground capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-stone-100 rounded-xl shadow-sm overflow-hidden"
        >
          {/* Week Days Header */}
          <div className="grid grid-cols-7 bg-muted/50">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-3 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {/* Padding days */}
            {paddingDays.map((_, index) => (
              <div
                key={`padding-${index}`}
                className="min-h-[100px] p-2 border-t border-r border-stone-100 bg-muted/20"
              />
            ))}
            
            {/* Actual days */}
            {daysInMonth.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={day.toString()}
                  className={`min-h-[100px] p-2 border-t border-r border-stone-100 cursor-pointer hover:bg-muted/30 transition-colors ${
                    isToday ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="group relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className="text-xs p-1 rounded truncate text-white cursor-pointer"
                          style={{ backgroundColor: event.cor }}
                          onClick={() => handleEdit(event)}
                        >
                          {event.titulo}
                        </div>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full items-center justify-center hidden group-hover:flex"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Events List */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Eventos deste mês</h3>
          {events.length === 0 ? (
            <p className="text-muted-foreground">Nenhum evento programado para este mês.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-lg"
                        style={{ backgroundColor: event.cor }}
                      />
                      <span className="text-sm font-medium text-muted-foreground">
                        {format(new Date(event.data + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(event)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(event.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <h4 className="font-semibold mt-2">{event.titulo}</h4>
                  {event.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{event.descricao}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminCalendar;
