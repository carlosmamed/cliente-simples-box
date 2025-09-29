import { useEffect, useState } from 'react';
import { Plus, Calendar, Clock, CheckCircle2, Circle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const reminderSchema = z.object({
  title: z.string().trim().min(3, { message: "Título deve ter pelo menos 3 caracteres" }),
  description: z.string().trim().optional(),
  customer_id: z.string().uuid({ message: "Selecione um cliente válido" }),
  reminder_date: z.string().min(1, { message: "Selecione uma data" })
});

interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminder_date: string;
  completed: boolean;
  customer_id: string;
  customers: { name: string };
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: '',
    reminder_date: ''
  });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select(`
          *,
          customers (name)
        `)
        .eq('user_id', user?.id)
        .order('reminder_date', { ascending: true });

      if (remindersError) throw remindersError;

      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('name');

      if (customersError) throw customersError;

      setReminders(remindersData || []);
      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = reminderSchema.parse(formData);
      setSaving(true);

      const reminderData = {
        title: validatedData.title,
        customer_id: validatedData.customer_id,
        reminder_date: validatedData.reminder_date,
        description: validatedData.description || null,
        user_id: user?.id
      };

      if (editingReminder) {
        const { error } = await supabase
          .from('reminders')
          .update(reminderData)
          .eq('id', editingReminder.id);

        if (error) throw error;

        toast({
          title: "Lembrete atualizado!",
          description: "O lembrete foi atualizado com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('reminders')
          .insert([reminderData]);

        if (error) throw error;

        toast({
          title: "Lembrete criado!",
          description: "O lembrete foi criado com sucesso."
        });
      }

      setShowForm(false);
      setEditingReminder(null);
      setFormData({ title: '', description: '', customer_id: '', reminder_date: '' });
      loadData();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Dados inválidos",
          description: error.errors[0].message
        });
      } else {
        console.error('Error saving reminder:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível salvar o lembrete"
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (reminder: Reminder) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ completed: !reminder.completed })
        .eq('id', reminder.id);

      if (error) throw error;

      toast({
        title: reminder.completed ? "Lembrete reaberto" : "Lembrete concluído!",
        description: reminder.completed 
          ? "O lembrete foi marcado como pendente novamente." 
          : "Parabéns! Você concluiu este lembrete."
      });

      loadData();
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o lembrete"
      });
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      customer_id: reminder.customer_id,
      reminder_date: new Date(reminder.reminder_date).toISOString().slice(0, 16)
    });
    setShowForm(true);
  };

  const handleDelete = async (reminder: Reminder) => {
    if (!confirm(`Tem certeza que deseja excluir o lembrete "${reminder.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminder.id);

      if (error) throw error;

      toast({
        title: "Lembrete removido",
        description: "O lembrete foi excluído com sucesso."
      });

      loadData();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o lembrete"
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    const formattedDate = date.toLocaleDateString('pt-BR');
    const formattedTime = date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (diffInDays === 0) return `Hoje às ${formattedTime}`;
    if (diffInDays === 1) return `Amanhã às ${formattedTime}`;
    if (diffInDays === -1) return `Ontem às ${formattedTime}`;
    if (diffInDays < 0) return `${formattedDate} (${Math.abs(diffInDays)} dias atrás)`;
    
    return `${formattedDate} às ${formattedTime}`;
  };

  const getDateStatus = (dateString: string, completed: boolean) => {
    if (completed) return 'completed';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) return 'overdue';
    if (diffInDays === 0) return 'today';
    if (diffInDays <= 3) return 'soon';
    return 'upcoming';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-success/10 text-success border-success/20',
      overdue: 'bg-destructive/10 text-destructive border-destructive/20',
      today: 'bg-warning/10 text-warning border-warning/20',
      soon: 'bg-blue-100 text-blue-800 border-blue-200',
      upcoming: 'bg-muted text-muted-foreground border-border'
    };
    return colors[status as keyof typeof colors] || colors.upcoming;
  };

  const filteredReminders = reminders.filter(reminder => {
    if (filter === 'pending') return !reminder.completed;
    if (filter === 'completed') return reminder.completed;
    return true;
  });

  const getMinDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lembretes</h1>
          <p className="text-muted-foreground">
            Gerencie seus compromissos e follow-ups
          </p>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button 
              className="gap-2"
              onClick={() => {
                setEditingReminder(null);
                setFormData({ title: '', description: '', customer_id: '', reminder_date: '' });
              }}
            >
              <Plus className="h-4 w-4" />
              Novo Lembrete
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingReminder ? 'Editar Lembrete' : 'Novo Lembrete'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Ligar para fazer orçamento"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customer">Cliente *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, customer_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reminder_date">Data e Hora *</Label>
                <Input
                  id="reminder_date"
                  type="datetime-local"
                  value={formData.reminder_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminder_date: e.target.value }))}
                  min={getMinDateTime()}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhes adicionais sobre o lembrete..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? 'Salvando...' : editingReminder ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos ({reminders.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pendentes ({reminders.filter(r => !r.completed).length})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Concluídos ({reminders.filter(r => r.completed).length})
        </Button>
      </div>

      {/* Reminders List */}
      <div className="grid gap-4">
        {filteredReminders.length > 0 ? (
          filteredReminders.map((reminder) => {
            const status = getDateStatus(reminder.reminder_date, reminder.completed);
            
            return (
              <Card key={reminder.id} className={`hover:shadow-medium transition-shadow ${
                status === 'overdue' ? 'border-destructive/50' : 
                status === 'today' ? 'border-warning/50' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 p-0 h-auto hover:bg-transparent"
                      onClick={() => handleToggleComplete(reminder)}
                    >
                      {reminder.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                      )}
                    </Button>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className={`font-semibold ${reminder.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {reminder.title}
                          </h3>
                          <p className="text-sm text-primary font-medium">
                            {reminder.customers.name}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(status)}>
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(reminder.reminder_date)}
                          </Badge>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(reminder)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(reminder)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {reminder.description && (
                        <p className={`text-sm ${reminder.completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {reminder.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {filter === 'pending' ? 'Nenhum lembrete pendente' :
                 filter === 'completed' ? 'Nenhum lembrete concluído' :
                 'Nenhum lembrete criado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all' 
                  ? 'Crie seu primeiro lembrete para não esquecer de contatar seus clientes'
                  : 'Altere o filtro ou crie novos lembretes'
                }
              </p>
              {filter === 'all' && customers.length > 0 && (
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Lembrete
                </Button>
              )}
              {customers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Você precisa ter pelo menos um cliente cadastrado para criar lembretes.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}