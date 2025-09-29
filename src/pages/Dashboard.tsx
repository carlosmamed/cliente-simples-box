import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Users, Bell, TrendingUp, Calendar, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  pendingReminders: number;
  recentInteractions: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    newCustomersThisMonth: 0,
    pendingReminders: 0,
    recentInteractions: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

  const loadDashboardStats = async () => {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Get customers created this month
      const { count: newCustomersThisMonth } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', firstDayOfMonth.toISOString());

      // Get pending reminders
      const { count: pendingReminders } = await supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('completed', false)
        .lte('reminder_date', now.toISOString());

      // Get recent interactions
      const { data: recentInteractions } = await supabase
        .from('customer_interactions')
        .select(`
          *,
          customers (name)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalCustomers: totalCustomers || 0,
        newCustomersThisMonth: newCustomersThisMonth || 0,
        pendingReminders: pendingReminders || 0,
        recentInteractions: recentInteractions || []
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInteractionTypeColor = (type: string) => {
    const colors = {
      call: 'bg-blue-100 text-blue-800',
      email: 'bg-purple-100 text-purple-800',
      meeting: 'bg-green-100 text-green-800',
      quote: 'bg-yellow-100 text-yellow-800',
      service: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  const getInteractionTypeLabel = (type: string) => {
    const labels = {
      call: 'Ligação',
      email: 'Email',
      meeting: 'Reunião',
      quote: 'Orçamento',
      service: 'Atendimento',
      other: 'Outro'
    };
    return labels[type as keyof typeof labels] || 'Outro';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do seu negócio
          </p>
        </div>
        <Button onClick={() => navigate('/customers')} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCustomers >= 20 ? 'Limite do plano gratuito atingido' : `${20 - stats.totalCustomers} restantes no plano gratuito`}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Este Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.newCustomersThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newCustomersThisMonth} clientes adicionados
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lembretes Pendentes</CardTitle>
            <Bell className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pendingReminders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingReminders > 0 ? 'Requer atenção' : 'Tudo em dia!'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interações Recentes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentInteractions.length}</div>
            <p className="text-xs text-muted-foreground">
              Nos últimos registros
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Interactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Atividades Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
              Ver todas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentInteractions.length > 0 ? (
              stats.recentInteractions.map((interaction) => (
                <div key={interaction.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={getInteractionTypeColor(interaction.type)}>
                        {getInteractionTypeLabel(interaction.type)}
                      </Badge>
                      <span className="font-medium">{interaction.customers?.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {interaction.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(interaction.interaction_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma atividade recente</p>
                <p className="text-sm">Comece adicionando um cliente!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate('/customers')}
            >
              <Plus className="h-4 w-4" />
              Adicionar Novo Cliente
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate('/reminders')}
            >
              <Bell className="h-4 w-4" />
              Criar Lembrete
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate('/customers')}
            >
              <Users className="h-4 w-4" />
              Ver Todos os Clientes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Banner */}
      {stats.totalCustomers >= 15 && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-warning-foreground">
                  Você está próximo do limite!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade para Pro e tenha clientes ilimitados, relatórios e muito mais.
                </p>
              </div>
              <Button variant="default">
                Upgrade Pro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}