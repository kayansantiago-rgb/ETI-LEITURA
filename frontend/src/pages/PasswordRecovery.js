import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, MailCheck, KeyRound } from 'lucide-react';
import Brand from '@/components/Brand';
import ThemeToggle from '@/components/ThemeToggle';
import { Owl } from '@/components/LoginScene';
import api from '@/lib/api';
import { toast } from 'sonner';

const errorText = (e, fallback) => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : fallback);

function strength(password) {
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return password.length < 10 ? [0, 'Mínimo de 10 caracteres'] : [Math.min(4, score), ['Fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'][Math.min(4, score)]];
}

// Recuperar acesso: pedir o link (sem token) ou escolher a nova senha (com token).
export default function PasswordRecovery() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');

  const [level, label] = strength(password);
  const mismatch = token && confirm && confirm !== password;

  const submit = async e => {
    e.preventDefault();
    if (token && password !== confirm) return toast.error('As senhas não são iguais.');
    setBusy(true);
    try {
      const r = await api.post(token ? '/auth/reset-password' : '/auth/forgot-password', token ? { token, password } : { email });
      if (token) {
        toast.success('Senha atualizada! Entre com a nova senha.');
        navigate('/login');
      } else setSent(r.data.message || 'Se o e-mail estiver cadastrado, você receberá as instruções.');
    } catch (err) {
      toast.error(errorText(err, 'Não foi possível concluir. Tente novamente.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lg pr">
      <span className="lg-bg-orb is-a" aria-hidden="true" />
      <span className="lg-bg-orb is-b" aria-hidden="true" />
      <header className="lg-header">
        <Brand light />
        <div className="lg-header-actions">
          <ThemeToggle />
        </div>
      </header>
      <main className="pr-main">
        <section className="lg-card pr-card">
          <div className="lg-card-owl" aria-hidden="true">
            <Owl size={76} />
          </div>
          {sent ? (
            <div className="pr-done">
              <span className="pr-icon">
                <MailCheck size={26} />
              </span>
              <h1>Confira seu e-mail</h1>
              <p>{sent}</p>
              <p className="pr-note">Não chegou? Veja a caixa de spam ou peça à coordenação da escola um link de nova senha.</p>
              <Link to="/login" className="lg-submit">
                Voltar para entrar <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <span className="pr-icon">
                <KeyRound size={24} />
              </span>
              <h1>{token ? 'Crie uma nova senha' : 'Esqueceu a senha?'}</h1>
              <p className="lg-desc">{token ? 'Escolha uma senha forte. O link funciona uma única vez.' : 'Sem problema! Informe seu e-mail e enviaremos um link para criar uma nova senha.'}</p>
              <form onSubmit={submit} className="lg-form">
                {token ? (
                  <>
                    <label className="lg-field">
                      <span>Nova senha</span>
                      <span className="lg-input">
                        <Lock size={17} />
                        <input id="recovery-value" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={10} maxLength={72} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 10 caracteres" />
                        <button type="button" className="lg-eye" onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
                          {show ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </span>
                      {password && (
                        <span className={`pr-strength is-${level}`}>
                          <i />
                          <i />
                          <i />
                          <i />
                          <b>{label}</b>
                        </span>
                      )}
                    </label>
                    <label className="lg-field">
                      <span>Repita a nova senha</span>
                      <span className={`lg-input ${mismatch ? 'is-error' : ''}`}>
                        <Lock size={17} />
                        <input type={show ? 'text' : 'password'} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Digite de novo" />
                      </span>
                      {mismatch && <small className="pr-error">As senhas não são iguais.</small>}
                    </label>
                  </>
                ) : (
                  <label className="lg-field">
                    <span>E-mail da conta</span>
                    <span className="lg-input">
                      <Mail size={17} />
                      <input id="recovery-value" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                    </span>
                  </label>
                )}
                <button type="submit" className="lg-submit" disabled={busy || mismatch}>
                  {busy ? 'Aguarde…' : token ? 'Salvar nova senha' : 'Enviar link'} {!busy && <ArrowRight size={18} />}
                </button>
              </form>
              <Link className="pr-back" to="/login">
                <ArrowLeft size={15} /> Voltar para entrar
              </Link>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
