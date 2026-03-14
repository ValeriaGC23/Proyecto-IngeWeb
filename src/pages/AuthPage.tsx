
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { FiMail, FiLock, FiUser, FiBook, FiArrowRight } from 'react-icons/fi';

export default function AuthPage() {
    const { login, register } = useStore();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [major, setMajor] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (isLogin) {
            if (login(email, password)) {
                navigate('/parches', { replace: true });
            } else {
                setError('Credenciales incorrectas');
            }
        } else {
            if (!fullName || !email || !password || !major) { setError('Completa todos los campos'); return; }
            if (register({ fullName, email, password, major, avatarUrl: '' })) {
                navigate('/parches', { replace: true });
            } else {
                setError('El correo ya está registrado');
            }
        }
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

                <div className="auth-toggle">
                    <button className={isLogin ? 'active' : ''} onClick={() => { setIsLogin(true); setError(''); }}>Iniciar Sesión</button>
                    <button className={!isLogin ? 'active' : ''} onClick={() => { setIsLogin(false); setError(''); }}>Registrarse</button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <>
                            <div className="input-group">
                                <FiUser className="input-icon" />
                                <input type="text" placeholder="Nombre completo" value={fullName} onChange={e => setFullName(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <FiBook className="input-icon" />
                                <input type="text" placeholder="Programa / Major" value={major} onChange={e => setMajor(e.target.value)} />
                            </div>
                        </>
                    )}
                    <div className="input-group">
                        <FiMail className="input-icon" />
                        <input type="email" placeholder="Correo universitario" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <FiLock className="input-icon" />
                        <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    {error && <p className="auth-error">{error}</p>}
                    <button type="submit" className="btn-primary">
                        {isLogin ? 'Entrar' : 'Crear cuenta'}
                        <FiArrowRight />
                    </button>
                </form>

                {isLogin && (
                    <div className="auth-hint">
                        <p>🧪 Demo: usa <strong>cmendez@uniandes.edu.co</strong> / <strong>1234</strong></p>
                    </div>
                )}
            </div>
        </div>
    );
}
