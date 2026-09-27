import ThemeToggle from '@/components/ThemeToggle';
import Brand from '@/components/Brand';
import Accessibility from '@/components/Accessibility';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Mail, Lock, User, Eye, EyeOff, ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TURMAS } from '@/constants/turmas';
import api from '@/lib/api';
import { setAuth } from '@/lib/auth';
import { toast } from 'sonner';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    turma: '',
    avatar_url: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;
      
      const response = await api.post(endpoint, payload);
      
      setAuth(response.data.access_token, response.data.user);
      toast.success(isLogin ? 'Login realizado com sucesso!' : 'Conta criada com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao processar solicitação';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="entry-page">
      <header className="entry-header"><Brand/><div className="entry-header-actions"><Accessibility/><ThemeToggle/></div></header>
      <main className="entry-grid">
        <section className="entry-story" aria-labelledby="entry-title"><p className="entry-kicker"><span/>LEITURA QUE ABRE CAMINHOS</p><h1 id="entry-title">Toda descoberta<br/>começa com<br/><em>uma página.</em></h1><p className="entry-intro">Um lugar para ler, compartilhar ideias e transformar conhecimento em novas possibilidades.</p><div className="entry-art" aria-hidden="true"><div className="entry-orbit"/><div className="entry-book"><div className="entry-book-spine"/><BookOpen strokeWidth={1}/><span>ETI<br/><strong>LEITURA</strong></span><small>CONHECIMENTO QUE TRANSFORMA</small></div><div className="entry-note"><span className="entry-note-icon"><GraduationCap size={20}/></span><div>Aprender é uma jornada.<small>Vamos juntos no próximo capítulo.</small></div></div><span className="entry-art-star">✦</span></div><p className="entry-audience">PARA ALUNOS E PROFESSORES. PARA NOVAS IDEIAS.</p></section>
        <section className="entry-form-side" aria-labelledby="entry-form-title"><div className="entry-card auth-form-wrap"><div className="entry-card-top"><span className="entry-card-icon"><BookOpen size={21}/></span><span>SEU ESPAÇO DE APRENDIZAGEM</span></div><h2 id="entry-form-title">{isLogin ? 'Bom ter você por aqui.' : 'Vamos começar?'}</h2><p className="entry-form-description">{isLogin ? 'Entre para continuar o seu próximo capítulo.' : 'Crie sua conta de aluno e comece a explorar.'}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <Label htmlFor="nome">Nome completo</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="nome"
                        autoComplete="name"
                        type="text"
                        placeholder="Seu nome"
                        className="pl-10"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        required={!isLogin}
                        data-testid="input-nome"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="turma">Turma *</Label>
                    <Select
                      value={formData.turma}
                      onValueChange={(value) => setFormData({ ...formData, turma: value })}
                      required
                    >
                      <SelectTrigger id="turma" className="mt-1" data-testid="input-turma">
                        <SelectValue placeholder="Selecione sua turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {TURMAS.map((turma) => (
                          <SelectItem key={turma.value} value={turma.value}>
                            {turma.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                </>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    autoComplete="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    data-testid="toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl mt-3"
                disabled={loading}
                data-testid="submit-button"
              >
                {loading ? 'Processando...' : isLogin ? 'Acessar plataforma' : 'Criar minha conta'}{!loading&&<ArrowRight size={18} aria-hidden="true"/>}
              </Button>
            </form>{isLogin&&<Link to="/forgot-password" className="block text-sm text-primary mt-4 text-center">Esqueci minha senha</Link>}

            <div className="entry-register">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                data-testid="toggle-auth-mode"
              >
                {isLogin ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
              </button>
            </div>
          <p className="entry-help"><GraduationCap size={16} aria-hidden="true"/>Professor? Use a conta fornecida pela escola.</p>
        </div><p className="entry-form-footer">Seu aprendizado, suas ideias, seu espaço.</p></section>
      </main><footer className="entry-footer"><span>ETI LEITURA</span><span>Ler. Descobrir. Transformar.</span></footer>
    </div>
  );
};

export default AuthPage;
