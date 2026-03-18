import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { useToast } from '../components/ui/Toast';
import { apiLogin, apiRegister } from '../services/api';
import Spinner from '../components/ui/Spinner';
import { FiMail, FiLock, FiUser, FiBook, FiArrowRight } from 'react-icons/fi';

export default function AuthPage() {
    const store = useStore();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [major, setMajor] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (isLogin) {
            const result = await apiLogin(store, email, password);
            if (result.ok) {
                showToast('¡Bienvenido de vuelta!', 'success');
                navigate('/parches', { replace: true });
            } else {
                setError(result.error);
            }
        } else {
            if (!fullName || !email || !password || !major) {
                setError('Completa todos los campos');
                setLoading(false);
                return;
            }
            const result = await apiRegister(store, {
                fullName, email, password, major, avatarUrl: '',
            });
            if (result.ok) {
                showToast('¡Cuenta creada exitosamente!', 'success');
                navigate('/parches', { replace: true });
            } else {
                setError(result.error);
            }
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-shapes">
                <div className="shape shape-1" />
                <div className="shape shape-2" />
                <div className="shape shape-3" />
            </div>
            <div className="auth-card">
                <div className="auth-logo">
                    <span className="logo-icon">🎯</span>
                    <h1>ParchePlan U</h1>
                    <p className="auth-subtitle">University Group Plans</p>
                </div>

                <div className="auth-toggle" role="tablist">
                    <button
                        className={isLogin ? 'active' : ''}
                        onClick={() => { setIsLogin(true); setError(''); }}
                        role="tab"
                        aria-selected={isLogin}
                        aria-label="Cambiar a iniciar sesión"
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        className={!isLogin ? 'active' : ''}
                        onClick={() => { setIsLogin(false); setError(''); }}
                        role="tab"
                        aria-selected={!isLogin}
                        aria-label="Cambiar a registro"
                    >
                        Registrarse
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                    {!isLogin && (
                        <>
                            <div className="input-group">
                                <label htmlFor="auth-fullname" className="label-hidden">Nombre completo</label>
                                <FiUser className="input-icon" aria-hidden="true" />
                                <input
                                    id="auth-fullname"
                                    type="text"
                                    placeholder="Nombre completo"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    disabled={loading}
                                    autoComplete="name"
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="auth-major" className="label-hidden">Programa / Major</label>
                                <FiBook className="input-icon" aria-hidden="true" />
                                <input
                                    id="auth-major"
                                    type="text"
                                    placeholder="Programa / Major"
                                    value={major}
                                    onChange={e => setMajor(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </>
                    )}
                    <div className="input-group">
                        <label htmlFor="auth-email" className="label-hidden">Correo universitario</label>
                        <FiMail className="input-icon" aria-hidden="true" />
                        <input
                            id="auth-email"
                            type="email"
                            placeholder="Correo universitario"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            disabled={loading}
                            autoComplete="email"
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="auth-password" className="label-hidden">Contraseña</label>
                        <FiLock className="input-icon" aria-hidden="true" />
                        <input
                            id="auth-password"
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={loading}
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                        />
                    </div>
                    {error && <p className="auth-error" role="alert" aria-live="polite">{error}</p>}
                    <button
                        type="submit"
                        className={`btn-primary ${loading ? 'btn-loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <><Spinner size="sm" /> Cargando...</>
                        ) : (
                            <>{isLogin ? 'Entrar' : 'Crear cuenta'} <FiArrowRight /></>
                        )}
                    </button>
                </form>

                {isLogin && (
                    <div className="auth-hint">
                        <p>🧪 Demo: usa <strong>samm@eia.edu.co</strong> / <strong>1234</strong></p>
                    </div>
                )}
            </div>
        </div>
    );
}
