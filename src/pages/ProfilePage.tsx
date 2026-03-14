import { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { FiUser, FiMail, FiBook, FiEdit3, FiCheck, FiLogOut } from 'react-icons/fi';

export default function ProfilePage() {
    const { currentUser, updateProfile, logout, parches } = useStore();
    const [editing, setEditing] = useState(false);
    const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
    const [major, setMajor] = useState(currentUser?.major ?? '');

    if (!currentUser) return null;

    const userParches = parches.filter(p => p.members.some(m => m.userId === currentUser.id));

    const handleSave = () => {
        updateProfile({ fullName, major });
        setEditing(false);
    };

    const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="profile-page">
            <div className="profile-header">
                <div className="profile-avatar-large">
                    {currentUser.avatarUrl ? (
                        <img src={currentUser.avatarUrl} alt={currentUser.fullName} />
                    ) : (
                        <span>{initials}</span>
                    )}
                </div>
                {editing ? (
                    <div className="profile-edit-form">
                        <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre completo" className="profile-input" />
                        <input value={major} onChange={e => setMajor(e.target.value)} placeholder="Programa" className="profile-input" />
                        <button onClick={handleSave} className="btn-primary btn-sm"><FiCheck /> Guardar</button>
                    </div>
                ) : (
                    <>
                        <h1 className="profile-name">{currentUser.fullName}</h1>
                        <p className="profile-major"><FiBook /> {currentUser.major}</p>
                        <p className="profile-email"><FiMail /> {currentUser.email}</p>
                        <button onClick={() => setEditing(true)} className="btn-ghost btn-sm"><FiEdit3 /> Editar perfil</button>
                    </>
                )}
            </div>

            <div className="profile-section">
                <h2>Mis Parches ({userParches.length})</h2>
                <div className="parche-chips">
                    {userParches.map(p => {
                        const role = p.members.find(m => m.userId === currentUser.id)?.role;
                        return (
                            <div key={p.id} className="parche-chip">
                                <span className="parche-chip-name">{p.name}</span>
                                <span className={`role-badge role-${role?.toLowerCase()}`}>{role}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <button onClick={logout} className="btn-danger"><FiLogOut /> Cerrar sesión</button>
        </div>
    );
}
