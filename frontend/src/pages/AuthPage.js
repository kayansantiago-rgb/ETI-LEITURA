import ThemeToggle from '@/components/ThemeToggle';
import Brand from '@/components/Brand';
import Accessibility from '@/components/Accessibility';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, GraduationCap, Sparkles, Library, Trophy } from 'lucide-react';
import LoginScene, { Owl } from '@/components/LoginScene';
import { TURMAS } from '@/constants/turmas';
import api from '@/lib/api';
import { setAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { showWelcome } from '@/components/WelcomeToast';
import GoogleSignIn from '@/components/GoogleSignIn';

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
    avatar_url: '',
    aceite_termos: false
  });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email: formData.email, password: formData.password } : formData;
      const response = await api.post(endpoint, payload);
      setAuth(response.data.access_token, response.data.user);
      showWelcome(response.data.user, !isLogin);
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao processar solicitação';
      toast.error(typeof message === 'string' ? message : 'Confira os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const finish = (data, created) => {
    setAuth(data.access_token, data.user);
    showWelcome(data.user, created);
    navigate('/dashboard');
  };

  const switchMode = login => {
    setIsLogin(login);
    setShowPassword(false);
  };

  return (
    <div className={`lg ${isLogin ? "" : "is-register"}`}>
      <span className="lg-bg-orb is-a" aria-hidden="true" />
      <span className="lg-bg-orb is-b" aria-hidden="true" />
      <header className="lg-header">
        <Brand light />
        <div className="lg-header-actions">
          <Accessibility />
          <ThemeToggle />
        </div>
      </header>

      <main className="lg-grid">
        <section className="lg-story" aria-labelledby="entry-title">
          <p className="lg-kicker">
            <Sparkles size={14} /> Plataforma de leitura da escola
          </p>
          <h1 id="entry-title">
            Toda história começa com <em>uma página.</em>
          </h1>
          <p className="lg-intro">Leia os livros da biblioteca, responda atividades e quizzes, suba no ranking da turma e conquiste certificados de leitura.</p>
          <ul className="lg-features">
            <li>
              <Library size={15} /> Biblioteca digital
            </li>
            <li>
              <Sparkles size={15} /> Quizzes e ranking
            </li>
            <li>
              <Trophy size={15} /> Certificados
            </li>
          </ul>
          <LoginScene />
        </section>

        <section className="lg-form-side" aria-labelledby="entry-form-title">
          <div className="lg-card auth-form-wrap">
            <div className="lg-card-owl" aria-hidden="true">
              <Owl size={76} />
            </div>
            <div className="lg-tabs" role="tablist" aria-label="Entrar ou criar conta">
              <button type="button" role="tab" aria-selected={isLogin} onClick={() => switchMode(true)}>
                Entrar
              </button>
              <button type="button" role="tab" aria-selected={!isLogin} onClick={() => switchMode(false)}>
                Criar conta
              </button>
            </div>
            <h2 id="entry-form-title">{isLogin ? 'Bom ter você por aqui!' : 'Vamos começar?'}</h2>
            <p className="lg-desc">{isLogin ? 'Entre para continuar o seu próximo capítulo.' : 'Crie sua conta de aluno e comece a explorar a biblioteca.'}</p>

            <form onSubmit={handleSubmit} className="lg-form">
              {!isLogin && (
                <>
                  <label className="lg-field">
                    <span>Nome completo</span>
                    <span className="lg-input">
                      <User size={17} />
                      <input
                        id="nome"
                        autoComplete="name"
                        type="text"
                        placeholder="Seu nome"
                        value={formData.nome}
                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                        required
                        data-testid="input-nome"
                      />
                    </span>
                  </label>
                  <label className="lg-field">
                    <span>Turma</span>
                    <span className="lg-input">
                      <GraduationCap size={17} />
                      <select
                        id="turma"
                        name="turma"
                        data-testid="input-turma"
                        value={formData.turma}
                        onChange={event => {
                          const turma = event.target.value;
                          setFormData(current => ({ ...current, turma }));
                        }}
                        required
                      >
                        <option value="" disabled>
                          Selecione sua turma
                        </option>
                        {TURMAS.map(turma => (
                          <option key={turma.value} value={turma.value}>
                            {turma.label}
                          </option>
                        ))}
                      </select>
                    </span>
                  </label>
                </>
              )}

              <label className="lg-field">
                <span>E-mail</span>
                <span className="lg-input">
                  <Mail size={17} />
                  <input
                    id="email"
                    autoComplete="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </span>
              </label>

              <label className="lg-field">
                <span>Senha</span>
                <span className="lg-input">
                  <Lock size={17} />
                  <input
                    id="password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="lg-eye"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    data-testid="toggle-password"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              {!isLogin && (
                <label className="lg-terms">
                  <input
                    type="checkbox"
                    required
                    checked={formData.aceite_termos}
                    onChange={e => setFormData(current => ({ ...current, aceite_termos: e.target.checked }))}
                    data-testid="input-terms"
                  />
                  <span>
                    Li e aceito os{' '}
                    <a href="/privacidade" target="_blank" rel="noreferrer">
                      termos de uso e a política de privacidade
                    </a>
                    .
                  </span>
                </label>
              )}

              {isLogin && (
                <Link to="/forgot-password" className="lg-forgot">
                  Esqueci minha senha
                </Link>
              )}

              <button type="submit" className="lg-submit" disabled={loading} data-testid="submit-button">
                {loading ? 'Processando…' : isLogin ? 'Acessar plataforma' : 'Criar minha conta'}
                {!loading && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </form>

            <GoogleSignIn onDone={finish} />

            <button type="button" onClick={() => switchMode(!isLogin)} className="lg-switch" data-testid="toggle-auth-mode">
              {isLogin ? (
                <>
                  Ainda não tem conta? <b>Criar conta de aluno</b>
                </>
              ) : (
                <>
                  Já tem conta? <b>Entrar</b>
                </>
              )}
            </button>
            <p className="lg-help">
              <GraduationCap size={15} aria-hidden="true" /> Professor? Use a conta fornecida pela escola.
            </p>
          </div>
        </section>
      </main>
      <footer className="lg-footer">
        <span>ETI LEITURA</span>
        <span>Ler, imaginar, transformar.</span>
      </footer>
    </div>
  );
};

export default AuthPage;
